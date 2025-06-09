// src/components/ChoreManager/ChoreManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Progress,
  Spinner,
  Text,
  VStack,
  useDisclosure,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { vertexAI, database } from "../../firebaseResources/config";
import { choreSet } from "./ChoreManager.data";
import { getGenerativeModel, Schema } from "@firebase/vertexai";

/* ---------- constants ---------- */

const FREQ_ORDER = [
  "daily",
  "multiple_times_a_week",
  "weekly",
  "biweekly_to_monthly",
  "quarterly_to_semi_annually",
  "annual_or_as_needed",
];
const pretty = (s) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------- Gemini model ---------- */

const responseSchema = Schema.object({
  properties: {
    selections: Schema.object({
      properties: FREQ_ORDER.reduce(
        (a, k) => ({ ...a, [k]: Schema.string() }),
        {}
      ),
      required: FREQ_ORDER,
    }),
    summary: Schema.string(),
  },
  required: ["selections", "summary"],
});

const choreModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json", responseSchema },
});

/* ---------- helpers ---------- */

const buildPrompt = (historyDocs) => {
  const recent = new Set();
  historyDocs
    .slice(0, 5)
    .forEach((d) =>
      Object.values(d.selections || {}).forEach((c) => recent.add(c))
    );

  const avoid =
    recent.size > 0
      ? `Avoid repeating these if possible:\n- ${[...recent].join("\n- ")}\n\n`
      : "";

  const options = FREQ_ORDER.map(
    (k) => `**${pretty(k)}**\n- ${choreSet[k].join("\n- ")}`
  ).join("\n\n");

  return `Select ONE chore per bucket.\n${avoid}
  
  Include a "summary" that is a brief uplifting sentence (≤ 140 characters) about today's list. No emojis.

  Return JSON only.\n\n${options}`;
};

const fetchListFromGemini = async (historyDocs, maxTries = 3) => {
  for (let i = 0; i < maxTries; i++) {
    const prompt = buildPrompt(historyDocs);
    const stream = await choreModel.generateContentStream(prompt);
    let raw = "";
    for await (const chunk of stream.stream) raw += chunk.text();
    const ai = JSON.parse(raw);

    // uniqueness check vs. very last set
    const last = historyDocs[0];
    if (
      !last ||
      JSON.stringify(last.selections) !== JSON.stringify(ai.selections)
    )
      return ai;
  }
  // return null; // fallback — duplicates, but avoid infinite loop
};

/* ---------- animated pill ---------- */

export const MotionBubble = ({ children, done }) => {
  /* pick a friendly green that works in either mode */
  // light-mode values first, dark-mode values second
  const bgDone = useColorModeValue("#9AE6B4", "#2F855A"); // green.200  / green.600
  const textDone = useColorModeValue("#1C4532", "#F0FFF4"); // green.900  / green.50

  return (
    <motion.span
      initial={false}
      animate={
        done
          ? {
              scale: 1.06,
              backgroundColor: bgDone,
              borderRadius: 14,
              padding: "4px 10px",
              marginLeft: 6,
            }
          : {
              scale: 1,
              backgroundColor: "rgba(0,0,0,0)",
              borderRadius: 0,
              padding: 0,
              marginLeft: 0,
            }
      }
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      style={{ display: "inline-block" }}
    >
      <Text
        display="inline"
        fontWeight={done ? "bold" : undefined}
        color={done ? textDone : "inherit"}
      >
        {children}
      </Text>
    </motion.span>
  );
};

/* ---------- component ---------- */

export default function ChoreManager() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const npub = localStorage.getItem("local_npub");

  /* stable Firestore reference */
  const collRef = useMemo(
    () => collection(database, "users", npub, "choreSets"),
    [npub]
  );

  /* state */
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [goal, setGoal] = useState(
    Number(localStorage.getItem("chore_goal") || 20)
  );

  /* fetch history */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collRef, orderBy("generatedAt", "desc"))
      );
      setHistory(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          generatedAt: d.data().generatedAt?.toDate?.() || new Date(0),
        }))
      );
      setLoading(false);
    })();
  }, [collRef]);

  /* helpers */
  const totalDone = history.reduce(
    (a, d) => a + Object.values(d.completions || {}).filter(Boolean).length,
    0
  );
  const pctGlobal = Math.min((totalDone / goal) * 100, 100);

  const completedItems = history.flatMap((d) =>
    FREQ_ORDER.filter((k) => d.completions?.[k]).map((k) => ({
      when: d.generatedAt,
      task: d.selections[k],
      freq: pretty(k),
    }))
  );

  /* generate new list */
  const generateChores = async () => {
    setGenerating(true);
    try {
      const ai = await fetchListFromGemini(history);
      if (!ai) throw new Error("Gemini kept producing duplicates—try again.");

      // write to Firestore (serverTimestamp) but also push local copy immediately
      const provisional = {
        generatedAt: new Date(),
        selections: ai.selections,
        summary: ai.summary,
        completions: {},
      };

      const docRef = await addDoc(collRef, {
        ...provisional,
        generatedAt: serverTimestamp(),
      });

      setHistory((prev) => [{ id: docRef.id, ...provisional }, ...prev]);
    } catch (err) {
      console.error(err);
      toast({
        status: "error",
        title: "Generation failed",
        description: err.message,
      });
    }
    setGenerating(false);
  };

  /* toggle checkbox */
  const toggleDone = async (docId, key, current) => {
    try {
      await updateDoc(doc(collRef, docId), {
        [`completions.${key}`]: !current,
      });
      setHistory((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, completions: { ...d.completions, [key]: !current } }
            : d
        )
      );
    } catch (err) {
      console.error(err);
      toast({
        status: "error",
        title: "Update failed",
        description: err.message,
      });
    }
  };

  /* render */
  if (loading)
    return (
      <Box p={6} textAlign="center">
        <Spinner />
      </Box>
    );

  return (
    <Box p={6} maxW="760px" mx="auto" borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>
        Chore Manager
      </Heading>

      <HStack mb={6} spacing={6} flexWrap="wrap">
        <Button
          colorScheme="teal"
          onClick={generateChores}
          isLoading={generating}
        >
          Generate Chores
        </Button>

        <HStack>
          <Text fontWeight="bold">Goal</Text>
          <NumberInput
            size="sm"
            maxW="80px"
            min={1}
            value={goal}
            onChange={(_, n) => {
              const v = n || 1;
              setGoal(v);
              localStorage.setItem("chore_goal", v);
            }}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>

        <Button
          variant="outline"
          onClick={onOpen}
          isDisabled={completedItems.length === 0}
        >
          View Completed ({completedItems.length})
        </Button>
      </HStack>

      <Progress
        value={pctGlobal}
        h="12px"
        borderRadius="md"
        colorScheme="yellow"
        mb={4}
      />
      <Text fontSize="sm" color="gray.600" mb={6}>
        {totalDone}/{goal} chores completed
      </Text>

      {history.length === 0 ? (
        <Text>No lists yet. Press “Generate Chores”.</Text>
      ) : (
        history.map((doc, idx) => (
          <Box
            key={doc.id}
            p={5}
            mb={6}
            borderWidth="1px"
            borderRadius="xl"
            boxShadow="xs"
          >
            <Heading size="sm" mb={1}>
              List {history.length - idx} •{" "}
              {doc.generatedAt.toLocaleDateString()}
            </Heading>
            {doc.summary && (
              <>
                <Text fontStyle="italic" mb={3}>
                  {doc.summary}
                </Text>
                <Divider mb={3} />
              </>
            )}

            {FREQ_ORDER.filter((k) => doc.selections[k]).map((key) => {
              const done = doc.completions?.[key] || false;
              return (
                <Box key={key} mb={3}>
                  <Text fontWeight="bold">{pretty(key)}</Text>
                  <Checkbox
                    isChecked={done}
                    onChange={() => toggleDone(doc.id, key, done)}
                  >
                    <MotionBubble done={done}>
                      {doc.selections[key]}
                    </MotionBubble>
                  </Checkbox>
                </Box>
              );
            })}
          </Box>
        ))
      )}

      {/* completed modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Completed Chores</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {completedItems.length === 0 ? (
              <Text>No chores completed yet.</Text>
            ) : (
              completedItems.map((c, i) => (
                <Box
                  key={i}
                  p={3}
                  mb={2}
                  borderWidth="1px"
                  borderRadius="md"
                  bg="green.50"
                >
                  <Text fontWeight="bold">{c.task}</Text>
                  <HStack fontSize="xs" color="gray.600">
                    <Text>{c.freq}</Text>
                    <Text>•</Text>
                    <Text>{c.when.toLocaleDateString()}</Text>
                  </HStack>
                </Box>
              ))
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

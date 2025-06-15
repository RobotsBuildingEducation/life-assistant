import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  Spinner,
  Badge,
  Wrap,
  WrapItem,
  CloseButton,
} from "@chakra-ui/react";
import GlassBox from "../GlassBox";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { database } from "../../firebaseResources/config";
import { getGenerativeModel } from "@firebase/vertexai";
import { vertexAI } from "../../firebaseResources/config";
import {
  formatEmotionItem,
  customInstructions,
  emotionSummarizer,
} from "./EmotionTracker.compute";
import { highEnergyFeelings, lowEnergyFeelings } from "./EmotionTracker.data";

import { keyframes } from "@emotion/react";

const movingFace = keyframes`
   0%, 100% {
     border-radius: 10px 50px 50px 10px;
     transform: translateY(0) rotate(0deg);
   }
   25% {
     border-radius: 50px 10px 10px 50px;
     transform: translateY(-5px) rotate(-2deg);
   }
   50% {
     border-radius: 10px 50px 50px 10px;
     transform: translateY(0) rotate(0deg);
   }
   75% {
     border-radius: 50px 10px 10px 50px;
     transform: translateY(5px) rotate(2deg);
   }
 `;

// Initialize AI model
const aiModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

export default function EmotionTracker({ visible }) {
  const npub = localStorage.getItem("local_npub");
  const [savedEntries, setSavedEntries] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // multi-select state
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const [advice, setAdvice] = useState("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // load saved entries from Firestore
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoadingSaved(true);
      const ref = collection(database, "users", npub, "emotions");
      const q = query(ref, orderBy("timestamp"));
      const snap = await getDocs(q);
      setSavedEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingSaved(false);
    })();
  }, [npub, visible]);

  // toggle selection on/off
  const toggleEmotion = (e) => {
    setSelected((current) => {
      const exists = current.find((item) => item.label === e.label);
      if (exists) {
        return current.filter((item) => item.label !== e.label);
      } else {
        return [...current, e];
      }
    });
    setAdvice("");
    setNote("");
  };

  // remove a selected tag
  const removeEmotion = (e) => {
    setSelected((current) => current.filter((item) => item.label !== e.label));
  };

  // generate AI insight
  const generateInsight = async () => {
    setLoadingAdvice(true);
    setAdvice("");
    const prompt = customInstructions({
      emotionNote: note,
      selectedEmotion: selected,
    });
    let raw = "";
    const stream = await aiModel.generateContentStream(prompt);
    for await (const chunk of stream.stream) {
      raw += chunk.text();
    }
    setAdvice(raw);
    setLoadingAdvice(false);
  };

  // save one entry containing all selected emotions
  const saveEntry = async () => {
    const ref = collection(database, "users", npub, "emotions");
    const payload = {
      emotions: selected,
      note,
      ai: advice,
      timestamp: serverTimestamp(),
    };
    await addDoc(ref, payload);
    // reload entries
    const snap = await getDocs(query(ref, orderBy("timestamp")));
    setSavedEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    // reset form
    setSelected([]);
    setNote("");
    setAdvice("");
  };

  // summarize journey
  const generateSummary = async () => {
    setLoadingSummary(true);
    setSummary("");
    const prompt = emotionSummarizer(JSON.stringify(savedEntries));
    let raw = "";
    const stream = await aiModel.generateContentStream(prompt);
    for await (const chunk of stream.stream) {
      raw += chunk.text();
    }
    setSummary(raw);
    setLoadingSummary(false);
  };

  if (!visible) return null;

  return (
    <GlassBox p={4} borderRadius="md" mb={6}>
      <VStack align="stretch" spacing={4}>
        <Text fontSize="lg" fontWeight="bold">
          Emotion Tracker
        </Text>

        <Text fontSize="sm">
          Select all the emotions you're feeling, then write a note and generate
          an insight that you can save and track for later.
        </Text>

        {/* Emotion selection */}
        <Box wrap="wrap" spacing={2}>
          <Text fontWeight="bold">High Energy</Text>
          {highEnergyFeelings.map((e) => {
            const isSelected = selected.some((sel) => sel.label === e.label);
            return (
              <Button
                key={e.label}
                m={2}
                w="125px"
                h="125px"
                bg={e.color}
                _hover={{ bg: e.colorHover }}
                borderWidth={isSelected ? "4px" : "0"}
                borderColor="pink"
                onClick={() => toggleEmotion(e)}
                animation={
                  isSelected
                    ? `${movingFace} 1.75s ease-in-out infinite`
                    : undefined
                }
              >
                {e.emoji}
                <br />
                {e.label}
              </Button>
            );
          })}

          <Text fontWeight="bold" mt={4}>
            Low Energy
          </Text>
          {lowEnergyFeelings.map((e) => {
            const isSelected = selected.some((sel) => sel.label === e.label);

            return (
              <Button
                key={e.label}
                m={2}
                w="125px"
                h="125px"
                bg={e.color}
                _hover={{ bg: e.colorHover }}
                // borderWidth={
                //   selected.some((sel) => sel.label === e.label) ? "4px" : "0"
                // }
                borderWidth={isSelected ? "4px" : "0"}
                borderColor="cyan"
                onClick={() => toggleEmotion(e)}
                animation={
                  isSelected
                    ? `${movingFace} 3.5s ease-in-out infinite`
                    : undefined
                }
              >
                {e.emoji}
                <br />
                {e.label}
              </Button>
            );
          })}
        </Box>

        {/* Selected tags with remove button */}
        {selected.length > 0 && (
          <VStack align="stretch" spacing={2}>
            <Text fontWeight="semibold">Selected:</Text>
            <Wrap>
              {selected.map((e) => (
                <WrapItem key={e.label}>
                  <Badge
                    px={2}
                    py={1}
                    borderRadius="md"
                    bg={e.color}
                    _hover={{ bg: e.colorHover }}
                    color="white"
                  >
                    <HStack spacing={1}>
                      <Text>
                        {e.emoji} {e.label}
                      </Text>
                      <CloseButton size="sm" onClick={() => removeEmotion(e)} />
                    </HStack>
                  </Badge>
                </WrapItem>
              ))}
            </Wrap>
            <Textarea
              placeholder="Add a note..."
              value={note}
              onChange={(evt) => setNote(evt.target.value)}
            />
            <Button onClick={generateInsight} isLoading={loadingAdvice}>
              💭 Generate Insight
            </Button>
            {advice && <Box whiteSpace="pre-wrap">{advice}</Box>}
            <Button
              colorScheme="blue"
              onClick={saveEntry}
              isDisabled={!advice && !note}
            >
              Save Entry
            </Button>
          </VStack>
        )}

        {/* Journey summary */}
        <VStack
          align="stretch"
          spacing={2}
          pt={4}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <HStack justify="space-between">
            <Text fontSize="md" fontWeight="semibold">
              Review Your Journey
            </Text>
            <Button size="sm" onClick={generateSummary}>
              🔍 Summarize
            </Button>
          </HStack>
          {loadingSummary ? (
            <Spinner />
          ) : (
            summary && <Box whiteSpace="pre-wrap">{summary}</Box>
          )}
        </VStack>

        {/* Saved entries log */}
        {loadingSaved ? (
          <Spinner />
        ) : (
          savedEntries
            .slice()
            .reverse()
            .map((entry) => (
              <Box key={entry.id} p={3} borderWidth="1px" borderRadius="md">
                <Wrap spacing={1} mb={2}>
                  {entry.emotions.map((e) => (
                    <WrapItem key={e.label}>
                      <Badge
                        px={2}
                        py={1}
                        borderRadius="md"
                        bg={e.color}
                        color="white"
                      >
                        {e.emoji} {e.label}
                      </Badge>
                    </WrapItem>
                  ))}
                </Wrap>
                {entry.note && (
                  <Text fontStyle="italic" mb={2}>
                    {entry.note}
                  </Text>
                )}
                {entry.ai && <Box mb={2}>{entry.ai}</Box>}
                {entry.timestamp?.toDate && (
                  <Text fontSize="sm" color="gray.500">
                    {entry.timestamp.toDate().toLocaleString()}
                  </Text>
                )}
              </Box>
            ))
        )}
      </VStack>
    </GlassBox>
  );
}

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

import {
  Box,
  Button,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Spinner,
  Text,
  Wrap,
  WrapItem,
  CloseButton,
  HStack,
  SimpleGrid,
  UnorderedList,
  OrderedList,
  ListItem,
} from "@chakra-ui/react";
import GlassBox from "../GlassBox";
import { getGenerativeModel } from "@firebase/vertexai";
import { vertexAI, database } from "../../firebaseResources/config";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { markdownTheme } from "../../theme";

const budgetModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

export const fieldOptions = [
  {
    key: "incomeW2",
    label: "Monthly income from W2",
    placeholder: "e.g. 3000",
  },
  {
    key: "incomeBusiness",
    label: "Monthly income from business",
    placeholder: "e.g. 2000",
  },
  {
    key: "monthlyCosts",
    label: "Monthly costs (rent, bills, food)",
    placeholder: "e.g. 1500",
  },
  { key: "emergencyFund", label: "Emergency Fund", placeholder: "e.g. 20000" },
  { key: "retirement", label: "401k/IRA total", placeholder: "e.g. 20000" },
  {
    key: "investments",
    label: "Value held in stocks and trades",
    placeholder: "e.g. 10000",
  },
  { key: "collegeDebt", label: "College debt", placeholder: "e.g. 150000" },
  {
    key: "creditCardDebt",
    label: "Credit card debt",
    placeholder: "e.g. 5000",
  },
  { key: "mortgage", label: "Mortgage remaining", placeholder: "e.g. 150000" },
  {
    key: "propertyValue",
    label: "Value of property",
    placeholder: "e.g. 200000",
  },
];
const debtFields = ["collegeDebt", "creditCardDebt"];

const BudgetTool = ({ userDoc, auto = false }) => {
  const npub = localStorage.getItem("local_npub");
  const [activeFields, setActiveFields] = useState([]);
  const [budgetData, setBudgetData] = useState({ financialGoals: "" });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [savedBudgets, setSavedBudgets] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState(null);

  useEffect(() => {
    (async () => {
      let baseDoc = userDoc;
      if (!baseDoc) {
        const userRef = doc(database, "users", npub);
        const userSnap = await getDoc(userRef);
        baseDoc = userSnap.exists() ? userSnap.data() : null;
      }
      if (baseDoc) {
        const data = baseDoc.budgetPreferences || {};
        setBudgetData({ financialGoals: "", ...data });
        const keys = Object.keys(data).filter((k) => k !== "financialGoals");
        setActiveFields(keys);
      }
      const ref = collection(database, "users", npub, "budgetMemories");
      const snap = await getDocs(query(ref, orderBy("timestamp", "desc")));
      setSavedBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingSaved(false);
    })();
  }, [npub]);

  useEffect(() => {
    if (auto && activeFields.length > 0 && !suggestions) {
      generateSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, activeFields.length]);

  const addField = (key) => setActiveFields((prev) => [...prev, key]);
  const removeField = (key) => {
    setActiveFields((prev) => prev.filter((f) => f !== key));
    setBudgetData((prev) => {
      const { [key]: _, ...rest } = prev;
      if (debtFields.includes(key)) delete rest[`${key}Rate`];
      return rest;
    });
  };

  const generateSuggestions = async () => {
    setLoading(true);
    setSuggestions("");

    const userRef = doc(database, "users", npub);
    await setDoc(userRef, { budgetPreferences: budgetData }, { merge: true });

    const lines = [
      `Financial goals: ${budgetData.financialGoals}`,
      ...activeFields.flatMap((key) => {
        const opt = fieldOptions.find((o) => o.key === key);
        const base = `${opt?.label}: ${budgetData[key] || ""}`;
        if (debtFields.includes(key)) {
          const rateKey = `${key}Rate`;
          return [
            base,
            `Interest rate for ${opt?.label}: ${
              budgetData[rateKey] || "not provided"
            }%`,
          ];
        }
        return [base];
      }),
    ];
    const prompt =
      `User Profile:\n${JSON.stringify(userDoc || {}, null, 2)}\n\n` +
      `User Financial Data:\n${lines.join("\n")}\n\n` +
      `Provide clear, actionable suggestions to improve savings and optimize expenses based on the above data.`;

    const stream = await budgetModel.generateContentStream(prompt);
    let suggestionText = "";
    for await (const chunk of stream.stream) {
      const txt = chunk.text();
      suggestionText += txt;
      setSuggestions((prev) => prev + txt);
    }
    const finalText = suggestionText.trim();

    const memRef = collection(database, "users", npub, "budgetMemories");
    await addDoc(memRef, {
      data: budgetData,
      suggestions: finalText,
      timestamp: serverTimestamp(),
    });
    const newSnap = await getDocs(query(memRef, orderBy("timestamp", "desc")));
    setSavedBudgets(newSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  return (
    <GlassBox p={4} borderRadius="md" maxW="600px" mx="auto">
      <Heading size="md" mb={4} textAlign="center">
        Budget Analyzer
      </Heading>

      <VStack spacing={4} align="stretch">
        {!auto && (
          <>
            <FormControl isRequired>
              <FormLabel>Financial goals</FormLabel>
              <Input
                placeholder="e.g. Save for vacation"
                value={budgetData.financialGoals}
                onChange={(e) =>
                  setBudgetData((prev) => ({
                    ...prev,
                    financialGoals: e.target.value,
                  }))
                }
              />
            </FormControl>

            <Box>
              <Text fontWeight="semibold">Add Fields:</Text>
              <Wrap spacing={4} mt={2}>
                {fieldOptions
                  .filter((opt) => !activeFields.includes(opt.key))
                  .map((opt) => (
                    <WrapItem key={opt.key}>
                      <Button size="lg" onClick={() => addField(opt.key)}>
                        {opt?.label}
                      </Button>
                    </WrapItem>
                  ))}
              </Wrap>
            </Box>

            {activeFields.map((key) => {
              const opt = fieldOptions.find((o) => o.key === key);
              return (
                <FormControl key={key} isRequired>
                  <FormLabel>{opt?.label}</FormLabel>
                  <HStack>
                    <Input
                      flex="1"
                      placeholder={opt?.placeholder}
                      value={budgetData[key] || ""}
                      onChange={(e) =>
                        setBudgetData((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                    <CloseButton onClick={() => removeField(key)} />
                  </HStack>
                </FormControl>
              );
            })}

            {activeFields
              .filter((key) => debtFields.includes(key))
              .map((key) => {
                const opt = fieldOptions.find((o) => o.key === key);
                const rateKey = `${key}Rate`;
                return (
                  <FormControl key={rateKey} isRequired>
                    <FormLabel>Interest rate for {opt?.label} (%)</FormLabel>
                    <Input
                      placeholder="e.g. 5"
                      value={budgetData[rateKey] || ""}
                      onChange={(e) =>
                        setBudgetData((prev) => ({
                          ...prev,
                          [rateKey]: e.target.value,
                        }))
                      }
                    />
                  </FormControl>
                );
              })}

            <Button
              onClick={generateSuggestions}
              isLoading={loading}
              colorScheme="teal"
              isDisabled={!budgetData.financialGoals || activeFields.length === 0}
            >
              Summarize Suggestions
            </Button>
          </>
        )}

      </VStack>

      <Box mt={6}>
        {!suggestions && loading && <Spinner />}
        {suggestions && (
          <ReactMarkdown components={markdownTheme}>
            {suggestions}
          </ReactMarkdown>
        )}
      </Box>

      <Box mt={6}>
        <Heading size="sm" mb={2}>
          History
        </Heading>
        {loadingSaved ? (
          <Spinner />
        ) : (
          <VStack align="stretch" spacing={2}>
            {savedBudgets.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant="outline"
                onClick={() => setSelectedMemory(entry)}
                padding={12}
              >
                {entry.timestamp?.toDate().toLocaleString()}
              </Button>
            ))}
          </VStack>
        )}

        {selectedMemory && (
          <Box mt={4} p={3} borderWidth="1px" borderRadius="md">
            <Button size="xs" mb={2} onClick={() => setSelectedMemory(null)}>
              Back to list
            </Button>
            <Text fontWeight="bold" mb={1}>
              Suggestions:
            </Text>
            <ReactMarkdown components={markdownTheme}>
              {selectedMemory.suggestions}
            </ReactMarkdown>
            <Text fontWeight="bold" mb={1}>
              Data:
            </Text>
            <SimpleGrid columns={2} spacing={2}>
              {Object.entries(selectedMemory.data).map(([key, value]) => {
                let label =
                  key === "financialGoals"
                    ? "Financial goals"
                    : fieldOptions.find((o) => o.key === key)?.label || key;
                return (
                  <React.Fragment key={key}>
                    <Text fontWeight="semibold">{label}:</Text>
                    <Text>{value}</Text>
                  </React.Fragment>
                );
              })}
            </SimpleGrid>
          </Box>
        )}
      </Box>
    </GlassBox>
  );
};

export default BudgetTool;

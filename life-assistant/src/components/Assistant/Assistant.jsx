import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Heading,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
} from "@chakra-ui/react";
import { getGenerativeModel } from "@firebase/vertexai";
import { vertexAI, database, Schema } from "../../firebaseResources/config";
import { getUser } from "../../firebaseResources/store";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import EmotionTracker from "../EmotionTracker/EmotionTracker";
import SleepCycleCalculator from "../SleepCycleCalculator/SleepCycleCalculator";
import MealIdeas from "../MealIdeas/MealIdeas";
import BudgetTool from "../BudgetTool/BudgetTool";
import { RelationshipCounselor } from "../RelatonshipCounselor/RelationshipCounselor";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { PlanResult } from "../PlanResult/PlanResult";
import { markdownTheme } from "../../theme";
import ChoreManager from "../ChoreManager/ChoreManager";

const responseSchema = Schema.object({
  properties: {
    recipes: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(),
          description: Schema.string(),
          ingredients: Schema.string(),
          nutritionalAnalysis: Schema.string(),
        },
        required: ["name", "description", "ingredients", "nutritionalAnalysis"],
      }),
    }),
    bestSuggestion: Schema.string(),
  },
  required: ["recipes", "bestSuggestion"],
});

const mealModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema,
  },
});

const planModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

export const Assistant = () => {
  const [userDoc, setUserDoc] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [memories, setMemories] = useState([]);

  const [planText, setPlanText] = useState("");
  const [bestSuggestion, setBestSuggestion] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [recipes, setRecipes] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [showSleepUI, setShowSleepUI] = useState(false);
  const [sleepHour, setSleepHour] = useState("10");
  const [sleepMinute, setSleepMinute] = useState("00");
  const [sleepAmPm, setSleepAmPm] = useState("PM");
  const [cycles, setCycles] = useState([]);

  const [showPlanUI, setShowPlanUI] = useState(false);
  const [showEmotionUI, setShowEmotionUI] = useState(false);
  const [showBudgetUI, setShowBudgetUI] = useState(false);
  const [showRelationshipUI, setShowRelationshipUI] = useState(false);
  const [showChoreUI, setShowChoreUI] = useState(false);

  useEffect(() => {
    (async () => {
      const npub = localStorage.getItem("local_npub");
      const user = await getUser(npub);
      setUserDoc(user);
      setLoadingUser(false);
    })();
  }, []);

  useEffect(() => {
    if (!userDoc) return;
    (async () => {
      setLoadingMemories(true);
      const memRef = collection(
        database,
        "users",
        localStorage.getItem("local_npub"),
        "memories"
      );
      const q = query(memRef, orderBy("dayNumber"));
      const memSnap = await getDocs(q);
      setMemories(memSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingMemories(false);
    })();
  }, [userDoc]);

  const calculateCycles = (startDate) => {
    const newCycles = [];
    const onsetOffset = 14 * 60000;
    for (let i = 1; i <= 6; i++) {
      const cycleDate = new Date(
        startDate.getTime() + onsetOffset + 90 * 60000 * i
      );
      newCycles.push(
        cycleDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
    }
    setCycles(newCycles);
  };

  useEffect(() => {
    const h = parseInt(sleepHour, 10) % 12;
    let hour24 = h + (sleepAmPm === "PM" ? 12 : 0);
    if (sleepHour === "12" && sleepAmPm === "AM") hour24 = 0;
    const now = new Date();
    let base = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour24,
      parseInt(sleepMinute, 10)
    );
    if (base < now) base.setDate(base.getDate() + 1);
    calculateCycles(base);
  }, [sleepHour, sleepMinute, sleepAmPm]);

  const handleSleepNow = () => {
    const now = new Date();
    const h12 = now.getHours() % 12 || 12;
    setSleepHour(String(h12));
    setSleepMinute(now.getMinutes().toString().padStart(2, "0"));
    setSleepAmPm(now.getHours() >= 12 ? "PM" : "AM");
    calculateCycles(now);
  };

  const generatePlan = async () => {
    setShowSleepUI(false);
    setShowEmotionUI(false);
    setShowBudgetUI(false);
    setShowRelationshipUI(false);
    setShowChoreUI(false);
    setRecipes([]);
    setPlanText("");
    setBestSuggestion("");
    if (!userDoc) return;
    setLoadingPlan(true);

    try {
      const dayNumber = memories.length + 1;
      const memoryContext = memories
        .map((m) => `Day ${m.dayNumber}: ${m.suggestion}`)
        .join("\n");
      const prompt = `
Day ${dayNumber}
Previous progress:
${memoryContext}

User Goals: "${userDoc.goals}";
Responsibilities: "${userDoc.responsibilities}";
Diet: "${userDoc.diet}";
Education: "${userDoc.education}".

Please write a concise, actionable plan for Day ${dayNumber} in plain text. Keep it brief and format in markdown using ordered lists.`;

      const stream = await planModel.generateContentStream(prompt);
      let accumulated = "";
      for await (const chunk of stream.stream) {
        const textChunk = chunk.text();
        accumulated += textChunk;
        setPlanText(accumulated);
      }

      const finalSuggestion = accumulated;
      setBestSuggestion(finalSuggestion);

      const memRef = collection(
        database,
        "users",
        localStorage.getItem("local_npub"),
        "memories"
      );
      await addDoc(memRef, {
        dayNumber,
        suggestion: finalSuggestion,
        recipes: [],
        timestamp: serverTimestamp(),
      });
      setMemories((prev) => [
        ...prev,
        { id: undefined, dayNumber, suggestion: finalSuggestion, recipes: [] },
      ]);
    } catch (err) {
      console.error("Plan error:", err);
    }

    setLoadingPlan(false);
  };

  const generateMeals = async () => {
    setShowPlanUI(false);
    setShowSleepUI(false);
    setShowEmotionUI(false);
    setShowBudgetUI(false);
    setShowRelationshipUI(false);
    setShowChoreUI(false);
    setPlanText("");
    setBestSuggestion("");
    if (!userDoc) return;
    setLoadingMeals(true);
    setRecipes([]);

    try {
      const prompt = `

The user has included some data about their diet: "${userDoc.diet}";
Generate a JSON with a "recipes" array of 5 meal ideas. Each item should include:
- name
- description
- ingredients
- nutritionalAnalysis (vitamins, macros, health benefits).`;

      let raw = "";
      const stream = await mealModel.generateContentStream(prompt);
      for await (const chunk of stream.stream) {
        raw += chunk.text();
      }
      const parsed = JSON.parse(raw);
      setRecipes(parsed.recipes);
    } catch (err) {
      console.error("Meals error:", err);
    }

    setLoadingMeals(false);
  };

  if (loadingUser || loadingMemories) {
    return (
      <Box p={4} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <Box p={4} maxW="600px" mx="auto" mt={24}>
      <Heading mb={4}>
        Personal Assistant{" "}
        {memories.length > 0 && (
          <Text fontSize="sm">Day {memories.length}</Text>
        )}
      </Heading>

      <Menu mb={6}>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
          Select Action
        </MenuButton>
        <br />
        <br />
        <MenuList>
          <MenuItem
            onClick={() => {
              setShowPlanUI(true);
              setShowBudgetUI(false);
              setShowSleepUI(false);
              setShowEmotionUI(false);
              setShowRelationshipUI(false);
              setShowChoreUI(false);
              setRecipes([]);
            }}
            isDisabled={loadingPlan}
          >
            Create Daily Action
          </MenuItem>
          <MenuItem onClick={generateMeals} isDisabled={loadingMeals}>
            Generate Meals
          </MenuItem>
          <MenuItem
            onClick={() => {
              setShowPlanUI(false);
              setShowBudgetUI(true);
              setShowSleepUI(false);
              setShowEmotionUI(false);
              setShowRelationshipUI(false);
              setShowChoreUI(false);
              setPlanText("");
              setBestSuggestion("");
              setRecipes([]);
            }}
          >
            Financial Planner
          </MenuItem>
          <MenuItem
            onClick={() => {
              setShowPlanUI(false);
              setShowSleepUI(true);
              setShowEmotionUI(false);
              setShowBudgetUI(false);
              setShowRelationshipUI(false);
              setShowChoreUI(false);
              setPlanText("");
              setBestSuggestion("");
              setRecipes([]);
            }}
          >
            Sleep Cycles
          </MenuItem>
          <MenuItem
            onClick={() => {
              setShowPlanUI(false);
              setShowEmotionUI(true);
              setShowSleepUI(false);
              setShowBudgetUI(false);
              setShowRelationshipUI(false);
              setShowChoreUI(false);
              setPlanText("");
              setBestSuggestion("");
              setRecipes([]);
            }}
          >
            Emotion Tracker
          </MenuItem>
          <MenuItem
            onClick={() => {
              setShowPlanUI(false);
              setShowRelationshipUI(true);
              setShowBudgetUI(false);
              setShowSleepUI(false);
              setShowEmotionUI(false);
              setShowChoreUI(false);
              setPlanText("");
              setBestSuggestion("");
              setRecipes([]);
            }}
          >
            Relationship Counselor
          </MenuItem>
          <MenuItem
            onClick={() => {
              setShowPlanUI(false);
              setShowSleepUI(false);
              setShowEmotionUI(false);
              setShowBudgetUI(false);
              setShowRelationshipUI(false);
              setShowChoreUI(true);
              setPlanText("");
              setBestSuggestion("");
              setRecipes([]);
            }}
          >
            Chore Manager
          </MenuItem>
        </MenuList>
      </Menu>

      {loadingMeals && (
        <Box p={4} textAlign="center">
          <Spinner />
        </Box>
      )}

      {showPlanUI && (
        <PlanResult
          userDoc={userDoc}
          memories={memories}
          onGeneratePlan={generatePlan}
          bestSuggestion={bestSuggestion}
          planText={planText}
          loadingPlan={loadingPlan}
        />
      )}

      {showSleepUI && (
        <SleepCycleCalculator
          sleepHour={sleepHour}
          sleepMinute={sleepMinute}
          sleepAmPm={sleepAmPm}
          setSleepHour={setSleepHour}
          setSleepMinute={setSleepMinute}
          setSleepAmPm={setSleepAmPm}
          handleSleepNow={handleSleepNow}
          cycles={cycles}
        />
      )}

      {showEmotionUI && <EmotionTracker visible={showEmotionUI} />}

      {showRelationshipUI && (
        <RelationshipCounselor onClose={() => setShowRelationshipUI(false)} />
      )}

      {showChoreUI && <ChoreManager userDoc={userDoc} />}

      {recipes.length > 0 && <MealIdeas recipes={recipes} />}

      {showBudgetUI && <BudgetTool />}
    </Box>
  );
};

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
  IconButton,
  Flex,
  VStack,
  HStack,
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
import VacationPlanner from "../VacationPlanner/VacationPlanner";
import { ChevronDownIcon, EditIcon } from "@chakra-ui/icons";
import ProfileEditor from "../ProfileEditor/ProfileEditor";
import { PlanResult } from "../PlanResult/PlanResult";
import { FadeInComponent, markdownTheme, RiseUpAnimation } from "../../theme";
import ChoreManager from "../ChoreManager/ChoreManager";
import { RoleCanvas } from "../RoleCanvas/RoleCanvas";

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

const thinkingModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.5-flash",
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
  const [showVacationUI, setShowVacationUI] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const [autoLoading, setAutoLoading] = useState(true);

  const [roleReason, setRoleReason] = useState("");

  const [role, setRole] = useState("chores");
  const ALL_ROLES = [
    "plan",
    "meals",
    "finance",
    "sleep",
    "emotions",
    "counselor",
    "vacation",
    "chores",
  ];
  const [roleHistory, setRoleHistory] = useState(() => {
    try {
      const stored = localStorage.getItem("roleHistory");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("roleHistory", JSON.stringify(roleHistory));
  }, [roleHistory]);

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

  useEffect(() => {
    if (!userDoc) return;
    (async () => {
      try {
        let history = roleHistory;
        if (history.length >= ALL_ROLES.length) {
          history = [];
          setRoleHistory([]);
        }
        const remaining = ALL_ROLES.filter((r) => !history.includes(r));
        const prompt = `Analyze the user's profile below and think step by step about which tool would be most useful today. Respond in JSON with keys \"choice\" and \"reason\". Valid choices: ${ALL_ROLES.join(
          ", "
        )}. Avoid choosing from: ${
          history.join(", ") || "none"
        }. Choose from: ${remaining.join(
          ", "
        )}. It must not be Markdown, just the object. \n\nUSER:\n${JSON.stringify(
          userDoc,
          null,
          2
        )}`;

        console.log("x", userDoc);

        const stream = await thinkingModel.generateContentStream(prompt);
        let raw = "";
        for await (const chunk of stream.stream) {
          raw += chunk.text();
        }
        let parsed;

        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { choice: raw.trim().toLowerCase(), reason: "" };
        }
        const suggested = parsed.choice;
        setRoleReason(parsed.reason || "");
        const choice = remaining.includes(suggested)
          ? suggested
          : remaining[0] || suggested;
        setRoleHistory((prev) => [...prev, choice]);
        applyRole(choice);
      } catch (err) {
        console.error("role suggestion error", err);
      } finally {
        setAutoLoading(false);
      }
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

  const resetUI = () => {
    setShowPlanUI(false);
    setShowSleepUI(false);
    setShowEmotionUI(false);
    setShowBudgetUI(false);
    setShowRelationshipUI(false);
    setShowChoreUI(false);
    setShowVacationUI(false);
    setPlanText("");
    setBestSuggestion("");
    setRecipes([]);
  };

  const applyRole = (r) => {
    resetUI();
    switch (r) {
      case "plan":
        setShowPlanUI(true);
        break;
      case "meals":
        generateMeals();
        break;
      case "finance":
        setShowBudgetUI(true);
        break;
      case "sleep":
        setShowSleepUI(true);
        break;
      case "emotions":
        setShowEmotionUI(true);
        break;
      case "counselor":
        setShowRelationshipUI(true);
        break;
      case "vacation":
        setShowVacationUI(true);
        break;
      case "chores":
        setShowChoreUI(true);
        break;
      default:
        break;
    }
    setRole(r === "chores" ? "sphere" : r);
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
      const prompt = `User Profile:\n${JSON.stringify(
        userDoc,
        null,
        2
      )}\n\nDay ${dayNumber}\nPrevious progress:\n${memoryContext}\n\nPlease write a concise, actionable plan for Day ${dayNumber} in plain text. Keep it brief and format in markdown using ordered lists.`;

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
    setRole("meals");
    setShowPlanUI(false);

    setShowSleepUI(false);
    setShowEmotionUI(false);
    setShowBudgetUI(false);
    setShowRelationshipUI(false);
    setShowChoreUI(false);
    setShowVacationUI(false);
    setPlanText("");
    setBestSuggestion("");
    if (!userDoc) return;
    setLoadingMeals(true);
    setRecipes([]);

    try {
      const prompt = `User Profile:\n${JSON.stringify(
        userDoc,
        null,
        2
      )}\n\nGenerate a JSON with a "recipes" array of 5 meal ideas based on the user's diet preferences. Each item should include:
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
    <Box p={4} maxW="600px" mx="auto" mt={0}>
      <RiseUpAnimation speed="3s">
        <RoleCanvas role={role} width={400} height={400} color="#FF69B4" />
      </RiseUpAnimation>
      {showProfileEditor && (
        <ProfileEditor
          userDoc={userDoc}
          onClose={() => setShowProfileEditor(false)}
          onSave={(data) =>
            setUserDoc((prev) => ({
              ...prev,
              ...data,
            }))
          }
        />
      )}
      <br />

      <FadeInComponent speed="0.5s">
        <Flex alignItems="center" mb={4}>
          <VStack>
            <Heading as="h2" size="lg">
              Personal Assistant
            </Heading>

            {/* <br />
          {memories.length > 0 && (
            <Text fontSize="sm" ml={2}>
              Day {memories.length}
            </Text>
          )} */}
            <HStack>
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<ChevronDownIcon />}
                  variant="ghost"
                  size="sm"
                  ml={2}
                />
                <MenuList>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("plan");
                      setShowPlanUI(true);
                      setShowBudgetUI(false);
                      setShowSleepUI(false);
                      setShowEmotionUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(false);
                      setRecipes([]);
                    }}
                    isDisabled={loadingPlan}
                  >
                    Create Daily Action
                  </MenuItem>
                  <MenuItem
                    onClick={generateMeals}
                    isDisabled={loadingMeals}
                    p={4}
                  >
                    Generate Meals
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("finance");
                      setShowPlanUI(false);
                      setShowBudgetUI(true);
                      setShowSleepUI(false);
                      setShowEmotionUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(false);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Financial Planner
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("sleep");
                      setShowPlanUI(false);
                      setShowSleepUI(true);
                      setShowEmotionUI(false);
                      setShowBudgetUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(false);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Sleep Cycles
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("emotions");
                      setShowPlanUI(false);
                      setShowEmotionUI(true);
                      setShowSleepUI(false);
                      setShowBudgetUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(false);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Emotion Tracker
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("counselor");

                      setShowPlanUI(false);
                      setShowRelationshipUI(true);
                      setShowBudgetUI(false);
                      setShowSleepUI(false);
                      setShowEmotionUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(false);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Relationship Counselor
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("vacation");
                      setShowPlanUI(false);
                      setShowSleepUI(false);
                      setShowEmotionUI(false);
                      setShowBudgetUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(false);
                      setShowVacationUI(true);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Vacation Planner
                  </MenuItem>
                  <MenuItem
                    p={4}
                    onClick={() => {
                      setRole("sphere");
                      setShowPlanUI(false);
                      setShowSleepUI(false);
                      setShowEmotionUI(false);
                      setShowBudgetUI(false);
                      setShowRelationshipUI(false);
                      setShowChoreUI(true);
                      setShowVacationUI(false);
                      setPlanText("");
                      setBestSuggestion("");
                      setRecipes([]);
                    }}
                  >
                    Chore Manager
                  </MenuItem>
                </MenuList>
              </Menu>
              <IconButton
                icon={<EditIcon />}
                variant="ghost"
                size="sm"
                ml={2}
                onClick={() => setShowProfileEditor(true)}
              />
            </HStack>
          </VStack>
        </Flex>
      </FadeInComponent>

      <RiseUpAnimation speed="0.2s">
        <Text mb={2} fontSize="sm">
          Here is what I suggest today
        </Text>
        {roleReason && (
          <Text mb={2} fontSize="xs" color="gray.500">
            {roleReason}
          </Text>
        )}
      </RiseUpAnimation>
      <br />

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

      {showEmotionUI && (
        <EmotionTracker visible={showEmotionUI} userDoc={userDoc} />
      )}

      {showRelationshipUI && (
        <RelationshipCounselor
          userDoc={userDoc}
          onClose={() => setShowRelationshipUI(false)}
        />
      )}

      {showVacationUI && <VacationPlanner userDoc={userDoc} />}

      {showChoreUI && <ChoreManager userDoc={userDoc} />}

      {recipes.length > 0 && <MealIdeas recipes={recipes} />}

      {showBudgetUI && <BudgetTool userDoc={userDoc} />}
    </Box>
  );
};

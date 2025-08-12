import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Input,
  IconButton,
  VStack,
  HStack,
  Text,
  Switch,
  Heading,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@chakra-ui/react";
import { AddIcon, MinusIcon, EditIcon } from "@chakra-ui/icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
  increment,
  getDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { database, vertexAI } from "../../firebaseResources/config";
import { getUser, updateUser } from "../../firebaseResources/store";
import { FadeInComponent, markdownTheme } from "../../theme";
import { getGenerativeModel } from "@firebase/vertexai";
import PieChart from "../PieChart";
import ReactMarkdown from "react-markdown";

const analysisModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

// --- Wave-style progress bar (same spec as CloudTransition) ---
const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const MotionG = motion.g;

const WaveBar = ({
  value,
  height = 30,
  start = "#6a11cb",
  end = "#72a2f2",
  delay = 0.1,
  bg = "rgba(255,255,255,0.65)",
  border = "#ededed",
}) => {
  const gradId = React.useRef(
    `grad-${Math.random().toString(36).slice(2, 9)}`
  ).current;
  const widthPct = `${clampPct(value)}%`;
  return (
    <Box
      role="progressbar"
      aria-valuenow={clampPct(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      position="relative"
      bg={bg}
      borderRadius="9999px"
      overflow="hidden"
      height={`${height}px`}
      border={`1px solid ${border}`}
      backdropFilter="saturate(120%) blur(4px)"
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: widthPct }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute", top: 0, left: 0, bottom: 0 }}
      >
        <Box
          as="svg"
          viewBox="0 0 120 30"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          display="block"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={start} />
              <stop offset="100%" stopColor={end} />
            </linearGradient>
          </defs>

          {/* Fill */}
          <rect
            width="120"
            height="30"
            fill={`url(#${gradId})`}
            opacity="0.9"
          />

          {/* Two drifting wave layers */}
          <MotionG
            initial={{ x: 0 }}
            animate={{ x: [-10, 0, -10] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
            opacity={0.18}
          >
            <path
              d="M0,18 C10,14 20,22 30,18 S50,14 60,18 S80,22 90,18 S110,14 120,18 L120,30 L0,30 Z"
              fill="#fff"
            />
          </MotionG>
          <MotionG
            initial={{ x: 0 }}
            animate={{ x: [10, 0, 10] }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: delay + 0.2,
            }}
            opacity={0.12}
          >
            <path
              d="M0,16 C12,12 22,20 32,16 S52,12 62,16 S82,20 92,16 S112,12 122,16 L122,30 L0,30 Z"
              fill="#fff"
            />
          </MotionG>

          {/* Gloss line */}
          <rect
            y="0"
            width="120"
            height="2"
            fill="rgba(255,255,255,0.45)"
            rx="1"
          />
        </Box>
      </motion.div>
    </Box>
  );
};

export const NewAssistant = () => {
  const [userDoc, setUserDoc] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [goalInput, setGoalInput] = useState("");
  const [stage, setStage] = useState("goal"); // 'goal' or 'tasks'

  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [listCreated, setListCreated] = useState(false);
  const [completed, setCompleted] = useState({});
  const [memoryId, setMemoryId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [progress, setProgress] = useState(100);
  const [timeString, setTimeString] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [listKey, setListKey] = useState(0);
  const [globalAverage, setGlobalAverage] = useState(null);
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [timerExpired, setTimerExpired] = useState(false);

  const normalizeTask = (t) => (typeof t === "string" ? t : t.text || "");

  const startNewList = useCallback(() => {
    setTasks([]);
    setCompleted({});
    setListCreated(false);
    setMemoryId(null);
    setStartTime(null);
    setProgress(100);
    setTimeString("");
    setListKey((k) => k + 1);
    setTaskInput("");
    setStatusText("");
    setTimerExpired(false);
    localStorage.removeItem("draft_tasks");
    localStorage.removeItem("draft_status");
  }, []);

  const finishList = useCallback(
    (completedMap, finishedId = memoryId) => {
      if (!finishedId) return;
      const npub = localStorage.getItem("local_npub");
      const completedTasks = tasks.filter((_, i) => completedMap[i]);
      const incompletedTasks = tasks.filter((_, i) => !completedMap[i]);
      const pct = tasks.length
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0;

      const historyEntry = {
        id: finishedId,
        tasks,
        completed: completedTasks,
        incompleted: incompletedTasks,
        percentage: pct,
        analysis: "",
        generating: true,
        timestamp: startTime,
        status: statusText,
      };
      setHistory((prev) => [historyEntry, ...prev]);

      startNewList();

      (async () => {
        try {
          const memDoc = doc(database, "users", npub, "memories", finishedId);
          await updateDoc(memDoc, {
            completed: completedTasks,
            incompleted: incompletedTasks,
            finished: true,
            finishedAt: serverTimestamp(),
            percentage: pct,
            status: statusText,
          });
        } catch (err) {
          console.error("update memory error", err);
        }

        try {
          const statsDocRef = doc(database, "stats", "completion");
          await setDoc(
            statsDocRef,
            { total: increment(pct), count: increment(1) },
            { merge: true }
          );
          const statsSnap = await getDoc(statsDocRef);
          if (statsSnap.exists()) {
            const data = statsSnap.data();
            if (data.count > 0) {
              setGlobalAverage(data.total / data.count);
            }
          }
        } catch (err) {
          console.error("update stats error", err);
        }

        let analysisText = "";
        try {
          const prompt = `Goal: ${
            userDoc?.mainGoal || goalInput
          }\nTasks completed:\n${tasks
            .map((t, i) => `${i + 1}. ${t}`)
            .join(
              "\n"
            )}\n\nBriefly review what was done well relative to the goal and suggest what could be improved. Keep it brief, simple and professional - max 1 sentence in total. `;
          const stream = await analysisModel.generateContentStream(prompt);
          for await (const chunk of stream.stream) {
            const txt = chunk.text();
            analysisText += txt;
            const partial = analysisText;
            setHistory((prev) =>
              prev.map((h) =>
                h.id === finishedId ? { ...h, analysis: partial } : h
              )
            );
          }
        } catch (err) {
          console.error("analysis error", err);
        }

        try {
          const memDoc = doc(database, "users", npub, "memories", finishedId);
          await updateDoc(memDoc, { analysis: analysisText });
        } catch (err) {
          console.error("update analysis error", err);
        }

        setHistory((prev) =>
          prev.map((h) =>
            h.id === finishedId
              ? { ...h, analysis: analysisText, generating: false }
              : h
          )
        );
      })();
    },
    [goalInput, memoryId, startNewList, startTime, tasks, userDoc, statusText]
  );

  const {
    isOpen: isGoalOpen,
    onOpen: onGoalOpen,
    onClose: onGoalClose,
  } = useDisclosure();

  const {
    isOpen: isAdviceOpen,
    onOpen: onAdviceOpen,
    onClose: onAdviceClose,
  } = useDisclosure();

  useEffect(() => {
    const saved = localStorage.getItem("draft_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved).map(normalizeTask));
      } catch {
        /* ignore */
      }
    }
    const savedStatus = localStorage.getItem("draft_status");
    if (savedStatus) {
      setStatusText(savedStatus);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const npub = localStorage.getItem("local_npub");
      const user = await getUser(npub);
      setUserDoc(user);
      setGoalInput(user?.mainGoal || "");
      setStage(user?.mainGoal ? "tasks" : "goal");
      setLoadingUser(false);
    })();
  }, []);

  useEffect(() => {
    if (!userDoc) return;
    setLoadingCurrent(true);
    (async () => {
      const npub = localStorage.getItem("local_npub");
      const memRef = collection(database, "users", npub, "memories");
      const q = query(memRef, orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      let current = null;
      const past = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const converted = {
          id: docSnap.id,
          ...data,
          tasks: (data.tasks || []).map(normalizeTask),
          completed: (data.completed || []).map(normalizeTask),
          incompleted: (data.incompleted || []).map(normalizeTask),
          status: data.status || "",
        };
        if (!current && !data.finished) {
          current = converted;
        } else if (data.finished) {
          past.push(converted);
        }
      });
      if (current) {
        setMemoryId(current.id);
        setTasks(current.tasks || []);
        const completedMap = {};
        (current.completed || []).forEach((t) => {
          const idx = (current.tasks || []).findIndex((ct) => ct === t);
          if (idx >= 0) completedMap[idx] = true;
        });
        setCompleted(completedMap);
        setStartTime(current.timestamp?.toDate());
        setStatusText(current.status || "");
        if ((current.tasks || []).length) {
          setListCreated(true);
          localStorage.removeItem("draft_tasks");
          localStorage.removeItem("draft_status");
        }
      }
      setHistory(past);
      setLoadingCurrent(false);
      try {
        const statsDocRef = doc(database, "stats", "completion");
        const statsSnap = await getDoc(statsDocRef);
        if (statsSnap.exists()) {
          const data = statsSnap.data();
          if (data.count > 0) {
            setGlobalAverage(data.total / data.count);
          }
        }
      } catch (err) {
        console.error("get stats error", err);
      }
    })();
  }, [userDoc]);

  useEffect(() => {
    if (!startTime) return;
    const total = 16 * 60 * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - startTime.getTime();
      const remaining = Math.max(0, total - elapsed);
      const pct = Math.max(0, 100 - (elapsed / total) * 100);
      setProgress(pct);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      setTimeString(`${hours} hours ${minutes} minutes ${seconds} seconds`);
      if (remaining <= 0 && listCreated && !timerExpired) {
        setTimerExpired(true);
        if (memoryId) {
          finishList(completed);
        } else {
          startNewList();
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    startTime,
    completed,
    listCreated,
    finishList,
    memoryId,
    timerExpired,
    startNewList,
  ]);

  const saveGoal = async () => {
    const npub = localStorage.getItem("local_npub");
    const newGoal = goalInput.trim();
    const history = userDoc?.goalHistory || [];
    const updatedHistory =
      userDoc?.mainGoal && userDoc.mainGoal !== newGoal
        ? [userDoc.mainGoal, ...history]
        : history;

    await updateUser(npub, {
      mainGoal: newGoal,
      goalHistory: updatedHistory,
    });

    setUserDoc((prev) => ({
      ...(prev || {}),
      mainGoal: newGoal,
      goalHistory: updatedHistory,
    }));
    setStage("tasks");
    onGoalClose();
  };

  const addTask = () => {
    if (taskInput.trim()) {
      setTasks((prev) => [...prev, taskInput.trim()]);
      setTaskInput("");
    }
  };

  const removeTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!listCreated) {
      localStorage.setItem("draft_tasks", JSON.stringify(tasks));
      localStorage.setItem("draft_status", statusText);
    }
  }, [tasks, statusText, listCreated]);

  const updateStatus = async (value) => {
    setStatusText(value);
    if (listCreated && memoryId) {
      const npub = localStorage.getItem("local_npub");
      const memDoc = doc(database, "users", npub, "memories", memoryId);
      try {
        await updateDoc(memDoc, { status: value });
      } catch (err) {
        console.error("update status error", err);
      }
    }
  };

  const createList = async () => {
    setCreating(true);
    setListCreated(true);
    setCompleted({});
    const created = Date.now();
    setStartTime(new Date(created));
    setProgress(100);
    localStorage.removeItem("draft_tasks");
    localStorage.removeItem("draft_status");
    const npub = localStorage.getItem("local_npub");
    try {
      const memRef = collection(database, "users", npub, "memories");
      const docRef = await addDoc(memRef, {
        tasks,
        status: statusText,
        completed: [],
        incompleted: tasks,
        timestamp: serverTimestamp(),
        finished: false,
      });
      setMemoryId(docRef.id);
      fetch(
        `https://us-central1-datachecking-7997c.cloudfunctions.net/scheduleExpiredListCheck?created=${created}&userId=${npub}`
      ).catch((err) => console.error("schedule list check error", err));
    } catch (err) {
      console.error("create list error", err);
    }
    setCreating(false);
  };

  const toggleTask = async (index) => {
    const npub = localStorage.getItem("local_npub");
    const newCompleted = { ...completed, [index]: !completed[index] };
    setCompleted(newCompleted);
    const allDone = tasks.length && tasks.every((_, i) => newCompleted[i]);

    if (allDone) {
      finishList(newCompleted, memoryId);
    } else if (memoryId) {
      const memDoc = doc(database, "users", npub, "memories", memoryId);
      try {
        await updateDoc(memDoc, {
          completed: tasks.filter((_, i) => newCompleted[i]),
          incompleted: tasks.filter((_, i) => !newCompleted[i]),
        });
      } catch (err) {
        console.error("update memory error", err);
      }
    }
  };

  const generateAdvice = async () => {
    const goal = userDoc?.mainGoal || goalInput;
    const historyLines = history
      .map((h, i) => {
        const completedText = (h.completed || []).join(", ");
        const incompletedText = (h.incompleted || []).join(", ");
        return `Session ${
          i + 1
        }: completed - ${completedText}, incompleted - ${incompletedText}`;
      })
      .join("\n");
    const prompt = `Goal: ${goal}\nHistory:\n${historyLines}\nProvide suggestions relative to the goal.`;
    setAdvice("");
    setAdviceLoading(true);
    onAdviceOpen();
    try {
      const stream = await analysisModel.generateContentStream(prompt);
      for await (const chunk of stream.stream) {
        const txt = chunk.text();
        setAdvice((prev) => prev + txt);
      }
    } catch (err) {
      console.error("advice error", err);
    }
    setAdviceLoading(false);
  };

  if (loadingUser) {
    return (
      <Box p={4} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <Box p={4} maxW="600px" mx="auto">
      <FadeInComponent speed="0.5s" />
      {globalAverage !== null && (
        <VStack
          fontSize="xs"
          color="gray.500"
          alignItems="center"
          display="flex"
          justifyContent={"center"}
        >
          <PieChart
            percentage={globalAverage}
            color="white"
            textShadow="0.75px 0.75px 0px black"
          />
          <Text color="#03fc56" fontWeight={"bolder"}>
            Signal Score
          </Text>
        </VStack>
      )}
      <Heading size="lg" textAlign="center" mt={4}>
        What do you need to accomplish in the next 16 hours?{" "}
        <IconButton
          aria-label="Edit goal"
          icon={<EditIcon />}
          size="sm"
          onClick={() => {
            setGoalInput(userDoc.mainGoal);
            onGoalOpen();
          }}
        />
      </Heading>
      <Text fontSize={"sm"} mt={4} mb={12}>
        A task in your mind is an idea. Writing it down turns it into a plan.
        <br />
        <br />
        What you need to accomplish in the next 16 hours is your{" "}
        <span style={{ color: "cyan", fontWeight: "bolder" }}>signal</span>,
        everything else is{" "}
        <span style={{ color: "hotpink", fontWeight: "bolder" }}>noise.</span>{" "}
        Aim to complete at least 80% of necessary tasks to make progress with
        your goals.
      </Text>
      <VStack spacing={4} align="stretch" mt={4} key={listKey}>
        {loadingCurrent ? (
          <Box p={4} textAlign="center">
            <Spinner />
          </Box>
        ) : (
          <>
            {listCreated && (
              <>
                <Text textAlign="center">{timeString}</Text>
                <Box mt={2}>
                  <WaveBar
                    value={progress}
                    start="#43e97b"
                    end="#38f9d7"
                    delay={0.1}
                    height={24}
                    bg="rgba(255,255,255,0.65)"
                    border="#ededed"
                  />
                </Box>
              </>
            )}

            {stage === "tasks" &&
              (!listCreated ? (
                <>
                  <VStack>
                    <Input
                      placeholder="Write a task"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                    />
                  </VStack>
                  <Button leftIcon={<AddIcon />} onClick={addTask}>
                    Add task
                  </Button>

                  <Box mt={12} mb={8}>
                    {tasks.map((t, i) => (
                      <HStack key={i} justify="space-between" mt={4}>
                        <Text>
                          {i + 1}. {t}
                        </Text>
                        <IconButton
                          aria-label="Delete task"
                          icon={<MinusIcon />}
                          size="sm"
                          onClick={() => removeTask(i)}
                        />
                      </HStack>
                    ))}
                  </Box>

                  {tasks.length > 0 && (
                    <Textarea
                      placeholder="How are you feeling or what are you thinking?"
                      value={statusText}
                      onChange={(e) => updateStatus(e.target.value)}
                      mt={4}
                      mb={8}
                    />
                  )}

                  <Button
                    onClick={createList}
                    isLoading={creating}
                    disabled={!tasks.length}
                  >
                    Start Tasks
                  </Button>
                </>
              ) : (
                <>
                  {tasks.map((t, i) => (
                    <HStack key={i}>
                      <Switch
                        isChecked={!!completed[i]}
                        onChange={() => toggleTask(i)}
                      />
                      <Text>
                        {i + 1}. {t}
                      </Text>
                    </HStack>
                  ))}

                  <Textarea
                    placeholder="How are you feeling or what are you thinking?"
                    value={statusText}
                    onChange={(e) => updateStatus(e.target.value)}
                    mt={4}
                  />
                </>
              ))}
          </>
        )}
      </VStack>

      <Box mt={16}>
        <HStack justify="space-between" align="center">
          <Heading size="sm">History</Heading>
          <Button size="xs" onClick={generateAdvice}>
            Generate advice
          </Button>
        </HStack>

        {loadingCurrent ? (
          <Spinner size="sm" mt={2} />
        ) : history.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No completed lists yet.
          </Text>
        ) : (
          history.map((h) => {
            const pct =
              h.percentage ??
              Math.round(
                ((h.completed || []).length / (h.tasks?.length || 1)) * 100
              );
            return (
              <Box key={h.id} borderWidth="1px" p={2} mt={2} borderRadius="md">
                {h.tasks.map((task, idx) => (
                  <Text key={idx} mb={1}>
                    {idx + 1}. {task}
                  </Text>
                ))}
                {h.status && (
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {h.status}
                  </Text>
                )}
                <Text fontSize="sm" mt={2}>
                  {pct}% complete
                </Text>
                <PieChart
                  percentage={pct}
                  size="60px"
                  mt={4}
                  mb={4}
                  color="transparent"
                />
                {h.analysis && (
                  <ReactMarkdown components={markdownTheme}>
                    {h.analysis}
                  </ReactMarkdown>
                )}
                {h.generating && <Spinner size="sm" mt={2} />}
              </Box>
            );
          })
        )}
      </Box>

      <Modal isOpen={isGoalOpen} onClose={onGoalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Refine Your Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {userDoc?.mainGoal && (
              <Box mb={4}>
                <Text fontWeight="bold">Current Goal</Text>
                <Text>{userDoc.mainGoal}</Text>
              </Box>
            )}
            {userDoc?.goalHistory?.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="bold">Previous Goals</Text>
                <VStack align="start" spacing={1} maxH="100px" overflowY="auto">
                  {userDoc.goalHistory.map((g, idx) => (
                    <Text key={idx} fontSize="sm">
                      • {g}
                    </Text>
                  ))}
                </VStack>
              </Box>
            )}
            <Textarea
              placeholder="Your main goal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={saveGoal}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isAdviceOpen} onClose={onAdviceClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Advice</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {advice && (
              <ReactMarkdown components={markdownTheme}>{advice}</ReactMarkdown>
            )}
            {adviceLoading && <Spinner size="sm" mt={2} />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default NewAssistant;

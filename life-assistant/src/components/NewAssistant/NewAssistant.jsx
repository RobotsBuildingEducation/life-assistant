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
} from "@chakra-ui/react";
import { AddIcon, EditIcon, MinusIcon } from "@chakra-ui/icons";
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
import { database, vertexAI } from "../../firebaseResources/config";
import { getUser, updateUser } from "../../firebaseResources/store";
import { FadeInComponent, markdownTheme } from "../../theme";
import { getGenerativeModel } from "@firebase/vertexai";
import PieChart from "../PieChart";
import ReactMarkdown from "react-markdown";

const analysisModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

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

  const startNewList = useCallback(() => {
    setTasks([]);
    setCompleted({});
    setListCreated(false);
    setMemoryId(null);
    setStartTime(null);
    setProgress(100);
    setTimeString("");
    setListKey((k) => k + 1);
    localStorage.removeItem("draft_tasks");
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
          const result = await analysisModel.generateContent(prompt);
          analysisText = result.response.text();
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
    [goalInput, memoryId, startNewList, startTime, tasks, userDoc]
  );

  const {
    isOpen: isGoalOpen,
    onOpen: onGoalOpen,
    onClose: onGoalClose,
  } = useDisclosure();

  useEffect(() => {
    const saved = localStorage.getItem("draft_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch {
        /* ignore */
      }
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
        if (!current && !data.finished) {
          current = { id: docSnap.id, ...data };
        } else if (data.finished) {
          past.push({ id: docSnap.id, ...data });
        }
      });
      if (current) {
        setMemoryId(current.id);
        setTasks(current.tasks || []);
        const completedMap = {};
        (current.completed || []).forEach((t) => {
          const idx = (current.tasks || []).indexOf(t);
          if (idx >= 0) completedMap[idx] = true;
        });
        setCompleted(completedMap);
        setStartTime(current.timestamp?.toDate());
        if ((current.tasks || []).length) {
          setListCreated(true);
          localStorage.removeItem("draft_tasks");
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
      if (remaining <= 0 && listCreated) {
        finishList(completed);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, completed, listCreated, finishList, memoryId]);

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
    }
  }, [tasks, listCreated]);

  const createList = async () => {
    setCreating(true);
    setListCreated(true);
    setCompleted({});
    setStartTime(new Date());
    setProgress(100);
    localStorage.removeItem("draft_tasks");
    const npub = localStorage.getItem("local_npub");
    try {
      const memRef = collection(database, "users", npub, "memories");
      const docRef = await addDoc(memRef, {
        tasks,
        completed: [],
        incompleted: tasks,
        timestamp: serverTimestamp(),
        finished: false,
      });
      setMemoryId(docRef.id);
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
      <Heading size="md" textAlign="center" mt={4}>
        What do we need to accomplish in the next 16 hours?{" "}
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
        What you need to accomplish in the next 16 hours is your <b>signal</b>,
        everything else is <b>noise.</b> Aim to complete at least 80% of
        necessary tasks to make progress.
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
                <PieChart percentage={progress} size="60px" mx="auto" />
              </>
            )}

            {stage === "tasks" &&
              (!listCreated ? (
                <>
                  <HStack>
                    <Input
                      placeholder="Write a task"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                    />
                  </HStack>
                  <Button leftIcon={<AddIcon />} onClick={addTask}>
                    Add task
                  </Button>

                  <Box mt={12} mb={12}>
                    {tasks.map((t, i) => (
                      <HStack key={i} justify="space-between">
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
                  <Button
                    onClick={createList}
                    isLoading={creating}
                    disabled={!tasks.length}
                  >
                    Start List
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
                </>
              ))}
          </>
        )}
      </VStack>

      <Box mt={16}>
        <Heading size="sm">History</Heading>
        {globalAverage !== null && (
          <HStack fontSize="xs" color="gray.500" alignItems="center">
            <Text>Global Average Completion:</Text>
            <PieChart percentage={globalAverage} size="24px" />
            <Text>{globalAverage.toFixed(1)}%</Text>
          </HStack>
        )}
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
                  <Text key={idx}>
                    {idx + 1}. {task}
                  </Text>
                ))}
                <Text fontSize="sm" mt={2}>
                  {pct}% complete
                </Text>
                <PieChart percentage={pct} size="60px" mt={2} />
                {h.generating ? (
                  <Spinner size="sm" mt={2} />
                ) : (
                  h.analysis && (
                    <ReactMarkdown components={markdownTheme}>
                      {h.analysis}
                    </ReactMarkdown>
                  )
                )}
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
            <Input
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
    </Box>
  );
};

export default NewAssistant;

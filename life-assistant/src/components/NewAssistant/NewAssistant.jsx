import React, { useEffect, useState } from "react";
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
  Progress,
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
} from "firebase/firestore";
import { database, vertexAI } from "../../firebaseResources/config";
import { getUser, updateUser } from "../../firebaseResources/store";
import { FadeInComponent } from "../../theme";
import { getGenerativeModel } from "@firebase/vertexai";

const analysisModel = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

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
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
    let analysisText = "";
    if (allDone) {
      try {
        const prompt = `Goal: ${userDoc?.mainGoal || goalInput}\nTasks completed:\n${tasks
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}\n\nBriefly review what was done well relative to the goal and suggest what could be improved.`;
        const result = await analysisModel.generateContent(prompt);
        analysisText = result.response.text();
      } catch (err) {
        console.error("analysis error", err);
      }
    }
    if (memoryId) {
      const memDoc = doc(database, "users", npub, "memories", memoryId);
      try {
        await updateDoc(memDoc, {
          completed: tasks.filter((_, i) => newCompleted[i]),
          incompleted: tasks.filter((_, i) => !newCompleted[i]),
          ...(allDone
            ? {
                finished: true,
                finishedAt: serverTimestamp(),
                analysis: analysisText,
              }
            : {}),
        });
      } catch (err) {
        console.error("update memory error", err);
      }
    }
    if (allDone) {
      setHistory((prev) => [
        { id: memoryId, tasks, analysis: analysisText, timestamp: startTime },
        ...prev,
      ]);
      startNewList();
    }
  };

  const startNewList = () => {
    setTasks([]);
    setCompleted({});
    setListCreated(false);
    setMemoryId(null);
    setStartTime(null);
    setProgress(100);
    setTimeString("");
    setListKey((k) => k + 1);
    localStorage.removeItem("draft_tasks");
  };

  if (loadingUser || loadingCurrent) {
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
      <VStack spacing={4} align="stretch" mt={4} key={listKey}>
        {listCreated && (
          <>
            <Text textAlign="center">{timeString}</Text>
            <Progress value={progress} size="sm" colorScheme="pink" />
          </>
        )}
        {/* {userDoc.mainGoal ? (
          <HStack justify="center">
            <Text fontWeight="bold">{userDoc.mainGoal}</Text>
          </HStack>
        ) : (
          <IconButton
            aria-label="Set goal"
            icon={<EditIcon />}
            size="sm"
            alignSelf="center"
            onClick={onGoalOpen}
          />
        )} */}

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
              {/* <Heading size="sm">Today</Heading> */}
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
              {history.length > 0 && (
                <Box mt={4}>
                  <Heading size="sm">History</Heading>
                  {history.map((h) => (
                    <Box
                      key={h.id}
                      borderWidth="1px"
                      p={2}
                      mt={2}
                      borderRadius="md"
                    >
                      {h.tasks.map((task, idx) => (
                        <Text key={idx}>{idx + 1}. {task}</Text>
                      ))}
                      {h.analysis && (
                        <Text mt={2} fontStyle="italic">
                          {h.analysis}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </>
          ))}
      </VStack>

      <Modal isOpen={isGoalOpen} onClose={onGoalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Your Main Goal</ModalHeader>
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

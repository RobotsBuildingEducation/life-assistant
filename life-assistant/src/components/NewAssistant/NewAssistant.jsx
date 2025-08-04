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
import { AddIcon, EditIcon } from "@chakra-ui/icons";
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
import { database } from "../../firebaseResources/config";
import { getUser, updateUser } from "../../firebaseResources/store";
import { RoleCanvas } from "../RoleCanvas/RoleCanvas";
import { FadeInComponent } from "../../theme";

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
  const [suggestion, setSuggestion] = useState("");
  const [memoryId, setMemoryId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [progress, setProgress] = useState(100);
  const [timeString, setTimeString] = useState("");
  const [history, setHistory] = useState([]);

  const roles = [
    "chores",
    "sphere",
    "plan",
    "meals",
    "finance",
    "sleep",
    "emotions",
    "counselor",
    "vacation",
  ];
  const [role, setRole] = useState("sphere");
  const {
    isOpen: isGoalOpen,
    onOpen: onGoalOpen,
    onClose: onGoalClose,
  } = useDisclosure();

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
        setSuggestion(current.suggestion || "");
        setStartTime(current.timestamp?.toDate());
        if ((current.tasks || []).length) {
          setListCreated(true);
        }
      }
      setHistory(past);
    })();
  }, [userDoc]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % roles.length;
      setRole(roles[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const createList = async () => {
    setCreating(true);
    const npub = localStorage.getItem("local_npub");
    const insight = `Tasks relate to goal: ${goalInput}`;
    try {
      const memRef = collection(database, "users", npub, "memories");
      const docRef = await addDoc(memRef, {
        tasks,
        completed: [],
        incompleted: tasks,
        suggestion: insight,
        timestamp: serverTimestamp(),
        finished: false,
      });
      setMemoryId(docRef.id);
      setSuggestion(insight);
    } catch (err) {
      console.error("create list error", err);
    }
    setCreating(false);
    setListCreated(true);
    setCompleted({});
    setStartTime(new Date());
    setProgress(100);
  };

  const toggleTask = async (index) => {
    const npub = localStorage.getItem("local_npub");
    const newCompleted = { ...completed, [index]: !completed[index] };
    setCompleted(newCompleted);
    const allDone = tasks.length && tasks.every((_, i) => newCompleted[i]);
    if (memoryId) {
      const memDoc = doc(database, "users", npub, "memories", memoryId);
      try {
        await updateDoc(memDoc, {
          completed: tasks.filter((_, i) => newCompleted[i]),
          incompleted: tasks.filter((_, i) => !newCompleted[i]),
          ...(allDone ? { finished: true, finishedAt: serverTimestamp() } : {}),
        });
      } catch (err) {
        console.error("update memory error", err);
      }
    }
    if (allDone) {
      setHistory((prev) => [
        { id: memoryId, tasks, suggestion, timestamp: startTime },
        ...prev,
      ]);
    }
  };

  const allTasksDone = tasks.length > 0 && tasks.every((_, i) => completed[i]);

  const startNewList = () => {
    setTasks([]);
    setCompleted({});
    setSuggestion("");
    setListCreated(false);
    setMemoryId(null);
    setStartTime(null);
    setProgress(100);
    setTimeString("");
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
      <FadeInComponent speed="0.5s">
        {/* <RoleCanvas role={"sphere"} width={50} height={50} color="#FF69B4" /> */}
      </FadeInComponent>
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
      <VStack spacing={4} align="stretch" mt={4}>
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
                  placeholder="What do you need to do?"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                />
                <IconButton icon={<AddIcon />} onClick={addTask} />
              </HStack>
              {tasks.map((t, i) => (
                <Text key={i}>
                  {i + 1}. {t}
                </Text>
              ))}
              <Button
                onClick={createList}
                isLoading={creating}
                disabled={!tasks.length}
              >
                Create List
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
              {suggestion && (
                <Box p={2} borderWidth="1px" mt={4} borderRadius="md">
                  <Text fontSize="sm">{suggestion}</Text>
                </Box>
              )}
              {allTasksDone && (
                <Button mt={4} onClick={startNewList}>
                  New List
                </Button>
              )}
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
                        <Text key={idx}>
                          {idx + 1}. {task}
                        </Text>
                      ))}
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

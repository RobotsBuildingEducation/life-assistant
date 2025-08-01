import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Input,
  IconButton,
  VStack,
  HStack,
  Text,
  Checkbox,
  Heading,
  Spinner,
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { database } from "../../firebaseResources/config";
import { getUser, updateUser } from "../../firebaseResources/store";
import { RoleCanvas } from "../RoleCanvas/RoleCanvas";
import { FadeInComponent } from "../../theme";

export const NewAssistant = () => {
  const [userDoc, setUserDoc] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [listCreated, setListCreated] = useState(false);
  const [completed, setCompleted] = useState({});
  const [suggestion, setSuggestion] = useState("");
  const [memoryId, setMemoryId] = useState(null);

  useEffect(() => {
    (async () => {
      const npub = localStorage.getItem("local_npub");
      const user = await getUser(npub);
      setUserDoc(user);
      setGoalInput(user?.mainGoal || "");
      setLoadingUser(false);
    })();
  }, []);

  const saveGoal = async () => {
    const npub = localStorage.getItem("local_npub");
    await updateUser(npub, { mainGoal: goalInput });
    setUserDoc((prev) => ({ ...(prev || {}), mainGoal: goalInput }));
    setEditingGoal(false);
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
      });
      setMemoryId(docRef.id);
      setSuggestion(insight);
    } catch (err) {
      console.error("create list error", err);
    }
    setCreating(false);
    setListCreated(true);
  };

  const toggleTask = async (index) => {
    const npub = localStorage.getItem("local_npub");
    const newCompleted = { ...completed, [index]: !completed[index] };
    setCompleted(newCompleted);
    if (memoryId) {
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
      <FadeInComponent speed="0.5s">
        <RoleCanvas role="sphere" width={400} height={400} color="#FF69B4" />
      </FadeInComponent>
      <VStack spacing={4} align="stretch" mt={4}>
        {!userDoc?.mainGoal || editingGoal ? (
          <HStack>
            <Input
              placeholder="Your main goal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
            />
            <Button onClick={saveGoal}>Save</Button>
          </HStack>
        ) : (
          <HStack>
            <Heading size="md">{userDoc.mainGoal}</Heading>
            <IconButton
              icon={<EditIcon />}
              size="sm"
              onClick={() => setEditingGoal(true)}
            />
          </HStack>
        )}

        {!listCreated ? (
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
              <Text key={i}>• {t}</Text>
            ))}
            <Button onClick={createList} isLoading={creating} disabled={!tasks.length}>
              Create List
            </Button>
          </>
        ) : (
          <>
            <Heading size="sm">Today</Heading>
            {tasks.map((t, i) => (
              <HStack key={i}>
                <Checkbox
                  isChecked={!!completed[i]}
                  onChange={() => toggleTask(i)}
                />
                <Text as={completed[i] ? "s" : undefined}>{t}</Text>
              </HStack>
            ))}
            {suggestion && (
              <Box p={2} borderWidth="1px" mt={4} borderRadius="md">
                <Text fontSize="sm">{suggestion}</Text>
              </Box>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
};

export default NewAssistant;

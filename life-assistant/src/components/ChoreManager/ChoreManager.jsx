import React, { useEffect, useState } from "react";
import { Box, Button, Spinner, Text, VStack, Heading } from "@chakra-ui/react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { database } from "../../firebaseResources/config";

/**
 * Expects each chore document under:
 *   users/{npub}/chores/{choreId}  with fields:
 *     - name: string
 *     - lastDone: Firestore Timestamp (or missing if never done)
 *     - intervalDays: number (e.g. 7 means repeat every 7 days)
 *
 * This component:
 * 1. Fetches all chores for current user.
 * 2. Computes “nextDue” = lastDone + intervalDays.
 *    If lastDone is missing, treat nextDue as now (i.e. due immediately).
 * 3. Finds the chore with the earliest nextDue (i.e. smallest Date value).
 * 4. Displays that chore as “Next Chore”, with a “Complete” button.
 * 5. When user clicks “Complete chore”, updates that chore’s lastDone to now,
 *    then refetches chores to recalculate the next one.
 */

export default function ChoreManager({ userDoc }) {
  const [loadingChores, setLoadingChores] = useState(true);
  const [chores, setChores] = useState([]);
  const [nextChore, setNextChore] = useState(null);
  const [updating, setUpdating] = useState(false);

  const npub = localStorage.getItem("local_npub");

  // Fetch chores from Firestore
  const loadChores = async () => {
    setLoadingChores(true);
    try {
      const choreRef = collection(database, "users", npub, "chores");
      // No particular ordering here; we'll compute nextDue in JS
      const choreSnap = await getDocs(query(choreRef, orderBy("name")));
      const fetched = choreSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setChores(fetched);
      computeNextChore(fetched);
    } catch (err) {
      console.error("Error loading chores:", err);
    }
    setLoadingChores(false);
  };

  // Compute which chore is due next
  const computeNextChore = (allChores) => {
    if (!allChores || allChores.length === 0) {
      setNextChore(null);
      return;
    }

    const now = new Date();

    // Map each chore to an object with a Date for nextDue
    const choresWithNextDue = allChores.map((chore) => {
      let lastDoneDate = null;
      if (chore.lastDone && chore.lastDone.toDate) {
        lastDoneDate = chore.lastDone.toDate();
      }
      // If never done, treat as due now
      if (!lastDoneDate) {
        return {
          ...chore,
          nextDue: now,
        };
      }
      // Compute next due = lastDone + intervalDays
      const nextDueDate = new Date(
        lastDoneDate.getTime() + chore.intervalDays * 24 * 60 * 60 * 1000
      );
      return {
        ...chore,
        nextDue: nextDueDate,
      };
    });

    // Sort by nextDue ascending
    choresWithNextDue.sort((a, b) => a.nextDue - b.nextDue);

    // Pick the first one whose nextDue <= now, or if none are overdue,
    // still pick the one with the earliest future due date
    setNextChore(choresWithNextDue[0] || null);
  };

  // Mark the next chore as done (update lastDone to now)
  const completeChore = async () => {
    if (!nextChore) return;
    setUpdating(true);
    try {
      const choreDocRef = doc(database, "users", npub, "chores", nextChore.id);
      await updateDoc(choreDocRef, {
        lastDone: serverTimestamp(),
      });
      // Optionally: write a “memory” entry for this completion
      // (uncomment if you want to keep track in “memories”)
      // const memRef = collection(database, "users", npub, "memories");
      // await addDoc(memRef, {
      //   dayNumber: memories.length + 1,
      //   suggestion: `Completed chore: ${nextChore.name}`,
      //   timestamp: serverTimestamp(),
      // });
      // Re-fetch chores to update next due
      await loadChores();
    } catch (err) {
      console.error("Error completing chore:", err);
    }
    setUpdating(false);
  };

  useEffect(() => {
    loadChores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadingChores) {
    return (
      <Box p={4} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (!chores || chores.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text>
          No chores found. Add chores under Firestore at “users/{npub}/chores”.
        </Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" maxW="500px" mx="auto">
      <Heading size="md" mb={4}>
        Chore Manager
      </Heading>
      {nextChore ? (
        <VStack spacing={4} align="start">
          <Text>
            <strong>Next Chore:</strong> {nextChore.name}
          </Text>
          <Text>
            <strong>Due On:</strong> {nextChore.nextDue.toLocaleDateString()}{" "}
            {nextChore.nextDue.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Button
            colorScheme="green"
            onClick={completeChore}
            isLoading={updating}
          >
            Complete chore
          </Button>
        </VStack>
      ) : (
        <Text>All chores are up to date!</Text>
      )}
    </Box>
  );
}

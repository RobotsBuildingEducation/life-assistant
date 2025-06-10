// src/components/PlanResult/PlanResult.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Spinner,
  useToast,
  NumberInput,
  NumberInputField,
} from "@chakra-ui/react";
import { updateUser } from "../../firebaseResources/store";
import { markdownTheme } from "../../theme";

export const PlanResult = ({
  userDoc,
  bestSuggestion,
  planText,
  loadingPlan,
  memories,
  onGeneratePlan,
}) => {
  const toast = useToast();

  const [profile, setProfile] = useState({
    goals: userDoc.goals || "",
    diet: userDoc.diet || "",
    education: userDoc.education || "",
    responsibilities: userDoc.responsibilities || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [planTitle, setPlanTitle] = useState(userDoc.planTitle || "");
  const [planLength, setPlanLength] = useState(userDoc.planLength || 1);

  const handleSaveProfile = async () => {
    if (!userDoc) return;
    setSavingProfile(true);
    try {
      await updateUser(userDoc.id, {
        goals: profile.goals,
        diet: profile.diet,
        education: profile.education,
        responsibilities: profile.responsibilities,
      });
      toast({ title: "Profile updated.", status: "success", duration: 3000 });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({ title: "Update failed.", status: "error", duration: 3000 });
    } finally {
      setSavingProfile(false);
    }
  };
  console.log("memories", memories);

  return (
    <Box mb={6} p={4} borderRadius="md" borderWidth="1px">
      <Heading size="sm" mb={2}>
        Edit Profile
      </Heading>
      <VStack align="start" spacing={4} mb={6}>
        <FormControl>
          <FormLabel>Goals</FormLabel>
          <Textarea
            value={profile.goals}
            onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Diet</FormLabel>
          <Input
            value={profile.diet}
            onChange={(e) => setProfile({ ...profile, diet: e.target.value })}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Education</FormLabel>
          <Input
            value={profile.education}
            onChange={(e) =>
              setProfile({ ...profile, education: e.target.value })
            }
          />
        </FormControl>
        <FormControl>
          <FormLabel>Responsibilities</FormLabel>
          <Textarea
            value={profile.responsibilities}
            onChange={(e) =>
              setProfile({ ...profile, responsibilities: e.target.value })
            }
          />
        </FormControl>
        <Button onClick={handleSaveProfile} isLoading={savingProfile}>
          Save Profile
        </Button>
      </VStack>

      <VStack align="start" spacing={4} mb={6}>
        <Button
          onClick={() => {
            if (typeof onGeneratePlan === "function") {
              onGeneratePlan();
            }
          }}
          isLoading={loadingPlan}>
          Generate Plan
        </Button>
      </VStack>

      {loadingPlan && !planText && (
        <Box p={4} textAlign="center">
          <Spinner />
        </Box>
      )}

      {planText && !bestSuggestion && (
        <Box
          mb={4}
          p={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
        >
          <ReactMarkdown components={markdownTheme}>{planText}</ReactMarkdown>
        </Box>
      )}

      {bestSuggestion && (
        <>
          <Heading size="sm" mb={2}>
            Current Objective
          </Heading>
          <Box
            mb={4}
            p={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
          >
            <ReactMarkdown components={markdownTheme}>
              {bestSuggestion}
            </ReactMarkdown>
          </Box>
        </>
      )}

      <Heading size="sm" mb={2}>
        Memories
      </Heading>
      <VStack align="start" spacing={3}>
        {memories.map((m) => (
          <Box key={m.id}>
            <Text fontWeight="bold">Day {m.dayNumber}</Text>
            <ReactMarkdown components={markdownTheme}>
              {m.suggestion}
            </ReactMarkdown>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

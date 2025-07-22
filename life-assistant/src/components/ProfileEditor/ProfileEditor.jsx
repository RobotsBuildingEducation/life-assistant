import React, { useState } from "react";
import { Box, Button, Input, Text, VStack, Heading } from "@chakra-ui/react";
import GlassBox from "../GlassBox";
import { updateUser } from "../../firebaseResources/store";
import { fieldOptions } from "../BudgetTool/BudgetTool";

const plannerFields = [
  {
    key: "goals",
    label: "Goals",
    placeholder: "e.g. Run a marathon",
  },
  {
    key: "responsibilities",
    label: "Responsibilities",
    placeholder: "e.g. Work, family",
  },
  {
    key: "diet",
    label: "Diet preferences",
    placeholder: "e.g. Vegetarian",
  },
  {
    key: "education",
    label: "Learning interests",
    placeholder: "e.g. Data science",
  },
  {
    key: "financialGoals",
    label: "Financial goals",
    placeholder: "e.g. Save for a house",
  },
];

const choreFields = [
  {
    key: "choreGoal",
    label: "Daily chore goal",
    placeholder: "e.g. 20",
  },
];

export default function ProfileEditor({ userDoc, onClose, onSave }) {
  const [data, setData] = useState(() => {
    const base = {
      budget: {},
    };
    plannerFields.forEach(({ key }) => {
      base[key] = userDoc?.[key] || "";
    });
    fieldOptions.forEach(({ key }) => {
      base.budget[key] = userDoc?.budgetPreferences?.[key] || "";
    });
    choreFields.forEach(({ key }) => {
      base[key] = userDoc?.[key] || "";
    });
    return base;
  });

  const handleChange = (key, nested) => (e) => {
    if (nested) {
      setData((prev) => ({
        ...prev,
        budget: { ...prev.budget, [key]: e.target.value },
      }));
    } else {
      setData((prev) => ({ ...prev, [key]: e.target.value }));
    }
  };

  const handleSave = async () => {
    const npub = localStorage.getItem("local_npub");
    await updateUser(npub, {
      goals: data.goals,
      responsibilities: data.responsibilities,
      diet: data.diet,
      education: data.education,
      financialGoals: data.financialGoals,
      choreGoal: data.choreGoal,
      budgetPreferences: data.budget,
    });
    if (onSave) onSave(data);
    if (onClose) onClose();
  };

  return (
    <GlassBox p={6} mt={4}>
      <VStack spacing={4} align="stretch">
        <Heading size="sm">Planner</Heading>
        {plannerFields.map(({ key, label, placeholder }) => (
          <Box key={key}>
            <Text fontWeight="bold" mb={1}>
              {label}
            </Text>
            <Input
              placeholder={placeholder}
              value={data[key]}
              onChange={handleChange(key)}
            />
          </Box>
        ))}

        <Heading size="sm" mt={4}>Finance</Heading>
        {fieldOptions.map(({ key, label, placeholder }) => (
          <Box key={key}>
            <Text fontWeight="bold" mb={1}>
              {label}
            </Text>
            <Input
              placeholder={placeholder}
              value={data.budget[key]}
              onChange={handleChange(key, true)}
            />
          </Box>
        ))}

        <Heading size="sm" mt={4}>Chores</Heading>
        {choreFields.map(({ key, label, placeholder }) => (
          <Box key={key}>
            <Text fontWeight="bold" mb={1}>
              {label}
            </Text>
            <Input
              placeholder={placeholder}
              value={data[key]}
              onChange={handleChange(key)}
            />
          </Box>
        ))}

        <Button onClick={handleSave}>Save</Button>
      </VStack>
    </GlassBox>
  );
}

import React, { useState } from "react";
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react";
import GlassBox from "../GlassBox";
import { updateUser } from "../../firebaseResources/store";

const fields = [
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

export default function ProfileEditor({ userDoc, onClose, onSave }) {
  const [data, setData] = useState(() => {
    const base = {};
    fields.forEach(({ key }) => {
      base[key] = userDoc?.[key] || "";
    });
    return base;
  });

  const handleChange = (key) => (e) => {
    setData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    const npub = localStorage.getItem("local_npub");
    await updateUser(npub, data);
    if (onSave) onSave(data);
    if (onClose) onClose();
  };

  return (
    <GlassBox p={6} mt={4}>
      <VStack spacing={4} align="stretch">
        {fields.map(({ key, label, placeholder }) => (
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

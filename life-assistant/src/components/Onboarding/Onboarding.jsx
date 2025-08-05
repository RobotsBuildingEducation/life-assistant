import React, { useState } from "react";
import { Box, Button, Textarea, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { PanRightComponent } from "../../theme";
import { updateUser } from "../../firebaseResources/store";

export const Onboarding = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");

  const handleSave = async () => {
    const npub = localStorage.getItem("local_npub");
    await updateUser(npub, { mainGoal: goal, step: "assistant" });
    navigate("/assistant");
  };

  return (
    <PanRightComponent speed="0.3s">
      <Box maxW="400px" mx="auto" mt={24} p={4}>
        <VStack spacing={6}>
          <Text fontSize="lg" fontWeight="bold">
            What is your main goal?
          </Text>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Run a marathon"
          />
          <Button onClick={handleSave} width="full" isDisabled={!goal.trim()}>
            Save Goal
          </Button>
        </VStack>
      </Box>
    </PanRightComponent>
  );
};


import React, { useState } from "react";
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react";
import { PanRightComponent } from "../../theme";
import { useNavigate, useParams } from "react-router-dom";
import { updateUser } from "../../firebaseResources/store";

// Onboarding steps for Personal Life Assistant
const steps = [
  {
    key: "goals",
    instruction: "What goals do you want to accomplish this year?",
    placeholder: "e.g. Run a marathon, learn Spanish, save for travel",
  },
  {
    key: "responsibilities",
    instruction: "What are your main responsibilities?",
    placeholder: "e.g. Work, family care, exercise",
  },
  {
    key: "diet",
    instruction: "Describe your dietary preferences or restrictions.",
    placeholder: "e.g. Vegetarian, gluten-free, high-protein",
  },
  {
    key: "education",
    instruction: "Which subjects or skills would you like to learn?",
    placeholder: "e.g. Data science, cooking, time management",
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const { step } = useParams();
  const stepNum = parseInt(step, 10);
  const stepIndex = stepNum - 1;
  const { key, instruction, placeholder } = steps[stepIndex] || {};

  const [inputValue, setInputValue] = useState("");

  const handleNext = async () => {
    const npub = localStorage.getItem("local_npub");
    if (stepIndex < steps.length - 1) {
      const nextStepNum = stepNum + 1;
      // Save current answer and advance step
      await updateUser(npub, {
        [key]: inputValue,
        onboardingStep: nextStepNum,
      });
      setInputValue("");
      navigate(`/onboarding/${nextStepNum}`);
    } else {
      // Final step: save last answer and complete onboarding
      await updateUser(npub, { [key]: inputValue, step: "assistant" });
      navigate("/assistant");
    }
  };

  if (!instruction) {
    return <Text>Invalid step.</Text>;
  }

  return (
    <PanRightComponent speed="0.3s">
      <Box maxW="400px" mx="auto" mt={24} p={4}>
        <VStack spacing={6}>
          <Text fontSize="lg" fontWeight="bold">
            {instruction}
          </Text>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
          />
          <Button onClick={handleNext} width="full">
            {stepIndex === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </VStack>
      </Box>
    </PanRightComponent>
  );
};

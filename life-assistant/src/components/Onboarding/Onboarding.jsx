import React, { useState } from "react";
import { Box, Button, Input, Text, VStack, Heading } from "@chakra-ui/react";
import { PanRightComponent } from "../../theme";
import { useNavigate, useParams } from "react-router-dom";
import { updateUser } from "../../firebaseResources/store";

// Onboarding steps for Personal Life Assistant
const steps = [
  {
    header: "Planner",
    key: "goals",
    instruction: "What goals do you want to accomplish this year?",
    placeholder: "e.g. Run a marathon, learn Spanish, save for travel",
  },
  {
    header: "Planner",
    key: "responsibilities",
    instruction: "What are your main responsibilities?",
    placeholder: "e.g. Work, family care, exercise",
  },
  {
    header: "Meals",
    key: "diet",
    instruction: "Describe your dietary preferences or restrictions.",
    placeholder: "e.g. Vegetarian, gluten-free, high-protein",
  },
  {
    header: "Planner",
    key: "education",
    instruction: "Which subjects or skills would you like to learn?",
    placeholder: "e.g. Data science, cooking, time management",
  },
  {
    header: "Finance",
    key: "financialGoals",
    instruction: "What are your financial goals?",
    placeholder: "e.g. Save for a house, pay off debt",
  },
  // Finance specific fields
  {
    header: "Finance",
    key: "incomeW2",
    path: "budgetPreferences.incomeW2",
    instruction: "Monthly income from W2",
    placeholder: "e.g. 3000",
  },
  {
    header: "Finance",
    key: "incomeBusiness",
    path: "budgetPreferences.incomeBusiness",
    instruction: "Monthly income from business",
    placeholder: "e.g. 2000",
  },
  {
    header: "Finance",
    key: "monthlyCosts",
    path: "budgetPreferences.monthlyCosts",
    instruction: "Monthly costs (rent, bills, food)",
    placeholder: "e.g. 1500",
  },
  {
    header: "Finance",
    key: "emergencyFund",
    path: "budgetPreferences.emergencyFund",
    instruction: "Emergency Fund",
    placeholder: "e.g. 20000",
  },
  {
    header: "Finance",
    key: "retirement",
    path: "budgetPreferences.retirement",
    instruction: "401k/IRA total",
    placeholder: "e.g. 20000",
  },
  {
    header: "Finance",
    key: "investments",
    path: "budgetPreferences.investments",
    instruction: "Value held in stocks and trades",
    placeholder: "e.g. 10000",
  },
  {
    header: "Finance",
    key: "collegeDebt",
    path: "budgetPreferences.collegeDebt",
    instruction: "College debt",
    placeholder: "e.g. 150000",
  },
  {
    header: "Finance",
    key: "creditCardDebt",
    path: "budgetPreferences.creditCardDebt",
    instruction: "Credit card debt",
    placeholder: "e.g. 5000",
  },
  {
    header: "Finance",
    key: "mortgage",
    path: "budgetPreferences.mortgage",
    instruction: "Mortgage remaining",
    placeholder: "e.g. 150000",
  },
  {
    header: "Finance",
    key: "propertyValue",
    path: "budgetPreferences.propertyValue",
    instruction: "Value of property",
    placeholder: "e.g. 200000",
  },
  {
    header: "Chores",
    key: "choreGoal",
    instruction: "Daily chore goal",
    placeholder: "e.g. 20",
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const { step } = useParams();
  const stepNum = parseInt(step, 10);
  const stepIndex = stepNum - 1;
  const { key, instruction, placeholder, header, path } = steps[stepIndex] || {};

  const [inputValue, setInputValue] = useState("");

  const handleNext = async () => {
    const npub = localStorage.getItem("local_npub");
    if (stepIndex < steps.length - 1) {
      const nextStepNum = stepNum + 1;
      // Save current answer and advance step
      await updateUser(npub, {
        [(path || key)]: inputValue,
        onboardingStep: nextStepNum,
      });
      setInputValue("");
      navigate(`/onboarding/${nextStepNum}`);
    } else {
      // Final step: save last answer and complete onboarding
      await updateUser(npub, { [(path || key)]: inputValue, step: "assistant" });
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
          {header && (
            <Heading size="md" mb={2} textAlign="center">
              {header}
            </Heading>
          )}
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

// src/components/PlanResult/PlanResult.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { markdownTheme } from "../../theme";
import GlassBox from "../GlassBox";

export const PlanResult = ({
  userDoc,
  bestSuggestion,
  planText,
  loadingPlan,
  memories,
  onGeneratePlan,
}) => {
  const navigate = useNavigate();
  console.log("memories", memories);

  return (
    <GlassBox
      mb={6}
      p={4}

      // borderWidth="1px"
      // border="1px solid #ff69b4"
      // boxShadow="0px 0px 12px 0px #ff69b4"
    >
      <Heading size="sm" mb={2}>
        Settings
      </Heading>
      <VStack align="start" spacing={4} mb={6}>
        <Button
          colorScheme="blue"
          onClick={() => navigate('/onboarding/1')}
        >
          Edit Profile
        </Button>
        <Button
          colorScheme="green"
          onClick={() => {
            if (typeof onGeneratePlan === 'function') {
              onGeneratePlan();
            }
          }}
          isLoading={loadingPlan}
        >
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
    </GlassBox>
  );
};

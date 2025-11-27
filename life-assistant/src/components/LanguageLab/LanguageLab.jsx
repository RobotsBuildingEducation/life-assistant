import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  HStack,
  Icon,
  Progress,
  Stack,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaBolt, FaCheck, FaForward, FaMagic } from "react-icons/fa";

const MotionBox = motion(Box);
const MotionStack = motion(Stack);

const ModuleBadge = ({ label }) => (
  <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
    {label}
  </Badge>
);

const pickRandomXp = (min = 4, max = 7) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const LanguageLab = () => {
  const [currentModule, setCurrentModule] = useState(0);
  const [realtimeIndex, setRealtimeIndex] = useState(0);
  const [realtimePassed, setRealtimePassed] = useState(false);
  const [storyTurns, setStoryTurns] = useState(0);
  const [storyXp, setStoryXp] = useState(0);
  const [storyAwarded, setStoryAwarded] = useState(false);
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [grammarSuccess, setGrammarSuccess] = useState(false);

  const modules = useMemo(
    () => [
      {
        id: "realtime",
        title: "Real-time Test",
        questions: [
          "Respond to the prompt in under 10 seconds.",
          "Keep your answer concise and friendly.",
          "Try answering without filler words.",
        ],
      },
      {
        id: "story",
        title: "Story / Roleplay",
      },
      {
        id: "grammar",
        title: "Grammar & Vocabulary",
        questions: [
          {
            prompt: "Choose the correct article: ___ apple a day keeps the doctor away.",
            answer: "An",
          },
          {
            prompt: "Pick the best synonym for 'quick'.",
            answer: "Rapid",
          },
        ],
      },
    ],
    []
  );

  const accent = useColorModeValue("purple.600", "purple.300");
  const cardBg = useColorModeValue("white", "gray.800");
  const successBg = useColorModeValue("green.50", "green.900");
  const successBorder = useColorModeValue("green.200", "green.600");
  const successText = useColorModeValue("green.700", "green.200");

  const goToNextModule = () =>
    setCurrentModule((prev) => Math.min(prev + 1, modules.length - 1));

  const handleRealtimeSuccess = () => setRealtimePassed(true);

  const handleRealtimeNext = () => {
    if (realtimePassed) {
      // Success state should behave like skip and jump forward
      setRealtimePassed(false);
      setRealtimeIndex(0);
      goToNextModule();
      return;
    }
    setRealtimeIndex((prev) => (prev + 1) % modules[0].questions.length);
  };

  const handleRealtimeSkip = () => {
    setRealtimePassed(false);
    setRealtimeIndex((prev) => (prev + 1) % modules[0].questions.length);
  };

  const completeStoryTurn = () => {
    setStoryTurns((prev) => prev + 1);
  };

  const finishStory = () => {
    if (!storyAwarded) {
      const earned = pickRandomXp();
      setStoryXp((prev) => prev + earned);
      setStoryAwarded(true);
    }
    goToNextModule();
  };

  const handleGrammarSuccess = () => setGrammarSuccess(true);

  const handleGrammarNext = () => {
    const nextIndex = (grammarIndex + 1) % modules[2].questions.length;
    setGrammarIndex(nextIndex);
    setGrammarSuccess(false);
    if (nextIndex === 0) {
      goToNextModule();
    }
  };

  const realtimeQuestion = modules[0].questions[realtimeIndex];
  const grammarQuestion = modules[2].questions[grammarIndex];

  return (
    <Box px={4} py={6} maxW="960px" mx="auto">
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="2xl">
            Language Lab
          </Text>
          <ModuleBadge label={modules[currentModule].title} />
        </HStack>

        <Progress
          value={((currentModule + 1) / modules.length) * 100}
          colorScheme="purple"
          borderRadius="full"
          height="10px"
        />

        {/* Real-time test */}
        <Card
          variant="outline"
          bg={cardBg}
          shadow="md"
          borderColor={currentModule === 0 ? accent : "gray.200"}
        >
          <CardBody as={VStack} align="stretch" spacing={3}>
            <HStack spacing={3}>
              <Icon as={FaBolt} color={accent} />
              <Text fontWeight="semibold">Real-time test</Text>
            </HStack>
            <Text color="gray.500" fontSize="sm">
              Beat the clock. When you succeed, the Next Question button now
              moves you forward just like Skip.
            </Text>
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={4}
              bg={useColorModeValue("gray.50", "gray.700")}
            >
              <Text fontWeight="semibold">Prompt</Text>
              <Text mt={1}>{realtimeQuestion}</Text>
              <HStack mt={4} spacing={3}>
                <Button colorScheme="green" onClick={handleRealtimeSuccess}>
                  Mark success
                </Button>
                <Button onClick={handleRealtimeSkip} variant="ghost">
                  Skip
                </Button>
                <Button onClick={handleRealtimeNext} rightIcon={<FaForward />}>
                  Next question
                </Button>
              </HStack>
              {realtimePassed ? (
                <Text mt={2} color="green.500" fontWeight="medium">
                  Nice! Next question now advances you to the next module.
                </Text>
              ) : null}
            </Box>
          </CardBody>
        </Card>

        {/* Story / roleplay */}
        <Card
          variant="outline"
          bg={cardBg}
          shadow="md"
          borderColor={currentModule === 1 ? accent : "gray.200"}
        >
          <CardBody as={VStack} align="stretch" spacing={3}>
            <HStack spacing={3}>
              <Icon as={FaMagic} color={accent} />
              <Text fontWeight="semibold">Story / Roleplay</Text>
            </HStack>
            <Text color="gray.500" fontSize="sm">
              XP is awarded once per story, between 4-7 XP, instead of per
              turn.
            </Text>
            <HStack spacing={3}>
              <Button onClick={completeStoryTurn} colorScheme="purple">
                Add a correct turn
              </Button>
              <Button onClick={finishStory} variant="outline">
                Finish story
              </Button>
            </HStack>
            <HStack spacing={4}>
              <Text color="gray.600">Correct turns: {storyTurns}</Text>
              <Divider orientation="vertical" height="30px" />
              <Text color="gray.600">XP earned: {storyXp}</Text>
              {storyAwarded ? (
                <Badge colorScheme="green" borderRadius="full" px={3}>
                  Reward locked in
                </Badge>
              ) : null}
            </HStack>
            <Text fontSize="xs" color="gray.500">
              XP only drops once per completed story session.
            </Text>
          </CardBody>
        </Card>

        {/* Grammar & vocab */}
        <Card
          variant="outline"
          bg={cardBg}
          shadow="md"
          borderColor={currentModule === 2 ? accent : "gray.200"}
        >
          <CardBody as={VStack} align="stretch" spacing={3}>
            <HStack spacing={3}>
              <Icon as={FaCheck} color={accent} />
              <Text fontWeight="semibold">Grammar & Vocabulary</Text>
            </HStack>
            <Text color="gray.500" fontSize="sm">
              Success badge and next-step action are combined into one animated
              panel beneath the question.
            </Text>
            <Text fontWeight="semibold">Question</Text>
            <Text>{grammarQuestion.prompt}</Text>
            <HStack>
              <Button colorScheme="green" onClick={handleGrammarSuccess}>
                Mark correct answer
              </Button>
              <Button variant="ghost" onClick={handleGrammarNext}>
                Next question
              </Button>
            </HStack>

            {grammarSuccess ? (
              <MotionStack
                direction={{ base: "column", md: "row" }}
                spacing={4}
                align="center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                bg={successBg}
                borderWidth="1px"
                borderColor={successBorder}
                borderRadius="md"
                p={4}
                mt={2}
                shadow="sm"
              >
                <MotionBox
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Badge
                    colorScheme="green"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    Nailed it!
                  </Badge>
                </MotionBox>
                <Text flex={1} color={successText} fontWeight="medium">
                  Smooth combo of your success badge and the next step below the
                  prompt.
                </Text>
                <Button
                  rightIcon={<FaForward />}
                  colorScheme="green"
                  variant="solid"
                  onClick={handleGrammarNext}
                >
                  Next question
                </Button>
              </MotionStack>
            ) : null}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default LanguageLab;

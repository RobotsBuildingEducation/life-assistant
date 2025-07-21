import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Box, Button, Heading, Textarea, Spinner } from "@chakra-ui/react";
import { getGenerativeModel } from "@firebase/vertexai";
import { vertexAI } from "../../firebaseResources/config";
import { markdownTheme } from "../../theme";
import GlassBox from "../GlassBox";

const vacationModel = getGenerativeModel(vertexAI, {
  model: "gemini-2.0-flash",
});

const VacationPlanner = () => {
  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setPlan("");
    try {
      const prompt = `Create a short vacation plan in markdown based on: "${idea}".`;
      const stream = await vacationModel.generateContentStream(prompt);
      let accumulated = "";
      for await (const chunk of stream.stream) {
        accumulated += chunk.text();
        setPlan(accumulated);
      }
    } catch (err) {
      console.error("Vacation plan error:", err);
    }
    setLoading(false);
  };

  return (
    <GlassBox p={4} mb={6} borderRadius="md">
      <Heading size="sm" mb={2}>
        Vacation Planner
      </Heading>
      <Textarea
        placeholder="Describe your vacation idea..."
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        mb={3}
      />
      <Button onClick={handleGenerate} isLoading={loading} mb={4}>
        Plan Vacation
      </Button>
      {loading && !plan && (
        <Box p={4} textAlign="center">
          <Spinner />
        </Box>
      )}
      {plan && (
        <Box mt={4}>
          <ReactMarkdown components={markdownTheme}>{plan}</ReactMarkdown>
        </Box>
      )}
    </GlassBox>
  );
};

export default VacationPlanner;

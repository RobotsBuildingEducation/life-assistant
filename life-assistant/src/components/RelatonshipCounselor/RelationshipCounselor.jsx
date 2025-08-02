// src/components/RelationshipCounselor/RelationshipCounselor.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  Box,
  Button,
  VStack,
  Text,
  Input,
  Textarea,
  Image,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { getGenerativeModel } from "@firebase/vertexai";
import { vertexAI } from "../../firebaseResources/config";
import { markdownTheme } from "../../theme";
import GlassBox from "../GlassBox";

export const RelationshipCounselor = ({ userDoc }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const toast = useToast();

  const visionModel = getGenerativeModel(vertexAI, {
    model: "gemini-2.0-flash",
  });

  const handleFileChange = (e) => {
    const filesArray = Array.from(e.target.files).slice(0, 15);
    setSelectedFiles(filesArray);

    previews.forEach(URL.revokeObjectURL);
    const objectUrls = filesArray.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);
  };

  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          const arrBuffer = reader.result;
          const uint8Arr = new Uint8Array(arrBuffer);
          let binary = "";
          uint8Arr.forEach((byte) => {
            binary += String.fromCharCode(byte);
          });
          resolve(btoa(binary));
        }
      };
      reader.readAsDataURL(file);
    });
    const base64Data = await base64EncodedDataPromise;
    return {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    };
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No images selected.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const basePrompt =
        `Analyze this conversation screenshot. Identify tone, emotions, and provide suggestions to improve communication.\n\nUser Profile:\n${JSON.stringify(
          userDoc || {},
          null,
          2
        )}`;
      const promptText = additionalContext
        ? `${additionalContext}\n\n${basePrompt}`
        : basePrompt;

      const imageParts = await Promise.all(
        selectedFiles.map((file) => fileToGenerativePart(file))
      );

      const requestPayload = [promptText, ...imageParts];
      const result = await visionModel.generateContent(requestPayload);
      const response = result.response;
      const analysisText = response.text();

      setAnalysisResult(analysisText);
    } catch (err) {
      console.error("Analysis error:", err);
      let errorMessage = "Analysis failed.";
      if (err.message) {
        errorMessage += ` Details: ${err.message}`;
      }
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    return () => {
      previews.forEach(URL.revokeObjectURL);
    };
  }, [previews]);

  return (
    <GlassBox p={4} borderRadius="md" boxShadow="sm" mb={6}>
      <VStack spacing={4} align="start">
        <Text fontSize="lg" fontWeight="bold">
          Relationship Counselor
        </Text>

        <Text fontSize="md">
          Upload screenshots and AI will analyze and guide you through a problem
          you're having. These uploads and what AI responds with are <b>not</b>{" "}
          stored in our database.
        </Text>

        <Textarea
          placeholder="Add any additional context here..."
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          rows={4}
        />

        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          key={
            selectedFiles.length === 0
              ? "file-input-empty"
              : "file-input-filled"
          }
        />

        {previews.length > 0 && (
          <Box>
            <Text fontWeight="semibold" mb={2}>
              Previews ({previews.length}/15):
            </Text>
            <VStack spacing={2} align="start">
              {previews.map((src, idx) => (
                <Image
                  key={idx}
                  src={src}
                  alt={`preview-${idx}`}
                  maxH="200px"
                  borderRadius="md"
                  objectFit="contain"
                  onError={(e) => (e.target.style.display = "none")}
                />
              ))}
            </VStack>
          </Box>
        )}
        <br />
        <br />
        <Button
          colorScheme="teal"
          onClick={handleAnalyze}
          isLoading={isAnalyzing}
          disabled={selectedFiles.length === 0 || isAnalyzing}
        >
          Analyze Conversation
        </Button>

        {/* {isAnalyzing && <Spinner size="md" thickness="4px" color="teal.500" />} */}

        {analysisResult && (
          <Box pt={4} borderWidth="1px" borderRadius="sm" p={3} w="100%">
            <Text fontWeight="semibold" mb={2}>
              Analysis Result:
            </Text>
            <ReactMarkdown components={markdownTheme}>
              {analysisResult}
            </ReactMarkdown>
          </Box>
        )}

        {/* <Button variant="ghost" onClick={onClose}>
          Close
        </Button> */}
      </VStack>
    </GlassBox>
  );
};

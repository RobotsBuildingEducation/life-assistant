import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  VStack,
  Stack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useColorMode,
} from "@chakra-ui/react";

import { useDecentralizedIdentity } from "../../hooks/useDecentralizedIdentity";
import { createUser, getUser } from "../../firebaseResources/store";
import { RoleCanvas } from "../RoleCanvas/RoleCanvas";

export const Landing = () => {
  const navigate = useNavigate();
  const [authField, setAuthField] = useState("");
  const [role, setRole] = useState("chores");
  const { colorMode, toggleColorMode } = useColorMode();

  // define the cycle of roles in the same order as RoleCanvas
  const roles = [
    "chores",
    "sphere",
    "plan",
    "meals",
    "finance",
    "sleep",
    "emotions",
    "counselor",
    "vacation",
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % roles.length;
      setRole(roles[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { nostrPubKey, generateNostrKeys, auth, errorMessage } =
    useDecentralizedIdentity(
      localStorage.getItem("local_npub"),
      localStorage.getItem("local_nsec")
    );

  useEffect(() => {
    const retrieveUser = async () => {
      const user = await getUser(nostrPubKey);

      if (user) {
        if (user.step === "onboarding") {
          navigate("/onboarding");
        } else {
          navigate("/assistant");
        }
      } else {
        await createUser(
          nostrPubKey,
          authField.includes("nsec") ? "" : authField
        );
        navigate("/onboarding");
      }
    };

    if (nostrPubKey) {
      retrieveUser();
    }
  }, [nostrPubKey]);

  return (
    <>
      <Box as="main" p={4} maxW="md" mx="auto">
        <VStack spacing={6} align="stretch">
          {/* RoleCanvas cycling through roles every 3s */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <RoleCanvas
              role={role}
              width={200}
              height={200}
              color={colorMode === "dark" ? "#FFF" : "#000"}
            />
          </div>
          <Heading as="h2" size="lg" textAlign="center" p={0} m={0}>
            16Hours
          </Heading>
          <Text textAlign="center" p={0} m={"-6"} mb={0}>
            Lock In & Focus On Your Goals
          </Text>

          <Box>
            <Text fontSize="xs">
              Most people struggle with procrastination, focus and completing
              tasks. 16 hours is an app to provide frameworks and tools to make
              those things easier.
            </Text>
          </Box>
          <FormControl>
            <FormLabel>Enter a username or secret key</FormLabel>
            <Input
              value={authField}
              onChange={(e) => setAuthField(e.target.value)}
              placeholder="Username or Secret Key"
            />
          </FormControl>

          <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
            <Button
              colorScheme="teal"
              onClick={() => generateNostrKeys(authField)}
            >
              Create Account
            </Button>
            <Button variant="outline" onClick={() => auth(authField)}>
              Sign in with secret key
            </Button>
          </Stack>

          {nostrPubKey && (
            <Text fontSize="md">
              Welcome,{" "}
              {authField.toLowerCase().startsWith("nsec")
                ? nostrPubKey.substring(0, 8)
                : authField}
            </Text>
          )}

          {errorMessage && (
            <Text color="red.500" fontSize="sm">
              {errorMessage}
            </Text>
          )}
        </VStack>
      </Box>
    </>
  );
};

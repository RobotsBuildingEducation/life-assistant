import { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import { glassStyles } from "../../theme";

import { useDecentralizedIdentity } from "../../hooks/useDecentralizedIdentity";
import { createUser, getUser } from "../../firebaseResources/store";

export const Landing = () => {
  const navigate = useNavigate();
  const [authField, setAuthField] = useState("");

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
          navigate("/onboarding/" + user.onboardingStep);
        } else {
          navigate("/assistant");
        }
      } else {
        // Create new user with either secret key or blank name
        await createUser(
          nostrPubKey,
          authField.includes("nsec") ? "" : authField
        );

        navigate("/onboarding/" + 1);
      }
    };

    if (nostrPubKey) {
      retrieveUser();
    }
  }, [nostrPubKey]);

  return (
    <>
      <Box as="main" p={8} maxW="md" mx="auto" mt={24} sx={glassStyles}>
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg" textAlign="center">
            Life Assistant
          </Heading>

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
            <Text fontSize="md">Welcome, {nostrPubKey.substring(0, 8)}</Text>
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

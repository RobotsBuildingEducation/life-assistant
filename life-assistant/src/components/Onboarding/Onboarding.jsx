import React, { useState } from "react";
import {
  Box,
  Button,
  Textarea,
  Text,
  VStack,
  HStack,
  Switch,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { PanRightComponent } from "../../theme";
import { updateUser } from "../../firebaseResources/store";
import { doc, updateDoc } from "firebase/firestore";
import { getToken, deleteToken } from "firebase/messaging";
import { database, messaging } from "../../firebaseResources/config";

export const Onboarding = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [notifications, setNotifications] = useState(false);

  const handleToggleNotifications = async () => {
    const userDocRef = doc(
      database,
      "users",
      localStorage.getItem("local_npub")
    );

    if (!notifications) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        try {
          const token = await getToken(messaging, {
            vapidKey:
              "BBaY424-8tpFPMhHbK-PIf53jYehVVFw75YV3peEq9DRDXBMh6Mvs5dThQMSZHLlVVMoUiIzbeUccfN2913dYSU",
          });
          await updateDoc(userDocRef, {
            fcmToken: token,
            notifications: true,
          });
          setNotifications(true);
        } catch (error) {
          console.error("Error retrieving FCM token:", error);
          setNotifications(false);
        }
      } else {
        console.log("Notification permission not granted.");
        setNotifications(false);
      }
    } else {
      try {
        const currentToken = await getToken(messaging, {
          vapidKey:
            "BBaY424-8tpFPMhHbK-PIf53jYehVVFw75YV3peEq9DRDXBMh6Mvs5dThQMSZHLlVVMoUiIzbeUccfN2913dYSU",
        });
        if (currentToken) {
          await deleteToken(messaging, currentToken);
        }
        await updateDoc(userDocRef, {
          fcmToken: null,
          notifications: false,
        });
      } catch (error) {
        console.error("Error deleting FCM token:", error);
      } finally {
        setNotifications(false);
      }
    }
  };

  const handleSave = async () => {
    const npub = localStorage.getItem("local_npub");
    await updateUser(npub, {
      mainGoal: goal,
      step: "assistant",
      notifications,
    });
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
          <HStack>
            <Text>Enable notifications</Text>
            <Switch
              isChecked={notifications}
              onChange={handleToggleNotifications}
            />
          </HStack>
          <Button onClick={handleSave} width="full" isDisabled={!goal.trim()}>
            Save Goal
          </Button>
        </VStack>
      </Box>
    </PanRightComponent>
  );
};

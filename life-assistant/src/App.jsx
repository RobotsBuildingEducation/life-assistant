// src/App.jsx

import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  IconButton,
  HStack,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Flex,
  Divider,
  Text,
  Link,
  Input,
  Select,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { FiGlobe, FiDownload, FiBell, FiShield } from "react-icons/fi";
import { FaPalette } from "react-icons/fa";
import { GiExitDoor } from "react-icons/gi";
import { IoShareOutline } from "react-icons/io5";
import { IoIosMore } from "react-icons/io";
import { BsPlusSquare } from "react-icons/bs";
import { LuBadgeCheck } from "react-icons/lu";

import { getUser, updateUser } from "./firebaseResources/store";
import { Onboarding } from "./components/Onboarding/Onboarding";
import { Landing } from "./components/Landing/Landing";
import { Assistant } from "./components/Assistant/Assistant";
import NewAssistant from "./components/NewAssistant/NewAssistant";
import { useDecentralizedIdentity } from "./hooks/useDecentralizedIdentity";
import { database, messaging } from "./firebaseResources/config";
import { doc, updateDoc } from "firebase/firestore";
import { getToken, deleteToken } from "firebase/messaging";
import { isUnsupportedBrowser } from "./utils/browser";

const ActionButton = ({ href, text }) => (
  <Button
    as="a"
    href={href}
    mt={2}
    mb={4}
    variant={"outline"}
    target="_blank"
    width="45%"
    margin={2}
    height={100}
    boxShadow="0.5px 0.5px 1px 0px rgba(0,0,0,0.75)"
    fontSize={"small"}
  >
    {text}
  </Button>
);

function App() {
  useDecentralizedIdentity(
    localStorage.getItem("local_npub"),
    localStorage.getItem("local_nsec")
  );
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Disclosure hooks for Network and Install modals
  const {
    isOpen: isPrivacyOpen,
    onOpen: onPrivacyOpen,
    onClose: onPrivacyClose,
  } = useDisclosure(); // NEW

  const {
    isOpen: isNetworkOpen,
    onOpen: onNetworkOpen,
    onClose: onNetworkClose,
  } = useDisclosure();
  const {
    isOpen: isInstallOpen,
    onOpen: onInstallOpen,
    onClose: onInstallClose,
  } = useDisclosure();
  const {
    isOpen: isThemeOpen,
    onOpen: onThemeOpen,
    onClose: onThemeClose,
  } = useDisclosure();
  const {
    isOpen: isNotificationsOpen,
    onOpen: onNotificationsOpen,
    onClose: onNotificationsClose,
  } = useDisclosure();

  const [selectedFont, setSelectedFont] = useState(
    localStorage.getItem("theme_font") || "'Inter', sans-serif"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Redirect based on user record (onboarding vs. assistant)
  useEffect(() => {
    const retrieveUser = async (npub) => {
      try {
        const user = await getUser(npub);
        if (user) {
          if (user.themeColor) {
            document.documentElement.style.setProperty(
              "--brand-color",
              user.themeColor
            );
            localStorage.setItem("theme_color", user.themeColor);
          }
          if (user.fontFamily) {
            document.documentElement.style.setProperty(
              "--font-family",
              user.fontFamily
            );
            localStorage.setItem("theme_font", user.fontFamily);
            setSelectedFont(user.fontFamily);
          }
          setNotificationsEnabled(!!user.notifications);
          if (user.step === "onboarding") {
            navigate("/onboarding");
          } else {
            navigate("/assistant");
          }
        } else {
          localStorage.clear();
          navigate("/login");
        }
      } catch (err) {
        console.error("Error retrieving user:", err);
        localStorage.clear();
        navigate("/login");
      }
    };

    const storedNpub = localStorage.getItem("local_npub");
    if (storedNpub) {
      retrieveUser(storedNpub);
    } else {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const saved = localStorage.getItem("theme_color");
    if (saved) {
      document.documentElement.style.setProperty("--brand-color", saved);
    }
    const font = localStorage.getItem("theme_font");
    if (font) {
      document.documentElement.style.setProperty("--font-family", font);
      setSelectedFont(font);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("local_npub");
    localStorage.removeItem("local_nsec");
    toast({
      title: "Signed out successfully.",
      status: "info",
      duration: 2000,
    });
    navigate("/login");
  };

  const handleCopyPubKey = () => {
    const pubkey = localStorage.getItem("local_npub") || "";
    navigator.clipboard.writeText(pubkey);
    toast({
      title: "ID copied to clipboard.",
      status: "success",
      duration: 2000,
    });
  };

  const handleCopySecret = () => {
    const secret = localStorage.getItem("local_nsec") || "";
    navigator.clipboard.writeText(secret);
    toast({
      title: "Secret key copied to clipboard.",
      status: "success",
      duration: 2000,
    });
  };
  const handleNotificationToggle = async (checked) => {
    setNotificationsEnabled(checked);
    const npub = localStorage.getItem("local_npub");
    try {
      await updateUser(npub, { notifications: checked });
    } catch (err) {
      console.error("Error updating notifications:", err);
    }

    const userDocRef = doc(database, "users", npub);

    if (checked) {
      // Enable notifications: request permission and get token
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        try {
          const token = await getToken(messaging, {
            vapidKey:
              "BPLqRrVM3iUvh90ENNZJbJA3FoRkvMql6iWtC4MJaHzhyz9uRTEitwEax9ot05_b6TPoCVnD-tlQtbeZFn1Z_Bg",
          });

          await updateDoc(userDocRef, { fcmToken: token });

          // Trigger a test notification 10 seconds after enabling
          setTimeout(() => {
            fetch(
              `https://us-central1-datachecking-7997c.cloudfunctions.net/sendTestNotification?token=${token}`
            ).catch((err) => console.error("Test notification failed", err));
          }, 10000);
        } catch (error) {
          console.error("Error retrieving FCM token:", error);
          setNotificationsEnabled(false);
          await updateUser(npub, { notifications: false });
        }
      } else {
        console.log("Notification permission not granted.");
        setNotificationsEnabled(false);
        await updateUser(npub, { notifications: false });
      }
    } else {
      // Disable notifications: delete the token and update Firestore
      try {
        const success = await deleteToken(messaging);
        if (!success) {
          console.error("Failed to delete token.");
        }
        await updateDoc(userDocRef, { fcmToken: null });
      } catch (error) {
        console.error("Error deleting FCM token:", error);
      }
    }
  };

  const handleSendTestNotification = async () => {
    try {
      const token = await getToken(messaging, {
        vapidKey:
          "BPLqRrVM3iUvh90ENNZJbJA3FoRkvMql6iWtC4MJaHzhyz9uRTEitwEax9ot05_b6TPoCVnD-tlQtbeZFn1Z_Bg",
      });
      await fetch(
        `https://us-central1-datachecking-7997c.cloudfunctions.net/sendTestNotification?token=${token}`
      );
    } catch (err) {
      console.error("Test notification failed", err);
    }
  };

  const updateThemeColor = (color) => {
    document.documentElement.style.setProperty("--brand-color", color);
    localStorage.setItem("theme_color", color);
    const npub = localStorage.getItem("local_npub");
    if (npub) {
      updateUser(npub, { themeColor: color });
    }
  };

  const updateThemeFont = (font) => {
    document.documentElement.style.setProperty("--font-family", font);
    localStorage.setItem("theme_font", font);
    setSelectedFont(font);
    const npub = localStorage.getItem("local_npub");
    if (npub) {
      updateUser(npub, { fontFamily: font });
    }
  };

  // Only show the header (icons) on assistant or archived assistant routes
  const showHeader = ["/assistant", "/archived/assistant"].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {showHeader && (
        <Box p={4}>
          <HStack spacing={3} justify="flex-end">
            <IconButton
              aria-label="Privacy"
              icon={<FiShield />}
              onClick={onPrivacyOpen}
            />{" "}
            {/* <ColorModeSwitcher /> */}
            <IconButton
              aria-label="Themes"
              icon={<FaPalette />}
              onClick={onThemeOpen}
            />
            <IconButton
              aria-label="Network"
              icon={<FiGlobe />}
              onClick={onNetworkOpen}
            />
            <IconButton
              aria-label="Install"
              icon={<FiDownload />}
              onClick={onInstallOpen}
            />
            <IconButton
              aria-label="Notifications"
              icon={<FiBell />}
              onClick={onNotificationsOpen}
            />
            {/* <IconButton
              aria-label="Test notification"
              icon={<LuBadgeCheck />}
              onClick={handleSendTestNotification}
            /> */}
            <IconButton
              aria-label="Sign out"
              icon={<GiExitDoor />}
              onClick={handleSignOut}
            />
          </HStack>
        </Box>
      )}

      {/* Notifications Modal */}
      <Modal
        isOpen={isNotificationsOpen}
        onClose={onNotificationsClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Notifications</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="notifications-toggle" mb="0">
                Enable notifications
              </FormLabel>
              <Switch
                id="notifications-toggle"
                isChecked={notificationsEnabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
                isDisabled={isUnsupportedBrowser()}
              />
            </FormControl>
            {isUnsupportedBrowser() ? (
              <Text mt={4}>
                The in-app browser you're using doesn't allow device
                notifications. Install the app to unlock this feature.
              </Text>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onMouseDown={onNotificationsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Network Modal */}
      <Modal isOpen={isNetworkOpen} onClose={onNetworkClose} isCentered>
        <ModalOverlay />
        <ModalContent textAlign="center">
          <ModalHeader>Decentralize</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Button
              onMouseDown={handleCopyPubKey}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleCopyPubKey();
                }
              }}
              mb={2}
            >
              🆔 Copy ID
            </Button>
            <Button
              onMouseDown={handleCopySecret}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleCopySecret();
                }
              }}
              mb={6}
            >
              🔑 Copy Secret Key
            </Button>
            <Divider mb={6} />

            <Flex direction="column" alignItems={"center"}>
              <ActionButton
                href={`https://primal.net/p/${localStorage.getItem(
                  "local_npub"
                )}`}
                text="Your Profile"
              />
              <ActionButton
                href="https://primal.net/home"
                text="Go To Social Wallet"
              />
              <ActionButton href="https://otherstuff.app" text="App Store" />
            </Flex>
            <Divider my={6} />
            <Link
              href="https://primal.net/p/npub14vskcp90k6gwp6sxjs2jwwqpcmahg6wz3h5vzq0yn6crrsq0utts52axlt"
              isExternal
              style={{ textDecoration: "underline" }}
            >
              Connect With Me
            </Link>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="ghost"
              onMouseDown={onNetworkClose}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onNetworkClose();
                }
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isInstallOpen} onClose={onInstallClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Install App</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction="column" pb={0}>
              <IoIosMore size={32} />
              <Text mt={2}>
                1. Open this page in your browser with the More Options button
              </Text>
            </Flex>
            <Divider my={6} />

            <Flex direction="column" pb={0}>
              <IoShareOutline size={32} />
              <Text mt={2}>2. Press the Share button</Text>
            </Flex>
            <Divider my={6} />

            <Flex direction="column" pb={0}>
              <BsPlusSquare size={32} />
              <Text mt={2}>3. Press the Add To Homescreen button</Text>
            </Flex>
            <Divider my={6} />

            <Flex direction="column" pb={0}>
              <LuBadgeCheck size={32} />
              <Text mt={2}>
                4. That's it! You don't need to download the app through an app
                store because we're using open-source standards called
                Progressive Web Apps.
              </Text>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="ghost"
              onMouseDown={onInstallClose}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onInstallClose();
                }
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isThemeOpen} onClose={onThemeClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Choose Theme Color</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <HStack mb={4} justify="center">
              {[
                "#00ff9c",
                "#ff007c",
                "#009cff",
                "#ffde00",
                "#ff8c00",
                "#8a2be2",
              ].map((c) => (
                <Button
                  key={c}
                  bg={c}
                  _hover={{ bg: c }}
                  onClick={() => updateThemeColor(c)}
                  height="30px"
                  width="30px"
                  minW="30px"
                  p={0}
                  borderRadius="full"
                />
              ))}
            </HStack>
            Or pick your own color
            <Input
              borderWidth="0px"
              type="color"
              aria-label="Custom color"
              onChange={(e) => updateThemeColor(e.target.value)}
            />
            <Text mt={4}>Choose Font</Text>
            <Select
              mt={2}
              value={selectedFont}
              onChange={(e) => updateThemeFont(e.target.value)}
            >
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
              <option value="'Poppins', sans-serif">Poppins</option>
              <option value="'Fira Code', monospace">Fira Code</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
              <option value="Georgia, serif">Georgia</option>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onMouseDown={onThemeClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPrivacyOpen} onClose={onPrivacyClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Privacy</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              we save the data you input to make AI responses better and more
              personalized. Your identity is private so we can't tell who
              anybody is.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onMouseDown={onPrivacyClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Routes>
        <Route path="/login" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/assistant" element={<NewAssistant />} />
        <Route path="/archived/assistant" element={<Assistant />} />
      </Routes>
    </>
  );
}

export default App;

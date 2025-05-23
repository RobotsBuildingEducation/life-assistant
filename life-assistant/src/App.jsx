import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { createUser, getUser, updateUser } from "./firebaseResources/store";
import { database } from "./firebaseResources/config";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { ColorModeSwitcher } from "./components/ColorModeSwitcher";
import { Onboarding } from "./components/Onboarding/Onboarding";
import { Landing } from "./components/Landing/Landing";
import { Assistant } from "./components/Assistant/Assistant";
import { useDecentralizedIdentity } from "./hooks/useDecentralizedIdentity";

function App() {
  const { nostrPubKey } = useDecentralizedIdentity(
    localStorage.getItem("local_npub"),
    localStorage.getItem("local_nsec")
  );
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Drawer state
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Profile modal state
  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();

  // Profile fields
  const [profile, setProfile] = useState({
    goals: "",
    diet: "",
    education: "",
    responsibilities: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch profile on mount
  useEffect(() => {
    if (!nostrPubKey) return;
    (async () => {
      try {
        const user = await getUser(nostrPubKey);
        if (user) {
          setProfile({
            goals: user.goals || "",
            diet: user.diet || "",
            education: user.education || "",
            responsibilities: user.responsibilities || "",
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [nostrPubKey]);

  // Navigation logic
  useEffect(() => {
    const retrieveUser = async (npub) => {
      let user = await getUser(npub);
      if (user) {
        if (user.step === "onboarding") {
          navigate("/onboarding/" + user.onboardingStep);
        } else {
          navigate("/assistant");
        }
      }
    };
    let npub = localStorage.getItem("local_npub");
    if (npub) {
      retrieveUser(npub);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("local_npub");
    localStorage.removeItem("local_nsec");
    navigate("/");
    onClose();
  };

  const handleProfileSave = async () => {
    try {
      await updateUser(nostrPubKey, profile);
      toast({ title: "Profile updated.", status: "success", duration: 3000 });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({ title: "Update failed.", status: "error", duration: 3000 });
    }
    onProfileClose();
  };

  const showMenu = ["/onboarding", "/assistant"].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {showMenu ? (
        <>
          {/* Fixed menu button */}
          <Button
            position="fixed"
            top="4"
            left="4"
            zIndex="overlay"
            onClick={onOpen}
            variant="ghost"
          >
            <HamburgerIcon w={6} h={6} />
          </Button>

          {/* Drawer with menu items */}
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader>Menu</DrawerHeader>
              <DrawerBody>
                <VStack align="start" spacing={4}>
                  <ColorModeSwitcher />
                  <Button variant="ghost" onClick={onProfileOpen}>
                    Edit Profile
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </VStack>
              </DrawerBody>
            </DrawerContent>
          </Drawer>

          {/* Profile edit modal */}
          <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Edit Profile</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                {!loadingProfile && (
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Goals</FormLabel>
                      <Textarea
                        value={profile.goals}
                        onChange={(e) =>
                          setProfile({ ...profile, goals: e.target.value })
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Responsibilities</FormLabel>
                      <Textarea
                        value={profile.responsibilities}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            responsibilities: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Diet</FormLabel>
                      <Input
                        value={profile.diet}
                        onChange={(e) =>
                          setProfile({ ...profile, diet: e.target.value })
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Education</FormLabel>
                      <Input
                        value={profile.education}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            education: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </VStack>
                )}
              </ModalBody>
              <ModalFooter>
                <Button mr={3} onClick={onProfileClose}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleProfileSave}>
                  Save
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      ) : (
        <ColorModeSwitcher />
      )}

      <Routes>
        <Route path="/login" element={<Landing />} />
        <Route path="/onboarding/:step" element={<Onboarding />} />
        <Route path="/assistant" element={<Assistant />} />
      </Routes>
    </>
  );
}

export default App;

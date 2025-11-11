// src/App.jsx

import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  IconButton,
  HStack,
  VStack,
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
  Input,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  FormHelperText,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { FiDownload, FiBell, FiShield, FiCopy, FiKey } from "react-icons/fi";
import { FaPalette } from "react-icons/fa";
import { GiExitDoor } from "react-icons/gi";
import { IoShareOutline, IoAppsOutline } from "react-icons/io5";
import { IoIosMore } from "react-icons/io";
import { BsPlusSquare } from "react-icons/bs";
import { LuBadgeCheck } from "react-icons/lu";

import {
  getUser,
  updateUser,
  listenToUserTeams,
  createTeam,
  acceptTeamInvite,
  declineTeamInvite,
  leaveTeam,
  deleteTeam,
} from "./firebaseResources/store";
import { Onboarding } from "./components/Onboarding/Onboarding";
import { Landing } from "./components/Landing/Landing";
import { Assistant } from "./components/Assistant/Assistant";
import NewAssistant from "./components/NewAssistant/NewAssistant";
import { useDecentralizedIdentity } from "./hooks/useDecentralizedIdentity";
import { database, messaging } from "./firebaseResources/config";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getToken, deleteToken } from "firebase/messaging";
import { isUnsupportedBrowser } from "./utils/browser";

function App() {
  useDecentralizedIdentity(
    localStorage.getItem("local_npub"),
    localStorage.getItem("local_nsec")
  );
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Disclosure hooks for app modals
  const {
    isOpen: isPrivacyOpen,
    onOpen: onPrivacyOpen,
    onClose: onPrivacyClose,
  } = useDisclosure(); // NEW

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
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } =
    useDisclosure();
  const {
    isOpen: isCreateTeamOpen,
    onOpen: onCreateTeamOpen,
    onClose: onCreateTeamClose,
  } = useDisclosure();
  const {
    isOpen: isViewTeamsOpen,
    onOpen: onViewTeamsOpen,
    onClose: onViewTeamsClose,
  } = useDisclosure();

  const [selectedFont, setSelectedFont] = useState(
    localStorage.getItem("theme_font") || "'Inter', sans-serif"
  );
  const [currentNpub, setCurrentNpub] = useState(
    () => localStorage.getItem("local_npub") || ""
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [invitees, setInvitees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamActionLoading, setTeamActionLoading] = useState({});
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamDetails, setTeamDetails] = useState({});
  const [userNameLookup, setUserNameLookup] = useState({});
  const nameFetchInFlight = useRef(new Set());

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
      setCurrentNpub(storedNpub);
    } else {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const syncNpub = () => {
      const latest = localStorage.getItem("local_npub") || "";
      setCurrentNpub((prev) => (prev !== latest ? latest : prev));
    };

    syncNpub();

    window.addEventListener("storage", syncNpub);
    window.addEventListener("focus", syncNpub);

    return () => {
      window.removeEventListener("storage", syncNpub);
      window.removeEventListener("focus", syncNpub);
    };
  }, []);

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
    setCurrentNpub("");
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

  useEffect(() => {
    if (!currentNpub) {
      setTeams([]);
      setTeamDetails({});
      return undefined;
    }

    const unsubscribe = listenToUserTeams(currentNpub, (snapshot) => {
      const memberships = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(memberships);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentNpub]);

  useEffect(() => {
    if (!isViewTeamsOpen) {
      return undefined;
    }

    const ids = Array.from(
      new Set(teams.map((team) => team.teamId).filter(Boolean))
    );

    if (ids.length === 0) {
      setTeamDetails({});
      return undefined;
    }

    const unsubscribers = ids.map((teamId) => {
      try {
        const teamRef = doc(database, "teams", teamId);
        return onSnapshot(
          teamRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setTeamDetails((prev) => ({
                ...prev,
                [teamId]: { id: teamId, ...snapshot.data() },
              }));
            } else {
              setTeamDetails((prev) => {
                const next = { ...prev };
                delete next[teamId];
                return next;
              });
            }
          },
          (error) => {
            console.error("Failed to fetch team details:", error);
          }
        );
      } catch (error) {
        console.error("Failed to subscribe to team details:", error);
        return undefined;
      }
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, [isViewTeamsOpen, teams]);

  useEffect(() => {
    const identifiers = new Set();

    teams.forEach((team) => {
      if (team?.owner) {
        identifiers.add(team.owner);
      }
      if (team?.invitedBy) {
        identifiers.add(team.invitedBy);
      }
    });

    Object.values(teamDetails).forEach((detail) => {
      if (!detail) {
        return;
      }
      const { owner, members, invites, memberData } = detail;
      if (owner) {
        identifiers.add(owner);
      }
      if (Array.isArray(members)) {
        members.forEach((member) => identifiers.add(member));
      }
      if (Array.isArray(invites)) {
        invites.forEach((invite) => identifiers.add(invite));
      }
      if (memberData && typeof memberData === "object") {
        Object.keys(memberData).forEach((member) => identifiers.add(member));
      }
    });

    identifiers.forEach((identifier) => {
      if (!identifier) {
        return;
      }
      if (userNameLookup[identifier] || nameFetchInFlight.current.has(identifier)) {
        return;
      }

      nameFetchInFlight.current.add(identifier);
      getUser(identifier)
        .then((userRecord) => {
          const resolvedName =
            (typeof userRecord?.name === "string" && userRecord.name.trim()) ||
            (typeof userRecord?.displayName === "string" &&
              userRecord.displayName.trim()) ||
            (typeof userRecord?.profile?.name === "string" &&
              userRecord.profile.name.trim()) ||
            "";

          setUserNameLookup((prev) => {
            const nextName = resolvedName || identifier;
            if (prev[identifier] === nextName) {
              return prev;
            }
            return {
              ...prev,
              [identifier]: nextName,
            };
          });
        })
        .catch((error) => {
          console.error("Failed to fetch teammate name:", error);
          setUserNameLookup((prev) => {
            if (prev[identifier]) {
              return prev;
            }
            return {
              ...prev,
              [identifier]: identifier,
            };
          });
        })
        .finally(() => {
          nameFetchInFlight.current.delete(identifier);
        });
    });
  }, [teams, teamDetails, userNameLookup]);

  const getDisplayName = (identifier) => {
    if (!identifier) {
      return "Unknown user";
    }
    const resolved = userNameLookup[identifier];
    if (typeof resolved === "string" && resolved.trim()) {
      return resolved.trim();
    }
    return identifier;
  };

  const handleOpenCreateTeam = () => {
    setTeamName("");
    setInviteInput("");
    setInvitees([]);
    onCreateTeamOpen();
  };

  const handleCloseCreateTeam = () => {
    setTeamName("");
    setInviteInput("");
    setInvitees([]);
    onCreateTeamClose();
  };

  const handleAddInvitee = () => {
    const trimmed = inviteInput.trim();
    if (!trimmed) {
      toast({
        title: "Enter an npub to invite.",
        status: "info",
        duration: 2000,
      });
      return;
    }

    if (invitees.includes(trimmed)) {
      toast({
        title: "You've already added that teammate.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    const currentNpub = localStorage.getItem("local_npub");
    if (currentNpub && currentNpub === trimmed) {
      toast({
        title: "You’re already on the team.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    setInvitees((prev) => [...prev, trimmed]);
    setInviteInput("");
  };

  const handleRemoveInvitee = (value) => {
    setInvitees((prev) => prev.filter((invite) => invite !== value));
  };

  const handleCreateTeam = async () => {
    const ownerNpub = localStorage.getItem("local_npub");
    if (!ownerNpub) {
      toast({
        title: "You need to be signed in to create a team.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      toast({
        title: "Team name cannot be empty.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    const ownsTeamWithName = teams.some(
      (team) =>
        team.role === "owner" &&
        team.name &&
        team.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (ownsTeamWithName) {
      toast({
        title: "You already have a team with that name.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    setIsCreatingTeam(true);
    try {
      await createTeam(ownerNpub, trimmedName, invitees);
      toast({
        title: "Team created.",
        status: "success",
        duration: 2000,
      });
      handleCloseCreateTeam();
    } catch (error) {
      console.error("Failed to create team:", error);
      toast({
        title: "Unable to create team.",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const setTeamLoading = (teamId, value) => {
    setTeamActionLoading((prev) => {
      const next = { ...prev };
      if (value) {
        next[teamId] = true;
      } else {
        delete next[teamId];
      }
      return next;
    });
  };

  const handleAcceptInvite = async (teamId) => {
    const npub = localStorage.getItem("local_npub");
    if (!npub) {
      toast({
        title: "You need to be signed in to accept invites.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    setTeamLoading(teamId, true);
    try {
      await acceptTeamInvite(npub, teamId);
      toast({
        title: "Joined team.",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to accept invite:", error);
      toast({
        title: "Unable to accept invite.",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setTeamLoading(teamId, false);
    }
  };

  const handleDeclineInvite = async (teamId) => {
    const npub = localStorage.getItem("local_npub");
    if (!npub) {
      toast({
        title: "You need to be signed in to decline invites.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    setTeamLoading(teamId, true);
    try {
      await declineTeamInvite(npub, teamId);
      toast({
        title: "Invite declined.",
        status: "info",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to decline invite:", error);
      toast({
        title: "Unable to decline invite.",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setTeamLoading(teamId, false);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    const npub = localStorage.getItem("local_npub");
    if (!npub) {
      toast({
        title: "You need to be signed in to leave a team.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    setTeamLoading(teamId, true);
    try {
      await leaveTeam(npub, teamId);
      toast({
        title: "Left team.",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to leave team:", error);
      toast({
        title: "Unable to leave team.",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setTeamLoading(teamId, false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    const npub = localStorage.getItem("local_npub");
    if (!npub) {
      toast({
        title: "You need to be signed in to delete a team.",
        status: "error",
        duration: 2000,
      });
      return;
    }

    const confirmDelete = window.confirm(
      "Deleting this team will remove it for everyone. Continue?"
    );

    if (!confirmDelete) {
      return;
    }

    setTeamLoading(teamId, true);
    try {
      await deleteTeam(npub, teamId);
      toast({
        title: "Team deleted.",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to delete team:", error);
      toast({
        title: "Unable to delete team.",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setTeamLoading(teamId, false);
    }
  };

  // Only show the header (icons) on assistant or archived assistant routes
  const showHeader = ["/assistant", "/archived/assistant"].some((path) =>
    location.pathname.startsWith(path)
  );

  const pendingInvites = teams.filter((team) => team.status === "invited");
  const activeTeams = teams.filter((team) => team.status === "active");
  const hasPendingInvites = pendingInvites.length > 0;

  return (
    <>
      {showHeader && (
        <Box position="fixed" top={4} right={4} zIndex={1400}>
          <IconButton
            aria-label="Open menu"
            icon={<IoAppsOutline />}
            onClick={onMenuOpen}
            variant="ghost"
            size="lg"
          />
        </Box>
      )}

      {showHeader && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          bg="gray.900"
          color="white"
          borderTopWidth="1px"
          borderColor="gray.700"
          py={3}
          px={4}
          boxShadow="0 -4px 16px rgba(0, 0, 0, 0.35)"
          zIndex={1300}
        >
          <HStack spacing={3} justify="center">
            <Button colorScheme="purple" onClick={handleOpenCreateTeam}>
              Create team
            </Button>
            <Button
              variant={hasPendingInvites ? "solid" : "outline"}
              colorScheme={hasPendingInvites ? "pink" : "whiteAlpha"}
              onClick={onViewTeamsOpen}
              boxShadow={
                hasPendingInvites
                  ? "0 0 0 3px rgba(236, 72, 153, 0.4)"
                  : undefined
              }
              fontWeight={hasPendingInvites ? "bold" : "normal"}
            >
              View team
              {hasPendingInvites ? ` (${pendingInvites.length})` : ""}
            </Button>
          </HStack>
        </Box>
      )}

      <Drawer placement="right" isOpen={isMenuOpen} onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <Button
                leftIcon={<FiCopy />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  handleCopyPubKey();
                }}
              >
                Copy ID
              </Button>
              <Button
                leftIcon={<FiKey />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  handleCopySecret();
                }}
              >
                Copy Secret Key
              </Button>
              <Divider />
              <Button
                leftIcon={<FiShield />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  onPrivacyOpen();
                }}
              >
                Privacy
              </Button>
              <Button
                leftIcon={<FaPalette />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  onThemeOpen();
                }}
              >
                Themes
              </Button>
              <Button
                leftIcon={<FiDownload />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  onInstallOpen();
                }}
              >
                Install
              </Button>
              <Button
                leftIcon={<FiBell />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  onNotificationsOpen();
                }}
              >
                Notifications
              </Button>
              <Button
                leftIcon={<GiExitDoor />}
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => {
                  onMenuClose();
                  handleSignOut();
                }}
              >
                Sign out
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer
        placement="bottom"
        isOpen={isCreateTeamOpen}
        onClose={handleCloseCreateTeam}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent borderTopRadius="xl">
          <DrawerCloseButton />
          <DrawerHeader>Create a team</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} pb={6}>
              <FormControl>
                <FormLabel>Team name</FormLabel>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter a team name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Invite teammates (npub)</FormLabel>
                <HStack>
                  <Input
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="npub..."
                  />
                  <Button onClick={handleAddInvitee}>Add</Button>
                </HStack>
                <FormHelperText>
                  Add teammates by their npub identifiers.
                </FormHelperText>
              </FormControl>
              {invitees.length > 0 && (
                <Wrap>
                  {invitees.map((invite) => (
                    <WrapItem key={invite}>
                      <Tag borderRadius="full" colorScheme="purple">
                        <TagLabel>{invite}</TagLabel>
                        <TagCloseButton
                          aria-label={`Remove ${invite}`}
                          onClick={() => handleRemoveInvitee(invite)}
                        />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
              <Button
                colorScheme="purple"
                onClick={handleCreateTeam}
                isLoading={isCreatingTeam}
                isDisabled={!teamName.trim()}
              >
                Create team
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer
        placement="bottom"
        isOpen={isViewTeamsOpen}
        onClose={onViewTeamsClose}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent borderTopRadius="xl">
          <DrawerCloseButton />
          <DrawerHeader>Teams</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={6} pb={6}>
              {pendingInvites.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Pending invites
                  </Text>
                  <VStack align="stretch" spacing={3}>
                    {pendingInvites.map((team) => (
                      <Box
                        key={team.id}
                        borderWidth="1px"
                        borderRadius="md"
                        p={3}
                      >
                        <Text fontWeight="semibold">{team.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          Invited by {getDisplayName(team.owner)}
                        </Text>
                        <HStack mt={3} spacing={2}>
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleAcceptInvite(team.teamId)}
                            isLoading={!!teamActionLoading[team.teamId]}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeclineInvite(team.teamId)}
                            isLoading={!!teamActionLoading[team.teamId]}
                          >
                            Decline
                          </Button>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              <Box>
                <Text fontWeight="bold" mb={2}>
                  Your teams
                </Text>
                {activeTeams.length === 0 ? (
                  <Text color="gray.500">No active teams yet.</Text>
                ) : (
                  <Accordion allowMultiple reduceMotion>
                    {activeTeams.map((team, teamIndex) => {
                      const detail = teamDetails[team.teamId] || {};
                      const members = detail.members || [];
                      const pending = detail.invites || [];
                      const memberSummaries = detail.memberData || {};
                      return (
                        <AccordionItem
                          key={team.id}
                          border="none"
                          mt={teamIndex === 0 ? 0 : 2}
                        >
                          <Box
                            borderWidth="1px"
                            borderRadius="md"
                            overflow="hidden"
                          >
                            <h3>
                              <AccordionButton
                                px={3}
                                py={2}
                                _expanded={{ bg: "gray.800", color: "white" }}
                              >
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="semibold">{team.name}</Text>
                                  <Text fontSize="xs" color="gray.400" mt={1}>
                                    Owner: {getDisplayName(team.owner)}
                                  </Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h3>
                            <AccordionPanel px={3} pb={4} pt={2}>
                          {members.length > 0 && (
                            <Box mt={2}>
                              <Text fontSize="sm" fontWeight="medium">
                                Members
                              </Text>
                              <Accordion allowMultiple reduceMotion mt={2}>
                                {members.map((member, memberIndex) => {
                                  const summary = memberSummaries[member] || {};
                                  const totalSignalScore = Number(
                                    summary.totalSignalScore ?? 0
                                  );
                                  const totalSignalSessions = Number(
                                    summary.totalSignalSessions ?? 0
                                  );
                                  const averageSignal =
                                    totalSignalSessions > 0
                                      ? Math.round(
                                          totalSignalScore / totalSignalSessions
                                        )
                                      : null;
                                  const lastSignalRaw = summary.lastTaskSignalScore;
                                  const lastTaskSignal =
                                    typeof lastSignalRaw === "number"
                                      ? lastSignalRaw
                                      : lastSignalRaw
                                      ? Number(lastSignalRaw)
                                      : null;
                                  const completedCount =
                                    typeof summary.lastCompletedTasksCount ===
                                    "number"
                                      ? summary.lastCompletedTasksCount
                                      : Array.isArray(summary.lastCompletedTasks)
                                      ? summary.lastCompletedTasks.length
                                      : null;
                                  const incompletedCount =
                                    typeof summary.lastIncompletedTasksCount ===
                                    "number"
                                      ? summary.lastIncompletedTasksCount
                                      : Array.isArray(summary.lastIncompletedTasks)
                                      ? summary.lastIncompletedTasks.length
                                      : null;
                                  const totalTasksCount =
                                    (completedCount || 0) +
                                    (incompletedCount || 0);
                                  const activeTaskCount = Number(
                                    summary.activeTaskCount ?? 0
                                  );
                                  const activeTaskStatus =
                                    summary.activeTaskStatus || "";
                                  const lastCompletedTasks = Array.isArray(
                                    summary.lastCompletedTasks
                                  )
                                    ? summary.lastCompletedTasks.filter(
                                        (task) =>
                                          typeof task === "string" && task.trim()
                                      )
                                    : [];
                                  const lastIncompletedTasks = Array.isArray(
                                    summary.lastIncompletedTasks
                                  )
                                    ? summary.lastIncompletedTasks.filter(
                                        (task) =>
                                          typeof task === "string" && task.trim()
                                      )
                                    : [];
                                  const lastTaskList = Array.isArray(
                                    summary.lastTaskList
                                  )
                                    ? summary.lastTaskList.filter(
                                        (task) =>
                                          typeof task === "string" && task.trim()
                                      )
                                    : [];
                                  const activeTaskList = Array.isArray(
                                    summary.activeTaskList
                                  )
                                    ? summary.activeTaskList.filter(
                                        (task) =>
                                          typeof task === "string" && task.trim()
                                      )
                                    : [];
                                  const teamSessionsRaw =
                                    summary.teamSessions &&
                                    typeof summary.teamSessions === "object" &&
                                    !Array.isArray(summary.teamSessions)
                                      ? Object.entries(summary.teamSessions)
                                      : [];
                                  const sessionEntries = teamSessionsRaw.map(
                                    ([sessionId, session]) => {
                                      const finishedAtValue = session?.finishedAt;
                                      const startedAtValue = session?.startedAt;
                                      const finishedAtDate =
                                        finishedAtValue &&
                                        typeof finishedAtValue.toDate === "function"
                                          ? finishedAtValue.toDate()
                                          : finishedAtValue instanceof Date
                                          ? finishedAtValue
                                          : null;
                                      const startedAtDate =
                                        startedAtValue &&
                                        typeof startedAtValue.toDate === "function"
                                          ? startedAtValue.toDate()
                                          : startedAtValue instanceof Date
                                          ? startedAtValue
                                          : null;
                                      const completedTasksList = Array.isArray(
                                        session?.completedTasks
                                      )
                                        ? session.completedTasks.filter(
                                            (task) =>
                                              typeof task === "string" && task.trim()
                                          )
                                        : [];
                                      const incompletedTasksList = Array.isArray(
                                        session?.incompletedTasks
                                      )
                                        ? session.incompletedTasks.filter(
                                            (task) =>
                                              typeof task === "string" && task.trim()
                                          )
                                        : [];
                                      const allTasksList = Array.isArray(
                                        session?.tasks
                                      )
                                        ? session.tasks.filter(
                                            (task) =>
                                              typeof task === "string" && task.trim()
                                          )
                                        : [];
                                      const signalScoreValue =
                                        typeof session?.signalScore === "number"
                                          ? Math.round(session.signalScore)
                                          : session?.signalScore !== undefined
                                          ? Number(session.signalScore)
                                          : null;
                                      return {
                                        sessionId,
                                        finishedAt: finishedAtDate,
                                        startedAt: startedAtDate,
                                        completedTasks: completedTasksList,
                                        incompletedTasks: incompletedTasksList,
                                        tasks: allTasksList,
                                        signalScore:
                                          signalScoreValue !== null &&
                                          !Number.isNaN(signalScoreValue)
                                            ? signalScoreValue
                                            : null,
                                        status:
                                          typeof session?.status === "string"
                                            ? session.status
                                            : "",
                                      };
                                    }
                                  );
                                  sessionEntries.sort(
                                    (a, b) =>
                                      (b.finishedAt?.getTime?.() || 0) -
                                      (a.finishedAt?.getTime?.() || 0)
                                  );
                                  const hasSessionHistory = sessionEntries.length > 0;
                                  const completedPreview =
                                    lastCompletedTasks.slice(0, 5);
                                  const incompletedPreview =
                                    lastIncompletedTasks.slice(0, 5);
                                  const moreCompleted =
                                    lastCompletedTasks.length -
                                    completedPreview.length;
                                  const moreIncompleted =
                                    lastIncompletedTasks.length -
                                    incompletedPreview.length;
                                  const hasLastTaskDetails =
                                    !hasSessionHistory &&
                                    (completedPreview.length > 0 ||
                                      incompletedPreview.length > 0 ||
                                      lastTaskList.length > 0);
                                  const activeTasksPreview =
                                    activeTaskList.slice(0, 5);
                                  const moreActiveTasks =
                                    activeTaskList.length -
                                    activeTasksPreview.length;
                                  const showActiveTaskList =
                                    activeTaskCount > 0 &&
                                    activeTasksPreview.length > 0;
                                  const hasSharedUpdate =
                                    averageSignal !== null ||
                                    lastTaskSignal !== null ||
                                    totalSignalScore > 0 ||
                                    activeTaskCount > 0 ||
                                    Boolean(summary.lastTaskStatus) ||
                                    hasSessionHistory ||
                                    hasLastTaskDetails;

                                  return (
                                    <AccordionItem
                                      key={member}
                                      border="none"
                                      mt={memberIndex === 0 ? 0 : 2}
                                    >
                                      <Box
                                        borderWidth="1px"
                                        borderRadius="md"
                                        borderColor="gray.700"
                                        overflow="hidden"
                                      >
                                        <h4>
                                          <AccordionButton
                                            px={3}
                                            py={2}
                                            _expanded={{ bg: "gray.900", color: "white" }}
                                          >
                                            <Box flex="1" textAlign="left">
                                              <HStack justify="space-between" align="center">
                                                <Text
                                                  fontWeight="semibold"
                                                  fontSize="sm"
                                                  wordBreak="break-all"
                                                >
                                                  {getDisplayName(member)}
                                                </Text>
                                                {member === team.owner && (
                                                  <Tag
                                                    size="sm"
                                                    colorScheme="purple"
                                                    borderRadius="full"
                                                  >
                                                    <TagLabel>Owner</TagLabel>
                                                  </Tag>
                                                )}
                                              </HStack>
                                            </Box>
                                            <AccordionIcon />
                                          </AccordionButton>
                                        </h4>
                                        <AccordionPanel px={3} pb={3} pt={2}>
                                          {hasSharedUpdate ? (
                                            <VStack align="stretch" spacing={1}>
                                          <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">
                                              Total signal
                                            </Text>
                                            <Text fontSize="sm" fontWeight="medium">
                                              {totalSignalSessions > 0
                                                ? Math.round(totalSignalScore)
                                                : "—"}
                                            </Text>
                                          </HStack>
                                          <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">
                                              Avg task signal
                                            </Text>
                                            <Text fontSize="sm" fontWeight="medium">
                                              {averageSignal !== null
                                                ? `${averageSignal}%`
                                                : "—"}
                                            </Text>
                                          </HStack>
                                          <HStack justify="space-between">
                                            <Text fontSize="xs" color="gray.500">
                                              Last task signal
                                            </Text>
                                            <Text fontSize="sm" fontWeight="medium">
                                              {lastTaskSignal !== null
                                                ? `${Math.round(lastTaskSignal)}%`
                                                : "—"}
                                            </Text>
                                          </HStack>
                                          {totalTasksCount > 0 && (
                                            <Text fontSize="xs" color="gray.500">
                                              Last session: {completedCount || 0} of {totalTasksCount} tasks completed
                                            </Text>
                                          )}
                                          {summary.lastTaskStatus && (
                                            <Text fontSize="xs" color="gray.400" mt={1}>
                                              “{summary.lastTaskStatus}”
                                            </Text>
                                          )}
                                          {hasSessionHistory ? (
                                            <Box mt={2}>
                                              <Text
                                                fontSize="xs"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                              >
                                                Session history
                                              </Text>
                                              <Accordion allowMultiple reduceMotion mt={1}>
                                                {sessionEntries.map((session, index) => {
                                                  const hasCompleted =
                                                    session.completedTasks.length > 0;
                                                  const hasIncompleted =
                                                    session.incompletedTasks.length > 0;
                                                  const fallbackTasks =
                                                    !hasCompleted &&
                                                    !hasIncompleted &&
                                                    session.tasks.length > 0
                                                      ? session.tasks
                                                      : [];
                                                  const timestampLabel =
                                                    session.finishedAt instanceof Date
                                                      ? session.finishedAt.toLocaleString()
                                                      : `Session ${index + 1}`;
                                                  const totalSessionTasks = session.tasks.length
                                                    ? session.tasks.length
                                                    : session.completedTasks.length +
                                                      session.incompletedTasks.length;
                                                  const completionSummary =
                                                    totalSessionTasks > 0
                                                      ? `Completed ${session.completedTasks.length} of ${totalSessionTasks}`
                                                      : null;
                                                  return (
                                                    <AccordionItem
                                                      key={`session-${member}-${session.sessionId}`}
                                                      border="none"
                                                      mt={index === 0 ? 0 : 2}
                                                    >
                                                      <Box
                                                        borderWidth="1px"
                                                        borderRadius="md"
                                                        borderColor="gray.700"
                                                        overflow="hidden"
                                                      >
                                                        <h4>
                                                          <AccordionButton
                                                            px={3}
                                                            py={2}
                                                            _expanded={{ bg: "gray.800", color: "white" }}
                                                          >
                                                            <Box flex="1" textAlign="left">
                                                              <Text
                                                                fontSize="xs"
                                                                fontWeight="semibold"
                                                                color="gray.500"
                                                              >
                                                                {timestampLabel}
                                                              </Text>
                                                              <HStack spacing={3} mt={1} flexWrap="wrap">
                                                                {session.signalScore !== null && (
                                                                  <Text fontSize="xs" color="green.300">
                                                                    {session.signalScore}% signal
                                                                  </Text>
                                                                )}
                                                                {completionSummary && (
                                                                  <Text fontSize="xs" color="gray.400">
                                                                    {completionSummary}
                                                                  </Text>
                                                                )}
                                                              </HStack>
                                                            </Box>
                                                            <AccordionIcon />
                                                          </AccordionButton>
                                                        </h4>
                                                        <AccordionPanel px={3} pb={3} pt={2}>
                                                          {session.status && (
                                                            <Text fontSize="xs" color="gray.400" mb={2}>
                                                              “{session.status}”
                                                            </Text>
                                                          )}
                                                          {hasCompleted && (
                                                            <Box mt={2}>
                                                              <Text
                                                                fontSize="xs"
                                                                color="green.300"
                                                                textTransform="uppercase"
                                                                letterSpacing="wide"
                                                              >
                                                                Completed
                                                              </Text>
                                                              <VStack align="stretch" spacing={1} mt={1}>
                                                                {session.completedTasks.map((task, taskIndex) => (
                                                                  <Text
                                                                    key={`session-${session.sessionId}-completed-${taskIndex}`}
                                                                    fontSize="xs"
                                                                    color="gray.200"
                                                                  >
                                                                    {task}
                                                                  </Text>
                                                                ))}
                                                              </VStack>
                                                            </Box>
                                                          )}
                                                          {hasIncompleted && (
                                                            <Box mt={2}>
                                                              <Text
                                                                fontSize="xs"
                                                                color="orange.300"
                                                                textTransform="uppercase"
                                                                letterSpacing="wide"
                                                              >
                                                                Still working
                                                              </Text>
                                                              <VStack align="stretch" spacing={1} mt={1}>
                                                                {session.incompletedTasks.map((task, taskIndex) => (
                                                                  <Text
                                                                    key={`session-${session.sessionId}-incompleted-${taskIndex}`}
                                                                    fontSize="xs"
                                                                    color="gray.200"
                                                                  >
                                                                    {task}
                                                                  </Text>
                                                                ))}
                                                              </VStack>
                                                            </Box>
                                                          )}
                                                          {fallbackTasks.length > 0 && (
                                                            <Box mt={2}>
                                                              <Text
                                                                fontSize="xs"
                                                                color="gray.500"
                                                                textTransform="uppercase"
                                                                letterSpacing="wide"
                                                              >
                                                                Tasks
                                                              </Text>
                                                              <VStack align="stretch" spacing={1} mt={1}>
                                                                {fallbackTasks.map((task, taskIndex) => (
                                                                  <Text
                                                                    key={`session-${session.sessionId}-task-${taskIndex}`}
                                                                    fontSize="xs"
                                                                    color="gray.200"
                                                                  >
                                                                    {task}
                                                                  </Text>
                                                                ))}
                                                              </VStack>
                                                            </Box>
                                                          )}
                                                        </AccordionPanel>
                                                      </Box>
                                                    </AccordionItem>
                                                  );
                                                })}
                                              </Accordion>
                                            </Box>
                                          ) : hasLastTaskDetails ? (
                                            <Box mt={2}>
                                              <Text
                                                fontSize="xs"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                              >
                                                Last session tasks
                                              </Text>
                                              <VStack align="stretch" spacing={1} mt={1}>
                                                {completedPreview.map((task, index) => (
                                                  <HStack
                                                    key={`completed-${member}-${index}`}
                                                    align="flex-start"
                                                    spacing={2}
                                                  >
                                                    <Text fontSize="xs" color="green.300" mt="1px">
                                                      ✓
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.200">
                                                      {task}
                                                    </Text>
                                                  </HStack>
                                                ))}
                                                {moreCompleted > 0 && (
                                                  <Text fontSize="xs" color="green.200">
                                                    +{moreCompleted} more completed
                                                  </Text>
                                                )}
                                                {incompletedPreview.map((task, index) => (
                                                  <HStack
                                                    key={`incompleted-${member}-${index}`}
                                                    align="flex-start"
                                                    spacing={2}
                                                  >
                                                    <Text fontSize="xs" color="orange.300" mt="1px">
                                                      •
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.200">
                                                      {task}
                                                    </Text>
                                                  </HStack>
                                                ))}
                                                {moreIncompleted > 0 && (
                                                  <Text fontSize="xs" color="orange.200">
                                                    +{moreIncompleted} more to finish
                                                  </Text>
                                                )}
                                                {lastTaskList.length > 0 &&
                                                  completedPreview.length === 0 &&
                                                  incompletedPreview.length === 0 && (
                                                    <VStack align="stretch" spacing={1}>
                                                      {lastTaskList.slice(0, 5).map((task, index) => (
                                                        <Text
                                                          key={`lasttask-${member}-${index}`}
                                                          fontSize="xs"
                                                          color="gray.200"
                                                        >
                                                          {task}
                                                        </Text>
                                                      ))}
                                                      {lastTaskList.length > 5 && (
                                                        <Text fontSize="xs" color="gray.300">
                                                          +{lastTaskList.length - 5} more
                                                        </Text>
                                                      )}
                                                    </VStack>
                                                  )}
                                              </VStack>
                                            </Box>
                                          ) : null}
                                          {showActiveTaskList ? (
                                            <Box mt={2}>
                                              <Text fontSize="xs" color="gray.500">
                                                Currently working on
                                              </Text>
                                              <VStack align="stretch" spacing={1} mt={1}>
                                                {activeTasksPreview.map((task, index) => (
                                                  <HStack
                                                    key={`active-${member}-${index}`}
                                                    align="flex-start"
                                                    spacing={2}
                                                  >
                                                    <Text fontSize="xs" color="cyan.300" mt="1px">
                                                      •
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.200">
                                                      {task}
                                                    </Text>
                                                  </HStack>
                                                ))}
                                                {moreActiveTasks > 0 && (
                                                  <Text fontSize="xs" color="cyan.200">
                                                    +{moreActiveTasks} more tasks
                                                  </Text>
                                                )}
                                              </VStack>
                                              {activeTaskStatus && (
                                                <Text fontSize="xs" color="gray.400" mt={1}>
                                                  Status: {activeTaskStatus}
                                                </Text>
                                              )}
                                            </Box>
                                          ) : (
                                            activeTaskCount > 0 && (
                                              <Text fontSize="xs" color="gray.500" mt={1}>
                                                Currently working on {activeTaskCount}{" "}
                                                {activeTaskCount === 1 ? "task" : "tasks"}
                                                {activeTaskStatus
                                                  ? ` — ${activeTaskStatus}`
                                                  : ""}
                                              </Text>
                                            )
                                          )}
                                            </VStack>
                                          ) : (
                                            <Text fontSize="xs" color="gray.500" mt={2}>
                                              No shared updates yet.
                                            </Text>
                                          )}
                                        </AccordionPanel>
                                      </Box>
                                    </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            </Box>
                          )}
                          {pending.length > 0 && (
                            <Box mt={2}>
                              <Text fontSize="sm" fontWeight="medium">
                                Pending invites
                              </Text>
                              <Wrap mt={1} spacing={2}>
                                {pending.map((invite) => (
                                  <WrapItem key={invite}>
                                    <Tag
                                      size="sm"
                                      borderRadius="full"
                                      colorScheme="yellow"
                                    >
                                      <TagLabel>{getDisplayName(invite)}</TagLabel>
                                    </Tag>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            </Box>
                          )}
                          <HStack mt={3} spacing={2} flexWrap="wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => handleLeaveTeam(team.teamId)}
                              isDisabled={team.role === "owner"}
                              isLoading={!!teamActionLoading[team.teamId]}
                            >
                              {team.role === "owner"
                                ? "Transfer ownership to leave"
                                : "Leave team"}
                            </Button>
                            {team.role === "owner" && (
                              <Button
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleDeleteTeam(team.teamId)}
                                isLoading={!!teamActionLoading[team.teamId]}
                              >
                                Delete team
                              </Button>
                            )}
                          </HStack>
                            </AccordionPanel>
                          </Box>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

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
                "#FFD6E8",
                "#C9E4DE",
                "#FFF1C1",
                "#E0BBE4",
                "#CDE7FF",
                "#F2C6DE",
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

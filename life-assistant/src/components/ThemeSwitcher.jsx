import React from "react";
import {
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  HStack,
  Box,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { FaPaintBrush } from "react-icons/fa";

const colorChoices = ["#00ff9b", "#ff00ff", "#00c8ff", "#ff8c00"];
const themeChoices = ["cyberpunk", "flat", "japanese", "glass"];

export const ThemeSwitcher = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const changeColor = (c) => {
    document.documentElement.style.setProperty("--accent", c);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", c);
  };

  const changeTheme = (t) => {
    const link = document.getElementById("theme-link");
    if (link) link.setAttribute("href", `/${t}.css`);
    onClose();
  };

  return (
    <>
      <IconButton
        aria-label="Theme settings"
        icon={<FaPaintBrush />}
        variant="ghost"
        onClick={onOpen}
      />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Choose Theme</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box mb={4}>
              <Text mb={2}>Accent Color</Text>
              <HStack>
                {colorChoices.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    bg={c}
                    onClick={() => changeColor(c)}
                    _hover={{ opacity: 0.8 }}
                  />
                ))}
              </HStack>
            </Box>
            <Box>
              <Text mb={2}>Theme</Text>
              <HStack wrap="wrap">
                {themeChoices.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    m={1}
                    onClick={() => changeTheme(t)}
                  >
                    {t}
                  </Button>
                ))}
              </HStack>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

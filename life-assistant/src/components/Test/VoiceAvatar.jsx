import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Center,
  HStack,
  Input,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';

// Optional Firebase init helper. It is safe to call even if the app
// has already been initialised elsewhere.
import { initializeApp, getApps, getApp } from 'firebase/app';

  const MAYBE_INIT_FIREBASE = () => {
    try {
      if (!getApps().length) {
        const firebaseConfig = window.__FIREBASE_CONFIG__ || null;
        if (!firebaseConfig) return null;
        return initializeApp(firebaseConfig);
      }
      return getApp();
    } catch {
      return null;
    }
  };

// A very small animated avatar that opens its mouth while "speaking".
function AvatarFace({ talking }) {
  return (
    <Box
      w="120px"
      h="120px"
      borderRadius="full"
      bg="gray.700"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        bottom="30px"
        left="50%"
        transform="translateX(-50%)"
        w="40px"
        h="10px"
        bg="red.400"
        borderRadius="md"
        transformOrigin="50% 100%"
        transition="transform 0.2s"
        style={{ transform: `translateX(-50%) scaleY(${talking ? 1 : 0.3})` }}
      />
    </Box>
  );
}

export default function VoiceAvatar() {
  MAYBE_INIT_FIREBASE();
  const [text, setText] = useState('');
  const [useWebSpeech, setUseWebSpeech] = useState(true);
  const [talking, setTalking] = useState(false);
  const audioCtxRef = useRef(null);

  const speak = (phrase) => {
    if (useWebSpeech && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.onstart = () => setTalking(true);
      utterance.onend = () => setTalking(false);
      speechSynthesis.speak(utterance);
    } else {
      // Fallback: simple beep so the avatar animation can be tested
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.connect(ctx.destination);
      osc.start();
      setTalking(true);
      setTimeout(() => {
        osc.stop();
        ctx.close();
        setTalking(false);
      }, 500);
    }
  };

  const handleEcho = () => {
    if (text.trim()) {
      speak(text.trim());
    }
  };

  return (
    <Center minH="100vh">
      <VStack spacing={6}>
        <AvatarFace talking={talking} />
        <HStack>
          <Input
            placeholder="Type something"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button onClick={handleEcho}>Echo</Button>
        </HStack>
        <HStack>
          <Text>Web Speech fallback</Text>
          <Switch
            isChecked={useWebSpeech}
            onChange={(e) => setUseWebSpeech(e.target.checked)}
          />
        </HStack>
      </VStack>
    </Center>
  );
}


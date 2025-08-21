import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Center,
  HStack,
  Input,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';

import { ai } from '../../firebaseResources/config';
import { getGenerativeModel } from 'firebase/ai';

// Helpers to handle audio returned from Gemini TTS
function b64ToUint8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcm16ToWav(pcm, sampleRate = 24000, channels = 1) {
  const blockAlign = channels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: 'audio/wav' });
}

const ttsModel = getGenerativeModel(ai, {
  model: 'gemini-2.5-flash-preview-tts',
});

// Simple animated avatar
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
  const toast = useToast();

  const [text, setText] = useState('');
  const [talking, setTalking] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(true);

  // Web Speech settings
  const [wsVoices, setWsVoices] = useState([]);
  const [wsVoice, setWsVoice] = useState('');
  const [wsRate, setWsRate] = useState(1);
  const [wsPitch, setWsPitch] = useState(1);

  // Gemini TTS settings
  const [gemVoice, setGemVoice] = useState('Puck');
  const [gemStyle, setGemStyle] = useState('');

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        setWsVoices(v);
        setWsVoice((prev) => prev || (v[0] && v[0].name) || '');
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakWithWebSpeech = (phrase) => {
    const utter = new SpeechSynthesisUtterance(phrase);
    const voice = wsVoices.find((v) => v.name === wsVoice);
    if (voice) utter.voice = voice;
    utter.rate = wsRate;
    utter.pitch = wsPitch;
    utter.onstart = () => setTalking(true);
    utter.onend = () => setTalking(false);
    window.speechSynthesis.speak(utter);
  };

  const speakWithGemini = async (phrase) => {
    try {
      setTalking(true);
      const res = await ttsModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: phrase }] }],
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: gemVoice },
          },
          style: gemStyle || undefined,
        },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
      });
      const audioB64 = res.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioB64) {
        const pcm = b64ToUint8(audioB64);
        const wav = pcm16ToWav(pcm);
        const url = URL.createObjectURL(wav);
        const audio = new Audio(url);
        audio.onended = () => {
          setTalking(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setTalking(false);
        toast({ title: 'No audio returned', status: 'error' });
      }
    } catch (e) {
      console.error(e);
      setTalking(false);
      toast({ title: 'TTS failed', status: 'error' });
    }
  };

  const handleEcho = () => {
    const phrase = text.trim();
    if (!phrase) return;
    if (useWebSpeech && 'speechSynthesis' in window) {
      speakWithWebSpeech(phrase);
    } else {
      speakWithGemini(phrase);
    }
  };

  return (
    <Center minH="100vh">
      <VStack spacing={6} w="full" maxW="md">
        <AvatarFace talking={talking} />
        <HStack w="full">
          <Input
            placeholder="Type something"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button onClick={handleEcho}>Send</Button>
        </HStack>

        <HStack>
          <Text>Use Web Speech</Text>
          <Switch
            isChecked={useWebSpeech}
            onChange={(e) => setUseWebSpeech(e.target.checked)}
          />
        </HStack>

        {useWebSpeech ? (
          <VStack w="full" align="stretch" spacing={4}>
            <Select value={wsVoice} onChange={(e) => setWsVoice(e.target.value)}>
              {wsVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </Select>
            <Box>
              <Text mb={2}>Rate: {wsRate.toFixed(1)}</Text>
              <Slider min={0.5} max={2} step={0.1} value={wsRate} onChange={setWsRate}>
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>
            <Box>
              <Text mb={2}>Pitch: {wsPitch.toFixed(1)}</Text>
              <Slider min={0} max={2} step={0.1} value={wsPitch} onChange={setWsPitch}>
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>
          </VStack>
        ) : (
          <VStack w="full" align="stretch" spacing={4}>
            <Select value={gemVoice} onChange={(e) => setGemVoice(e.target.value)}>
              <option value="Kore">Kore</option>
              <option value="Puck">Puck</option>
              <option value="Zephyr">Zephyr</option>
              <option value="Charon">Charon</option>
              <option value="Enceladus">Enceladus</option>
            </Select>
            <Input
              placeholder="Style hint (optional)"
              value={gemStyle}
              onChange={(e) => setGemStyle(e.target.value)}
            />
          </VStack>
        )}
      </VStack>
    </Center>
  );
}


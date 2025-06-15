import React from "react";
import { Box, Heading, Text, Stack, Select, Button } from "@chakra-ui/react";
import GlassBox from "../GlassBox";

const SleepCycleCalculator = ({
  sleepHour,
  sleepMinute,
  sleepAmPm,
  setSleepHour,
  setSleepMinute,
  setSleepAmPm,
  handleSleepNow,
  cycles,
}) => (
  <GlassBox mb={6} p={4} borderRadius="md">
    <Heading size="sm" mb={2}>
      Sleep Cycle Calculator
    </Heading>
    <Text mb={3} fontSize="md" lineHeight="tall">
      A sleep cycle is a roughly 90‑minute period during which your brain and
      body progress through different stages of sleep, including light sleep,
      deep sleep, and REM (dream) sleep. Completing full cycles helps you wake
      up feeling refreshed, reducing grogginess and improving cognitive
      performance.
    </Text>
    <Text fontSize="md" lineHeight="tall" mb={4}>
      By timing your bedtime and wake‑up moments to coincide with the end of a
      sleep cycle, you can optimize rest and alertness. Aim for 4–6 cycles per
      night (6–9 hours total) for most adults to maintain healthy sleep hygiene.
    </Text>
    <Stack direction="row" spacing={2} align="center" mb={4}>
      <Select
        width="80px"
        value={sleepHour}
        onChange={(e) => setSleepHour(e.target.value)}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={String(h)}>
            {h}
          </option>
        ))}
      </Select>
      <Select
        width="80px"
        value={sleepMinute}
        onChange={(e) => setSleepMinute(e.target.value)}
      >
        {Array.from({ length: 60 }, (_, i) =>
          i.toString().padStart(2, "0")
        ).map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </Select>
      <Select
        width="90px"
        value={sleepAmPm}
        onChange={(e) => setSleepAmPm(e.target.value)}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </Select>
      <Button onClick={handleSleepNow}>Sleep now</Button>
    </Stack>
    {cycles.length > 0 && (
      <Box mt={6}>
        {cycles.map((time, idx) => {
          const shade = 100 + (idx % 3) * 100;
          const color = idx < 3 ? `purple.${shade}` : `green.${shade}`;
          return (
            <Box
              key={idx}
              mb={4}
              borderLeft="4px solid"
              borderColor={color}
              pl={3}
            >
              <Text fontSize="md" fontWeight="bold" color={color}>
                Cycle {idx + 1}
              </Text>
              <Text fontSize="sm">{time}</Text>
            </Box>
          );
        })}
      </Box>
    )}
  </GlassBox>
);

export default SleepCycleCalculator;

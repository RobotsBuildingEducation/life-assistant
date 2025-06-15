import React from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";

const GlassBox = ({ children, ...props }) => {
  const bg = useColorModeValue(
    "rgba(255,255,255,0.6)",
    "rgba(255,255,255,0.08)"
  );
  const borderColor = useColorModeValue(
    "rgba(255,255,255,0.8)",
    "rgba(255,255,255,0.2)"
  );

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      backdropFilter="blur(30px)"
      boxShadow="0 4px 30px rgba(0,0,0,0.1)"
      {...props}
      borderRadius="24px"
    >
      {children}
    </Box>
  );
};

export default GlassBox;

// src/theme.js
import {
  extendTheme,
  Heading,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const config = {
  initialColorMode: "light", // or "dark" or "system"
  useSystemColorMode: false, // if true, will follow OS setting
};

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const glassBox = {
  backdropFilter: "blur(10px) saturate(180%)",
  WebkitBackdropFilter: "blur(10px) saturate(180%)",
  backgroundColor: "rgba(255, 255, 255, 0.4)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "1rem",
  boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
  transition: "background-color 0.3s ease",
  _dark: {
    backgroundColor: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
};

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "linear-gradient(120deg, #f6f9fc, #e9f0ff, #f6f9fc)",
        backgroundSize: "400% 400%",
        animation: `${gradientAnimation} 30s ease infinite`,
      },
      ".chakra-box": glassBox,
    },
  },
});

export const markdownTheme = {
  h1: (props) => <Heading as="h1" size="lg" my={4} mt={8} {...props} />,
  p: (props) => <Text mb={2} {...props} />,
  ul: (props) => <UnorderedList pl={4} mb={12} {...props} />,
  ol: (props) => <OrderedList pl={4} mb={12} {...props} />,
  li: (props) => <ListItem {...props} />,
};

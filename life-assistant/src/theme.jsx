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
  backdropFilter: "blur(20px) saturate(200%)",
  WebkitBackdropFilter: "blur(20px) saturate(200%)",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: "1rem",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  transition: "background-color 0.3s ease",
  _dark: {
    backgroundColor: "rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
};

export const glassStyles = glassBox;

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "linear-gradient(130deg, #e96443, #904e95, #3494e6, #6dd5ed)",
        backgroundSize: "800% 800%",
        animation: `${gradientAnimation} 40s ease infinite`,
      },
      ".chakra-box": glassBox,
      ".chakra-button": glassBox,
    },
  },
  components: {
    Button: {
      baseStyle: glassBox,
      variants: {
        glass: glassBox,
      },
      defaultProps: {
        variant: "glass",
      },
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

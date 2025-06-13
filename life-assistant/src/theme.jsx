// src/theme.js
import {
  extendTheme,
  Heading,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from "@chakra-ui/react";

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const fonts = {
  heading: "'Fira Code', monospace",
  body: "'Fira Code', monospace",
};

const styles = {
  global: {
    body: {
      bg: "transparent",
      color: "var(--accent)",
    },
    button: {
      transition: "all 0.2s",
      _hover: {
        transform: "translateY(-2px)",
        boxShadow: "0 0 8px rgba(0,255,155,0.7)",
      },
    },
  },
};

const colors = {
  brand: {
    500: "var(--accent)",
    700: "#ff00ff",
  },
};

export const theme = extendTheme({ config, fonts, styles, colors });

export const markdownTheme = {
  h1: (props) => <Heading as="h1" size="lg" my={4} mt={8} {...props} />,
  p: (props) => <Text mb={2} {...props} />,
  ul: (props) => <UnorderedList pl={4} mb={12} {...props} />,
  ol: (props) => <OrderedList pl={4} mb={12} {...props} />,
  li: (props) => <ListItem {...props} />,
};

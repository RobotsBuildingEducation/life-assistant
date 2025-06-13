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
      background: "var(--bg)",
      color: "var(--text-color)",
    },
    button: {
      transition: "all 0.2s",
      border: "1px solid var(--accent)",
      boxShadow: "0 0 6px var(--accent)",
      _hover: {
        transform: "translateY(-2px)",
        bg: "var(--accent)",
        color: "#000",
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

const components = {
  ModalContent: {
    baseStyle: {
      background: "var(--box-bg)",
      border: "var(--box-border)",
      boxShadow: "var(--box-shadow)",
    },
  },
};

export const theme = extendTheme({ config, fonts, styles, colors, components });

export const markdownTheme = {
  h1: (props) => <Heading as="h1" size="lg" my={4} mt={8} {...props} />,
  p: (props) => <Text mb={2} {...props} />,
  ul: (props) => <UnorderedList pl={4} mb={12} {...props} />,
  ol: (props) => <OrderedList pl={4} mb={12} {...props} />,
  li: (props) => <ListItem {...props} />,
};

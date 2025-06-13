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
      bg: "#0d0d0d",
      color: "#f0f0f0",
    },
  },
};

const colors = {
  brand: {
    500: "#00ff9b",
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

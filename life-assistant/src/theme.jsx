// src/theme.js
import {
  Box,
  extendTheme,
  Heading,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";
import { keyframes } from "@emotion/react";

const config = {
  initialColorMode: "dark", // or "dark" or "system"
  useSystemColorMode: false, // if true, will follow OS setting
};

export const styles = {
  global: (props) => ({
    ":root": {
      "--brand-color": localStorage.getItem("theme_color") || "#7ddbb6",
    },
    body: {
      // cypherpunk inspired colors
      bg: mode("#f0f0f0", "#0d0d0d")(props),
      color: mode("#000", "var(--brand-color)")(props),
      backgroundColor: mode("#f0f0f0", "rgba(0,0,34)")(props),
      fontFamily: "'Courier New', monospace",
    },
  }),
};

export const theme = extendTheme({
  config,
  styles,
  fonts: {
    heading: "'Courier New', monospace",
    body: "'Courier New', monospace",
  },
  colors: {
    cyber: {
      500: "var(--brand-color)",
      600: "var(--brand-color)",
      900: "#0d0d0d",
    },
  },
  components: {
    Button: {
      variants: {
        solid: {
          bg: "cyber.500",
          color: "#000",
          _hover: { bg: "cyber.600" },
        },
        outline: {
          borderColor: "cyber.500",
          color: "cyber.500",
          _hover: { bg: "cyber.500", color: "#000" },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: "cyber.500",
            _focus: {
              borderColor: "cyber.500",
              boxShadow: "0 0 0 1px var(--brand-color)",
            },
          },
        },
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

export const riseAnimation = keyframes`
  from {
    transform: translateY(25px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const panLeft = keyframes`
from {
  transform: translateX(-25px);
}
to {
  transform: translateX(0); // Adjust as needed
}
`;

export const panRight = keyframes`
  from {
    transform: translateX(25px);
  }
  to {
    transform: translateX(0); // Adjust as needed
  }
`;

// Create the FadeInComponent using Chakra UI
export const PanRightComponent = ({ children, speed = "0.15s" }) => {
  return (
    <Box
      display="flex"
      justifyContent={"center"}
      animation={`${panRight} ${speed} ease-in-out`} // Apply the animation with dynamic speed
    >
      {children}
    </Box>
  );
};

// Create the FadeInComponent using Chakra UI
export const PanLeftComponent = ({ children, speed = "0.15s" }) => {
  return (
    <Box
      display="flex"
      justifyContent={"center"}
      animation={`${panLeft} ${speed} ease-in-out`} // Apply the animation with dynamic speed
    >
      {children}
    </Box>
  );
};

// Create the FadeInComponent using Chakra UI
export const RiseUpAnimation = ({ children, speed = "0.15s" }) => {
  return (
    <Box
      display="flex"
      justifyContent={"center"}
      animation={`${riseAnimation} ${speed} ease-in-out`} // Apply the animation with dynamic speed
    >
      {children}
    </Box>
  );
};

// Create the FadeInComponent using Chakra UI
export const FadeInComponent = ({ children, speed = "0.15s" }) => {
  return (
    <Box
      display="flex"
      justifyContent={"center"}
      animation={`${fadeInAnimation} ${speed} ease-in`} // Apply the animation with dynamic speed
    >
      {children}
    </Box>
  );
};

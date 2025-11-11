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
  initialColorMode: "light", // default to light theme
  useSystemColorMode: false, // if true, will follow OS setting
};

export const styles = {
  global: () => ({
    ":root": {
      "--brand-color": localStorage.getItem("theme_color") || "#000000",
      "--font-family":
        localStorage.getItem("theme_font") || "'Inter', sans-serif",
    },
    body: {
      bg: "bg.canvas",
      color: "text.primary",
      backgroundColor: "bg.canvas",
      fontFamily: "var(--font-family)",
    },
  }),
};

export const theme = extendTheme({
  config,
  styles,
  semanticTokens: {
    colors: {
      "bg.canvas": {
        default: "gray.50",
        _dark: "gray.900",
      },
      "bg.surface": {
        default: "white",
        _dark: "gray.800",
      },
      "text.primary": {
        default: "gray.800",
        _dark: "gray.100",
      },
      "border.default": {
        default: "gray.200",
        _dark: "gray.700",
      },
      "shadow.focus": {
        default: "rgba(26, 32, 44, 0.45)",
        _dark: "rgba(226, 232, 240, 0.45)",
      },
    },
  },
  fonts: {
    heading: "var(--font-family)",
    body: "var(--font-family)",
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
        solid: (props) => ({
          bg: mode("gray.900", "gray.100")(props),
          color: mode("white", "gray.900")(props),
          _hover: {
            bg: mode("black", "gray.200")(props),
          },
          _active: {
            bg: mode("gray.800", "gray.300")(props),
          },
        }),
        outline: (props) => ({
          borderColor: mode("gray.900", "gray.100")(props),
          color: mode("gray.900", "gray.100")(props),
          _hover: {
            bg: mode("gray.900", "gray.100")(props),
            color: mode("white", "gray.900")(props),
          },
        }),
      },
    },
    Input: {
      variants: {
        outline: (props) => {
          const focusColor = mode("#1a202c", "#edf2f7")(props);
          return {
            field: {
              borderColor: mode("gray.300", "gray.600")(props),
              bg: mode("white", "gray.800")(props),
              color: mode("gray.900", "gray.100")(props),
              _placeholder: {
                color: mode("gray.500", "gray.400")(props),
              },
              _focus: {
                borderColor: mode("gray.900", "gray.100")(props),
                boxShadow: `0 0 0 1px ${focusColor}`,
              },
            },
          };
        },
      },
    },
    Select: {
      variants: {
        outline: (props) => {
          const focusColor = mode("#1a202c", "#edf2f7")(props);
          return {
            field: {
              borderColor: mode("gray.300", "gray.600")(props),
              bg: mode("white", "gray.800")(props),
              color: mode("gray.900", "gray.100")(props),
              _focus: {
                borderColor: mode("gray.900", "gray.100")(props),
                boxShadow: `0 0 0 1px ${focusColor}`,
              },
            },
          };
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
      flexDirection="column"
      alignItems="center"
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

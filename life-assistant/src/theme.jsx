import {
  extendTheme,
  Heading,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { mode } from "@chakra-ui/theme-tools";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

// Smooth gradient animation for the body
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Subtle particle overlay animation
const particleAnimation = keyframes`
  0% { background-position: 0% 0%, 0% 0%, 0% 0%; }
  33% { background-position: 50% 25%, 75% 50%, 25% 75%; }
  66% { background-position: 25% 75%, 50% 50%, 75% 25%; }
  100% { background-position: 0% 0%, 0% 0%, 0% 0%; }
`;

// Layered radial gradients for particles
const lightParticles = `
  radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 20%),
  radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 15%),
  radial-gradient(circle at 50% 80%, rgba(255,255,255,0.18) 0%, transparent 18%)
`;
const darkParticles = `
  radial-gradient(circle at 30% 40%, rgba(255,255,255,0.1) 0%, transparent 25%),
  radial-gradient(circle at 70% 25%, rgba(255,255,255,0.08) 0%, transparent 20%),
  radial-gradient(circle at 60% 75%, rgba(255,255,255,0.12) 0%, transparent 22%)
`;

// Glassmorphic card styles with more transparency
const glassBox = {
  backdropFilter: "blur(20px) saturate(30%)",
  WebkitBackdropFilter: "blur(20px) saturate(30%)",
  backgroundColor: "rgba(1, 1, 1, 0.08)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "1rem",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
  _dark: {
    backgroundColor: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
  },
};

// Interactive variation: animate blur and background gradient on hover
const interactiveGlass = {
  ...glassBox,
  backgroundColor: "rgba(255,255,255,0.05)",
  _dark: {
    ...glassBox._dark,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  transition:
    "transform 0.2s ease, backdrop-filter 0.3s ease, background-color 0.3s ease",
  _hover: {
    transform: "scale(1.02)",
    backdropFilter: "blur(35px) saturate(40%)",
    WebkitBackdropFilter: "blur(35px) saturate(40%)",
    backgroundColor: "rgba(255,255,255,0.15)",
    animation: `${gradientAnimation} 10s ease infinite`,
  },
  _active: {
    transform: "scale(0.97)",
    backdropFilter: "blur(25px) saturate(35%)",
    WebkitBackdropFilter: "blur(25px) saturate(35%)",
  },
};

// Stronger gaussian blur for overlay surfaces like modals and menus
export const surfaceGlass = {
  ...glassBox,
  backdropFilter: "blur(30px)",
  WebkitBackdropFilter: "blur(40px)",
  backgroundColor: "rgba(255,255,255,0.2)",
  _dark: {
    ...glassBox._dark,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
};

export const glassStyles = glassBox;

export const theme = extendTheme({
  config,
  styles: {
    global: (props) => ({
      body: {
        // Animated, more vibrant background gradient
        bg: mode(
          "linear-gradient(130deg, #ffffff 0%, #e0f7ff 20%,rgb(222, 232, 239) 40%,rgb(245, 251, 255) 60%,rgb(227, 243, 251) 80%,rgb(240, 248, 255) 100%)",
          "linear-gradient(130deg, #020024 0%,rgb(5, 3, 13) 20%,rgb(13, 0, 43) 40%,rgb(10, 5, 21) 60%,rgb(34, 30, 41) 80%,rgb(51, 45, 59) 100%)"
        )(props),
        backgroundSize: "800% 800%",
        animation: `${gradientAnimation} 20s ease infinite`,
        position: "relative",
        overflow: "hidden",
      },
      "body::before": {
        content: '""',
        position: "fixed",
        top: 0,
        left: 0,
        width: "200%",
        height: "200%",
        bg: mode(lightParticles, darkParticles)(props),
        backgroundSize: "300% 300%",
        animation: `${particleAnimation} 60s ease-in-out infinite`,
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.3,
      },
      ".chakra-box": glassBox,
      ".chakra-button": interactiveGlass,
      ".chakra-input": glassBox,
      ".chakra-textarea": glassBox,
      ".chakra-modal__content": surfaceGlass,
      ".chakra-menu__menu-list": {
        // ...glassBox,
        // backgroundColor: "red",
        backdropFilter: "blur(100px) saturate(30%)",
        WebkitBackdropFilter: "blur(100px) saturate(30%)",
        backgroundColor: "rgba(255, 255, 255, 1)",
        border: "1px solid rgba(255,255,255,1)",
        borderRadius: "1rem",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 1)",
        transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
        _dark: {
          backgroundColor: "rgba(0,0,0,1)",
          border: "1px solid rgba(255,255,255,1)",
        },
      },
      ".chakra-menu__menuitem": interactiveGlass,
    }),
  },
  components: {
    Button: {
      baseStyle: surfaceGlass,
      variants: { glass: surfaceGlass },
      defaultProps: { variant: "glass" },
    },
    Modal: { baseStyle: { dialog: glassBox } },
    Menu: {
      baseStyle: {
        // list: glassBox
        list: {
          // border: "2px solid red",
          // ...glassBox,
        },
      },
    },
    Input: { baseStyle: { field: glassBox } },
    Textarea: { baseStyle: { textarea: glassBox } },
  },
});

export const markdownTheme = {
  h1: (props) => <Heading as="h1" size="lg" my={4} mt={8} {...props} />,
  p: (props) => <Text mb={2} {...props} />,
  ul: (props) => <UnorderedList pl={4} mb={12} {...props} />,
  ol: (props) => <OrderedList pl={4} mb={12} {...props} />,
  li: (props) => <ListItem {...props} />,
};

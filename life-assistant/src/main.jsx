// src/main.jsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import App from "./App.jsx";
import { theme } from "./theme";
import { initStarfield } from "./starfield";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <>
    {/* Makes sure initial colorMode flashes correctly */}
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </>
);
initStarfield();


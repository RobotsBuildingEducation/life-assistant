import React, { useRef, useEffect } from "react";
import { Noise } from "noisejs";

// Convert hex color to RGB array
function hexToRGB(hex) {
  let cleaned = hex.replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return [
    parseInt(cleaned.substr(0, 2), 16),
    parseInt(cleaned.substr(2, 2), 16),
    parseInt(cleaned.substr(4, 2), 16),
  ];
}

// Fractal Brownian Motion (fBm) helper
function fbm(noise, x, y, octaves = 4, persistence = 0.5) {
  let total = 0,
    frequency = 1,
    amplitude = 1,
    maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise.perlin2(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return total / maxValue;
}

export const CloudCanvas = ({
  alternativeSpeed = null,
  isLoader = false,
  hasAnimation = true,
  hasInitialFade = true,
  outlineColor = "#000",
  outlineWidth = 0,
}) => {
  const canvasRef = useRef(null);
  let requestId;

  // Initialize noise and palette
  const noise = new Noise(Math.random());
  const cloudPalette = ["#f2dcfa", "#f9d4fa", "#fca4b3", "#fcb7a4", "#fcd4a4"];
  const cloudPaletteRGB = cloudPalette.map(hexToRGB);
  const groupOffsets = [0, 10, 20, 30, 40];
  const groupPhases = [0, 1.5, 3, 4.5, 6];
  const beta = 10;
  const scale = 2;

  useEffect(() => {
    if (!hasAnimation) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Resize to fill viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Draw the clouds and shape
    const draw = () => {
      const now = Date.now();
      const timeShape = now * (alternativeSpeed ?? 0.0025);
      const timeCloud = now * 0.00015;

      // Shape outline (optional)
      ctx.beginPath();
      // ...you can rebuild your dynamic shape here if desired...
      ctx.closePath();

      // Generate cloud gradient offscreen
      const offCanvas = document.createElement("canvas");
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      const offCtx = offCanvas.getContext("2d");
      const size = offCanvas.width;
      const imageData = offCtx.createImageData(size, size);
      const data = imageData.data;
      const centerX = size / 2;
      const centerY = size / 2;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const rNorm = Math.sqrt(dx * dx + dy * dy) / centerX;
          const nx = dx / centerX;
          const ny = dy / centerX;
          let weights = [];
          let weightSum = 0;
          for (let i = 0; i < cloudPaletteRGB.length; i++) {
            const noiseVal = fbm(
              noise,
              nx * scale + timeCloud + groupOffsets[i],
              ny * scale + timeCloud + groupOffsets[i]
            );
            const radial = (1 - rNorm) * Math.sin(timeCloud + groupPhases[i]);
            const score = noiseVal + radial;
            const w = Math.exp(beta * score);
            weights.push(w);
            weightSum += w;
          }
          for (let i = 0; i < weights.length; i++) {
            weights[i] /= weightSum;
          }
          let rColor = 0,
            gColor = 0,
            bColor = 0;
          for (let i = 0; i < weights.length; i++) {
            rColor += weights[i] * cloudPaletteRGB[i][0];
            gColor += weights[i] * cloudPaletteRGB[i][1];
            bColor += weights[i] * cloudPaletteRGB[i][2];
          }
          const idx = (y * size + x) * 4;
          data[idx] = rColor;
          data[idx + 1] = gColor;
          data[idx + 2] = bColor;
          data[idx + 3] = 255;
        }
      }
      offCtx.putImageData(imageData, 0, 0);

      // Fill main canvas
      const pattern = ctx.createPattern(offCanvas, "no-repeat");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = pattern;
      ctx.fill();

      // Optional outline
      if (outlineWidth > 0) {
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      }
    };

    // Animation loop
    const animate = () => {
      draw();
      requestId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(requestId);
      window.removeEventListener("resize", resize);
    };
  }, [hasAnimation, alternativeSpeed, outlineColor, outlineWidth]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
};

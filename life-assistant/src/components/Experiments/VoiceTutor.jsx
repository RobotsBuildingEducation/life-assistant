import React, { useEffect, useRef, useState } from "react";

export default function VoiceTutor() {
  const [recording, setRecording] = useState(false);
  const [aiText, setAiText] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const mouthRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const open = Math.min(1, rms * 12);
      if (mouthRef.current) {
        mouthRef.current.style.transform = `scaleY(${0.3 + open})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    const unlock = () => ctx.resume().catch(() => {});
    el.addEventListener("play", unlock, { once: true });
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener("play", unlock);
      analyser.disconnect();
      src.disconnect();
      ctx.close();
    };
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    chunksRef.current = [];
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = sendTurn;
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current && mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const sendTurn = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const base64 = await blobToBase64(blob);
    const resp = await fetch(import.meta.env.VITE_FUNCTION_URL || "/voiceTurn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm" }),
    });
    const data = await resp.json();
    setAiText(data.aiText);
    if (audioRef.current) {
      const audioUrl = `data:${data.audioMimeType};base64,${data.audioBase64}`;
      audioRef.current.src = audioUrl;
      try {
        await audioRef.current.play();
      } catch {
        // ignore
      }
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh", gap: 16 }}>
      <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "#222",
            position: "relative",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 42,
              width: 80,
              height: 8,
              background: "#fff",
              borderRadius: 4,
            }}
          />
          <div
            ref={mouthRef}
            style={{
              position: "absolute",
              bottom: 36,
              width: 44,
              height: 10,
              background: "#ff5a5f",
              borderRadius: 6,
              transformOrigin: "50% 100%",
            }}
          />
        </div>
        <p style={{ maxWidth: 420, textAlign: "center", opacity: 0.8 }}>{aiText}</p>
        {!recording ? (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{ padding: "14px 18px", borderRadius: 12, fontSize: 16 }}
          >
            Press & hold to talk
          </button>
        ) : (
          <button
            onMouseUp={stopRecording}
            onTouchEnd={stopRecording}
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              fontSize: 16,
              background: "#ffdf8b",
            }}
          >
            Release to send
          </button>
        )}
      </div>
      <audio ref={audioRef} playsInline />
    </div>
  );
}

async function blobToBase64(blob) {
  const arr = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  arr.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}


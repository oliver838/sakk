// PumpkinOverlay.jsx (GPU + optimized framerate)
import React, { useEffect, useRef } from "react";
import "./pumpkin.css";
import { usePumpkins } from "./PumpkinContext.jsx";

export const PumpkinOverlay = () => {
  const { showPumpkins, muted, setMuted } = usePumpkins();
  const audioRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!showPumpkins) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const lines = Array.from({ length: 3000 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      width: 20 + Math.random() * 80,
      height: 0.5 + Math.random() * 1.2,
      opacity: 0.1 + Math.random() * 0.8,
      speed: 0.5 + Math.random() * 0.8,
    }));

    let last = 0;
    const fps = 20; // kb. 12–24 fps közé
    const interval = 1000 / fps;

    const draw = (ts) => {
      if (ts - last < interval) return requestAnimationFrame(draw);
      last = ts;

      ctx.clearRect(0, 0, w, h);

      for (const l of lines) {
        const grad = ctx.createLinearGradient(l.x, l.y, l.x + l.width, l.y);
        grad.addColorStop(0, "rgba(197, 94, 255, 0.1)");
        grad.addColorStop(0.5, "rgba(255, 120, 255, 0.5)");
        grad.addColorStop(1, "rgba(197, 94, 255, 0.1)");
        ctx.fillStyle = grad;
        ctx.globalAlpha =
          l.opacity * (0.5 + Math.sin(ts * 0.005 * l.speed) * 0.5);
        ctx.fillRect(l.x, l.y, l.width, l.height);
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);

    // --- audio rész ---
    const audio = audioRef.current;
    if (audio) {
      audio.loop = true;
      audio.preload = "auto";
      audio.muted = muted;
      const tryPlay = () => {
        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            const resume = () => {
              audio.play().catch(() => {});
              document.removeEventListener("pointerdown", resume);
            };
            document.addEventListener("pointerdown", resume, { once: true });
          });
        }
      };
      tryPlay();
    }

    return () => {
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, w, h);
      if (audio) audio.pause();
    };
  }, [showPumpkins, muted]);

  if (!showPumpkins) return null;

  return (
    <div className="global-pumpkin-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="purple-canvas"></canvas>

      <button
        className="global-pumpkin-mute"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((prev) => !prev);
          if (audioRef.current) {
            if (!muted) audioRef.current.pause();
            else audioRef.current.play().catch(() => {});
          }
        }}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      <audio ref={audioRef} style={{ display: "none" }}>
        <source src="/sounds/halloween_cackle.mp3" type="audio/mpeg" />
        <source src="/sounds/halloween_cackle.wav" type="audio/wav" />
      </audio>
    </div>
  );
};

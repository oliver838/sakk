// PieceAdvanced.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import PieceEffects from "./PieceEffects";
import "./piece-effects.css";

/**
 Props:
  - piece: { id, color: "white"|"black", type: "king"|"queen"|"rook"|"bishop"|"knight"|"pawn", symbol: "♔" ... }
  - row, col: integers
  - lastMove: { pieceId, fromRow, fromCol, toRow, toCol }
  - squareSize: px
  - onClick: fn
  - selected: bool
  - isBeingHit: bool
  - setIsAnimating: fn(boolean)
*/

const SOUNDS = {
  king: "/sounds/king-royal.mp3",
  queen: "/sounds/queen-arc.mp3",
  rook: "/sounds/rook-slam.mp3",
  bishop: "/sounds/bishop-glide.mp3",
  knight: "/sounds/knight-charge.mp3",
  pawn: "/sounds/pawn-step.mp3",
  hit: "/sounds/hit-impact.mp3",
  crack: "/sounds/earth-crack.mp3",
};

function playSound(src, volume = 0.9) {
  try {
    const a = new Audio(src);
    a.volume = volume;
    // Return promise for chaining
    a.play().catch(() => {
      // autoplay may be blocked; ignore
    });
  } catch (e) {
    // ignore
  }
}

const baseZ = 5;

export const PieceAdvanced = ({
  piece,
  row,
  col,
  lastMove,
  squareSize,
  onClick,
  selected,
  isBeingHit,
  setIsAnimating = () => {},
}) => {
  const controls = useAnimation();
  const [isFlying, setIsFlying] = useState(false);
  const [effectState, setEffectState] = useState({
    lightning: false,
    crack: false,
    dust: false,
    shadowPulse: false,
  });

  const mountedRef = useRef(true);
  useEffect(() => () => (mountedRef.current = false), []);

  const initialX = col * squareSize;
  const initialY = row * squareSize;

  // Per-piece animation presets
  const presets = {
    king: {
      move: { duration: 0.9, ease: "easeInOut" },
      behavior: async (from, to) => {
        // majestic rise + glow + small camera-like tilt
        setEffectState((s) => ({ ...s, lightning: true, shadowPulse: true }));
        playSound(SOUNDS.king, 0.85);
        await controls.start({
          x: [from.x, to.x],
          y: [from.y + -squareSize * 0.12, to.y],
          scale: [1, 1.02, 1],
          rotateX: [12, 0],
          transition: { duration: 0.9, ease: "easeInOut" },
        });
        // short lightning flash
        await new Promise((r) => setTimeout(r, 120));
      },
      zIndex: baseZ + 6,
    },
    queen: {
      move: { duration: 1.0, ease: "anticipate" },
      behavior: async (from, to) => {
        setEffectState((s) => ({ ...s, lightning: true, shadowPulse: true }));
        playSound(SOUNDS.queen, 0.9);
        await controls.start({
          x: [from.x, (from.x + to.x) / 2 - squareSize * 0.08, to.x],
          y: [from.y, to.y - squareSize * 0.14, to.y],
          rotateZ: [0, 8, 0],
          scale: [1, 0.95, 1],
          transition: { duration: 1.0, ease: "easeInOut" },
        });
      },
      zIndex: baseZ + 5,
    },
    rook: {
      move: { duration: 0.7, ease: "backOut" },
      behavior: async (from, to) => {
        setEffectState((s) => ({ ...s, crack: true, shadowPulse: true }));
        playSound(SOUNDS.rook, 1.0);
        // slam effect: fast approach + ground crack
        await controls.start({
          x: [from.x, to.x],
          y: [from.y - squareSize * 0.06, to.y],
          scale: [1, 0.9, 1],
          rotateX: [0, 6, 0],
          transition: { duration: 0.7, ease: [0.2, 0.9, 0.2, 1] },
        });
      },
      zIndex: baseZ + 4,
    },
    bishop: {
      move: { duration: 0.85, ease: "circOut" },
      behavior: async (from, to) => {
        setEffectState((s) => ({ ...s, lightning: true }));
        playSound(SOUNDS.bishop, 0.7);
        // glide + elegant arc
        await controls.start({
          x: [from.x, (from.x + to.x) / 2, to.x],
          y: [from.y, (from.y + to.y) / 2 - squareSize * 0.12, to.y],
          rotateZ: [0, -8, 0],
          scale: [1, 1.01, 1],
          transition: { duration: 0.85, ease: "easeInOut" },
        });
      },
      zIndex: baseZ + 4,
    },
    knight: {
      move: { duration: 0.6, ease: "circIn" },
      behavior: async (from, to) => {
        setEffectState((s) => ({ ...s, crack: true, dust: true }));
        playSound(SOUNDS.knight, 0.95);
        // dash + small jump + earth-break
        await controls.start({
          x: [from.x, from.x + (to.x - from.x) * 0.6, to.x],
          y: [from.y, from.y - squareSize * 0.28, to.y],
          rotateZ: [0, 25 * Math.sign(to.x - from.x || 1), 0],
          scale: [1, 1.05, 0.98, 1],
          transition: { duration: 0.6, ease: "easeInOut" },
        });
      },
      zIndex: baseZ + 7,
    },
    pawn: {
      move: { duration: 0.5, ease: "easeOut" },
      behavior: async (from, to) => {
        setEffectState((s) => ({ ...s, dust: true, shadowPulse: true }));
        playSound(SOUNDS.pawn, 0.6);
        await controls.start({
          x: [from.x, to.x],
          y: [from.y, from.y - squareSize * 0.18, to.y],
          scale: [1, 0.96, 1],
          transition: { duration: 0.5, ease: "easeOut" },
        });
      },
      zIndex: baseZ + 3,
    },
  };

  // Helper: run appropriate preset when lastMove is about this piece
  useEffect(() => {
    if (!lastMove) return;
    const isCurrentPiece = lastMove.pieceId === piece.id;
    if (!isCurrentPiece && !isBeingHit) return;

    // compute coords (px)
    const from = {
      x: lastMove.fromCol * squareSize,
      y: lastMove.fromRow * squareSize,
    };
    const to = {
      x: lastMove.toCol * squareSize,
      y: lastMove.toRow * squareSize,
    };

    let mounted = true;

    const run = async () => {
      setIsAnimating(true);
      setIsFlying(true);
      const preset = presets[piece.type] || presets.pawn;

      try {
        if (isBeingHit) {
          // hit animation (override)
          playSound(SOUNDS.hit, 0.9);
          await controls.start({
            x: [to.x, to.x + (Math.sign(to.x - from.x) || 1) * squareSize * 1.25],
            y: [to.y, to.y - squareSize * 0.25, to.y + squareSize * 1.2],
            rotateZ: [0, 40, 120],
            rotateX: [0, 30, 60],
            scale: [1, 1.08, 0.9, 0],
            opacity: [1, 1, 0.6, 0],
            transition: { duration: 0.9, ease: [0.25, 0.1, 0.3, 1.0] },
          });
        } else {
          await preset.behavior(from, to);
        }
      } catch (e) {
        // ignore animation cancellation
      } finally {
        if (!mountedRef.current) return;
        setIsFlying(false);
        setEffectState({ lightning: false, crack: false, dust: false, shadowPulse: false });
        // ensure final position is set
        controls.set({ x: to.x, y: to.y, scale: 1, rotateX: 0, rotateZ: 0, opacity: 1 });
        setIsAnimating(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove, isBeingHit, piece.id]);

  // Click handler plays piece sound and triggers a small pop
  const handleClick = (e) => {
    e.stopPropagation();
    playSound(SOUNDS[piece.type] || SOUNDS.pawn, 0.7);
    controls.start({
      scale: [1, 1.06, 1],
      transition: { duration: 0.28, ease: "easeOut" },
    });
    onClick?.();
  };

  const currentPreset = presets[piece.type] || presets.pawn;

  return (
    <>
      {/* Shadow / ground effect (below piece) */}
      <div
        className={`shadow-field ${effectState.shadowPulse ? "pulse" : ""} ${piece.color}`}
        style={{
          width: squareSize * 1.05,
          height: squareSize * 0.36,
          left: initialX + (squareSize - squareSize * 1.05) / 2,
          top: initialY + squareSize - squareSize * 0.18,
        }}
        aria-hidden
      />

      {/* Crack / dust / lightning effects overlay (takes absolute coords) */}
      <PieceEffects
        x={initialX}
        y={initialY}
        squareSize={squareSize}
        lightning={effectState.lightning}
        crack={effectState.crack}
        dust={effectState.dust}
        animateKey={`${piece.id}-${lastMove ? lastMove.toRow + "-" + lastMove.toCol : "static"}`}
      />

      <motion.div
        onClick={handleClick}
        animate={controls}
        initial={{ x: initialX, y: initialY, scale: 1 }}
        style={{
          width: squareSize,
          height: squareSize,
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: squareSize * 0.78,
          fontWeight: 600,
          color: selected ? (piece.color === "white" ? "#ffefef" : "#fff5ff") : piece.color === "white" ? "#fff" : "#0f0f0f",
          textShadow:
            piece.color === "white"
              ? "0 4px 24px rgba(140,80,200,0.55), 0 0 6px rgba(255,255,255,0.18)"
              : "0 4px 18px rgba(80,0,120,0.45), 0 0 6px rgba(255,80,200,0.06)",
          cursor: "pointer",
          zIndex: currentPreset.zIndex,
          userSelect: "none",
          pointerEvents: "auto",
          transformOrigin: "center center",
          // GPU accelerate to help with heavy transforms:
          willChange: "transform, opacity",
        }}
        data-piece-type={piece.type}
        role="button"
        aria-label={`${piece.type}-${piece.color}`}
      >
        {/* Optional shader placeholder - you can swap this <div> with a canvas-based shader */}
        <div className={`piece-inner ${piece.type}`}>
          <span className="piece-symbol">{piece.symbol}</span>
        </div>
      </motion.div>
    </>
  );
};

export default PieceAdvanced;

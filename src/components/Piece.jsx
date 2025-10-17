// Piece.jsx
import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

export const Piece = ({ piece, row, col, lastMove, squareSize = 60, onClick, selected, playerColor }) => {
  const controls = useAnimation();

  useEffect(() => {
    if (
      lastMove &&
      lastMove.toRow === row &&
      lastMove.toCol === col &&
      typeof lastMove.fromRow === "number" &&
      typeof lastMove.fromCol === "number"
    ) {
      const dx = (lastMove.toCol - lastMove.fromCol) * squareSize;
      const dy = (lastMove.toRow - lastMove.fromRow) * squareSize;

      // Kezdő pozíció a korábbi négyzethez képest
      controls.set({ x: -dx, y: -dy, scale: 1 });
      controls.start({
        x: 0,
        y: 0,
        scale: [1, 1.1, 1],
        rotateZ: [0, 4, -4, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      });
    }
  }, [lastMove, row, col, controls, squareSize]);

  // Színek és fény
  const baseColor = piece.color === "white" ? "#f8f0ff" : "#120012";
  const glowColor =
    piece.color === "white"
      ? "0 0 10px rgba(200,150,255,0.9), 0 0 25px rgba(180,120,255,0.6)"
      : "0 0 8px rgba(170,0,255,0.6), 0 0 20px rgba(255,0,255,0.4)";
  const selectedColor = piece.color === "white" ? "#f0d5ff" : "#ff5afc";

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        if (typeof onClick === "function") onClick();
      }}
      animate={selected
        ? {
            y: [-5, -8, -5], // lebegés
            scale: [1.1, 1.2, 1.1],
            rotateZ: [-2, 2, -2],
            transition: {
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }
        : controls
      }
      initial={{ x: 0, y: 0 }}
      style={{
        position: 'absolute',
        top: row * squareSize,
        left: col * squareSize,
        width: squareSize,
        height: squareSize,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: squareSize * 0.9,
        fontWeight: 400,
        color: selected ? selectedColor : baseColor,
        textShadow: glowColor,
        cursor: "pointer",
        zIndex: selected ? 10 : 5,
        userSelect: "none",
        pointerEvents: "auto",
        filter: selected
          ? "drop-shadow(0 12px 15px rgba(255,0,255,0.35))"
          : "drop-shadow(0 0 6px rgba(0,0,0,0.4))",
        transition: "color 0.3s ease, filter 0.3s ease",
        transformOrigin: 'center center'
      }}
    >
      {piece.symbol}
    </motion.div>
  );
};

export default Piece;

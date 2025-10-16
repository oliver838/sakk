import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

export const Piece = ({
  piece,
  row,
  col,
  lastMove,
  squareSize = 60,
  onClick,
  selected,
}) => {
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

  // 👻 Alapszínek és fény
  const baseColor = piece.color === "white" ? "#f8f0ff" : "#120012";
  const glowColor =
    piece.color === "white"
      ? "0 0 10px rgba(200,150,255,0.9), 0 0 25px rgba(180,120,255,0.6)"
      : "0 0 8px rgba(170,0,255,0.6), 0 0 20px rgba(255,0,255,0.4)";
  const selectedColor = piece.color === "white" ? "#f0d5ff" : "#ff5afc";

  return (
    <div
      data-row={row}
      data-col={col}
      style={{
        position: "absolute",
        top: row * squareSize,
        left: col * squareSize,
        width: squareSize,
        height: squareSize,
        fontSize: squareSize * 0.9, // arányosan méretezzük a szimbólumot
   
        zIndex: selected ? 10 : 5, // kiemelés
        pointerEvents: "none",
      }}
    >
      <motion.div
        className={`chess-piece ${piece.color}`}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof onClick === "function") onClick();
        }}
        animate={
          selected
            ? {
                y: [-5, -8, -5], // lebegés
                scale: [1.1, 1.2, 1.1], // nagyobb lesz
                rotateZ: [-2, 2, -2], // kicsit billeg
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
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          userSelect: "none",
          pointerEvents: "auto",
          filter: selected
            ? "drop-shadow(0 12px 15px rgba(255,0,255,0.35))"
            : "drop-shadow(0 0 6px rgba(0,0,0,0.4))",
          transition: "color 0.3s ease, filter 0.3s ease",
        }}
      >
        {piece.symbol}
      </motion.div>
    </div>
  );
};

export default Piece;

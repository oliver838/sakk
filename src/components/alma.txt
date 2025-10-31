import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export const Piece = ({
  piece,
  row,
  col,
  lastMove,
  squareSize,
  onClick,
  selected,
  hitPiece,
  attackingPiece,
  setIsAnimating
}) => {
  const controls = useAnimation();
  const [isFlying, setIsFlying] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, z: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  const baseColor = piece.color === "white" ? "#f8f0ff" : "#120012";
  const glowColor =
    piece.color === "white"
      ? "0 0 10px rgba(200,150,255,0.9), 0 0 25px rgba(180,120,255,0.6)"
      : "0 0 8px rgba(170,0,255,0.6), 0 0 20px rgba(255,0,255,0.4)";
  const selectedColor = piece.color === "white" ? "#f0d5ff" : "#ff5afc";

  useEffect(() => {
  if (!lastMove) return;

  const isCurrentPiece = lastMove.pieceId === piece.id;
  const isAttacker = attackingPiece?.pieceId === piece.id;
  const isTarget = hitPiece?.row === row && hitPiece?.col === col;

  // 🔴 Ütés animáció mindig fusson, külön
  if (hitPiece && attackingPiece) {
    setIsAnimating(true);

    // Támadó bábu
   setIsAnimating(true);

// Támadó bábu animáció
if (isAttacker) {
  const fromX = attackingPiece.fromCol * squareSize;
  const fromY = attackingPiece.fromRow * squareSize;
  const toX = attackingPiece.toCol * squareSize;
  const toY = attackingPiece.toRow * squareSize;

 

  (async () => {
    // 1️⃣ Odamegy az ellenfél elé
    await controls.start({
      x: [fromX, toX + squareSize* -0.5*Math.sign(attackingPiece.toCol - attackingPiece.fromCol)],
      y: [fromY, toY- squareSize],
      rotateX: [0, 10],
      rotateZ: [0, 5],
      scale: [1, 1],
      transition: { duration: 0.4, ease: "easeInOut" }
    });

    // 2️⃣ Hátrabillen
    await controls.start({
      rotateX: [10, 25],
      rotateZ: [5, 50],
      transition: { duration: 0.3, ease: "easeInOut" }
    });

    // 3️⃣ Előrelendül és támad
    await controls.start({
      x: [toX + squareSize* -0.5*Math.sign(attackingPiece.toCol - attackingPiece.fromCol), toX],
      y: [toY- squareSize, toY],
      rotateX: [25, -25],
      rotateZ: [50, -35],
      transition: { duration: 0.3, ease: "easeInOut" }
    });
    await controls.start({
     
      rotateX: [-25,0],
      rotateZ: [-35,0],
      transition: { duration: 0.3, ease: "easeInOut" }
    });

    setIsAnimating(false);
  })();
}

    // Leütött bábu
    if (isTarget) {
      const dirX = Math.sign(attackingPiece.toCol - attackingPiece.fromCol);
      const dirY = Math.sign(attackingPiece.toRow - attackingPiece.fromRow);

      controls.start({
        x: [col * squareSize, col * squareSize + dirX * squareSize * 1.2],
        y: [
          row * squareSize,
          row * squareSize - 0.3 * squareSize,
          row * squareSize + dirY * squareSize * 1.2
        ],
        rotateZ: [0, 30 * dirX, 90 * dirX],
        rotateX: [0, 0, 60],
        scale: [1, 1.05, 0.9, 0],
        opacity: [1, 1, 0.6, 0],
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.3, 1.0] }
      }).then(() => setIsAnimating(false));
    }
    
    return; // normál lépés ne fusson
  }

  // 🔹 Normál lépés animáció – ide már jöhet a hasAnimated blokkolás
  if (isCurrentPiece && !hasAnimated) {
    setIsAnimating(true);
    setHasAnimated(true);

    const fromX = lastMove.fromCol * squareSize;
    const fromY = lastMove.fromRow * squareSize;
    const toX = lastMove.toCol * squareSize;
    const toY = lastMove.toRow * squareSize;

    const dx = lastMove.toCol - lastMove.fromCol;
    const dy = lastMove.toRow - lastMove.fromRow;
    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);

    const tiltX = Math.max(-30, Math.min(30, Math.abs(dy) * 5 * dirY));
    const angleZ = Math.max(-20, Math.min(20, Math.abs(dx) * 5 * dirX));

    setRotation({ x: tiltX, z: angleZ });
    setIsFlying(true);

    controls.start({
      x: [fromX, toX],
      y: [fromY, toY],
      scale: [1, 0.85, 1],
      opacity: [1, 0.85, 1],
      rotateX: [tiltX, 0],
      rotateZ: [angleZ, 0],
      transition: { duration: 0.8, ease: "easeInOut" }
    }).then(() => {
      setIsFlying(false);
      setRotation({ x: 0, z: 0 });
      setIsAnimating(false);
      controls.set({ x: toX, y: toY });
    });
  }
}, [lastMove, squareSize, controls, hitPiece, attackingPiece, piece.id, row, col, setIsAnimating, hasAnimated]);

  // 🔹 Kezdőpozíció
  const initialX = col * squareSize;
  const initialY = row * squareSize;

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      animate={controls}
      initial={{ x: initialX, y: initialY }}
      style={{
        x: initialX,
        y: initialY,
        width: squareSize,
        height: squareSize,
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: squareSize * 0.8,
        fontWeight: 400,
        color: selected ? selectedColor : baseColor,
        textShadow: glowColor,
        cursor: "pointer",
        zIndex: selected || isFlying ? 10 : 5,
        userSelect: "none",
        pointerEvents: "auto",
        transformOrigin: "center center"
      }}
    >
      {piece.symbol}
    </motion.div>
  );
};

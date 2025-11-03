// Piece.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const PieceComponent = ({
  piece,
  row,
  col,
  lastMove,
  squareSize,
  onClick,
  selected,
  hitPiece,
  setHitPiece,
  attackingPiece,
  setAttackingPiece,
  setIsAnimating,
  updateBoard,
  onlineGameId,
}) => {

  const animatedMoveRef = useRef(new Set());
  const controls = useAnimation();
  const isFlyingRef = useRef(false);
  const rotationRef = useRef({ x: 0, z: 0 });
  const hasAnimatedRef = useRef(false);
  const readyRef = useRef(false);
  const unmountedRef = useRef(false);
  const timeoutRefs = useRef([]);
  const boardToFirestore = useCallback((boardArray) => {
    const obj = {};
    boardArray.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) obj[`${r}-${c}`] = cell;
      })
    );
    return obj;
  }, []);

  // Mount / unmount
  useEffect(() => {
    readyRef.current = true;
    return () => {
      unmountedRef.current = true;
      controls.stop();
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, [controls]);

  // Reset hasAnimated on each new lastMove id
  useEffect(() => {
    hasAnimatedRef.current = false;
  }, [lastMove?.id]);

  const baseColor = piece.color === "white" ? "#f8f0ff" : "#120012";
  const glowColor =
    piece.color === "white"
      ? "0 0 10px rgba(200,150,255,0.9), 0 0 25px rgba(180,120,255,0.6)"
      : "0 0 8px rgba(170,0,255,0.6), 0 0 20px rgba(255,0,255,0.4)";
  const selectedColor = piece.color === "white" ? "#f0d5ff" : "#ff5afc";

  // Animation logic
  useEffect(() => {
    if (!readyRef.current || !lastMove || !piece) return;

    const isCurrentPiece = lastMove.pieceId === piece.id;
    const isAttacker = attackingPiece?.pieceId === piece.id;
    const isTarget = hitPiece?.targetId === piece.id;
    const isRook = lastMove?.rookMove?.rookId === piece.id;

    if (!(isCurrentPiece || isAttacker || isTarget || isRook)) return;
    if (animatedMoveRef.current.has(lastMove.id) && !isTarget) return;

    const animatePiece = async () => {
      if (unmountedRef.current) return;

      animatedMoveRef.current.add(lastMove.id);

      // LOCAL: set local anim flag (do NOT write isAnimating to Firestore here)
      setIsAnimating(true);

      let extraDuration = 0;
      if (attackingPiece) {
        const dx = Math.abs(attackingPiece.toCol - attackingPiece.fromCol) - 1;
        const dy = Math.abs(attackingPiece.toRow - attackingPiece.fromRow) - 1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const durationMap = (dist) => {
          if (dist < 1) return 0;
          if (dist < 2) return 0.2;
          if (dist < 3) return 0.35;
          if (dist < 4) return 0.5;
          if (dist < 5) return 0.65;
          return 0.8;
        };
        extraDuration = durationMap(distance);
      }

      // -------------------- ATTACKER animation --------------------
      if (isAttacker && attackingPiece) {
        const fromX = attackingPiece.fromCol * squareSize;
        const fromY = attackingPiece.fromRow * squareSize;
        const toX = attackingPiece.toCol * squareSize;
        const toY = attackingPiece.toRow * squareSize;

        const dx = attackingPiece.toCol - attackingPiece.fromCol;
        const dy = attackingPiece.toRow - attackingPiece.fromRow;

        const offsetX =
          dx === 0 && dy !== 0
            ? attackingPiece.fromCol === 0
              ? squareSize
              : attackingPiece.fromCol === 7
              ? -squareSize
              : Math.random() <= 0.5
              ? -squareSize
              : squareSize
            : 0;

        const offsetY =
          dy === 0 && dx !== 0
            ? attackingPiece.fromRow === 0
              ? squareSize
              : attackingPiece.fromRow === 7
              ? -squareSize
              : Math.random() <= 0.5
              ? -squareSize
              : squareSize
            : 0;

        const positionDirX = offsetX !== 0 ? Math.sign(dx) * -1 : Math.sign(dx);
        const positionDirY = offsetY !== 0 ? Math.sign(dy) : Math.sign(dy);

        const rotateDirX = offsetX !== 0 ? Math.sign(offsetX) * -1 : Math.sign(dx);
        const rotateDirY = offsetY !== 0 ? Math.sign(offsetY) : Math.sign(dy);

        const tiltX =
          offsetY === 0
            ? Math.max(-30, Math.min(30, Math.abs(dy) * 5 * rotateDirY))
            : Math.max(-30, Math.min(30, Math.abs(offsetY) * 5 * rotateDirY));

        const angleZ =
          offsetX === 0
            ? Math.max(-20, Math.min(20, Math.abs(dx) * 5 * rotateDirX))
            : Math.max(-20, Math.min(20, Math.abs(offsetX) * 5 * Math.sign(offsetX) * -1));

        rotationRef.current = { x: tiltX, z: angleZ };
        isFlyingRef.current = true;

        // 1) fly near
        await controls.start({
          x: [fromX, toX - squareSize * positionDirX + offsetX],
          y: [fromY, toY - squareSize * positionDirY + offsetY],
          scale: extraDuration > 0 ? [1, 0.85, 1] : [1],
          opacity: extraDuration > 0 ? [1, 0.85, 1] : [1],
          rotateX: [tiltX, 0],
          rotateZ: [angleZ, 0],
          transition: { duration: extraDuration, ease: [0.25, 0.46, 0.45, 0.94] },
        });

        // 2) prep collision
        await controls.start({
          x: [toX - squareSize * positionDirX + offsetX, toX - squareSize * 0.5 * positionDirX + offsetX],
          y: [toY - squareSize * positionDirY + offsetY, toY - squareSize + offsetY],
          rotateX: [0, 10],
          rotateZ: [0, 5 * rotateDirX],
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        });

        // 3) collision
        await controls.start({
          rotateX: [10, 25],
          rotateZ: [5 * rotateDirX, 50 * rotateDirX],
          transition: { duration: 0.3, ease:[0.68, -0.55, 0.27, 1.55] },
        });

        // 4) pull to target
        await controls.start({
          x: [toX - squareSize * 0.5 * positionDirX + offsetX, toX],
          y: [toY - squareSize + offsetY, toY],
          rotateX: [25, -25],
          rotateZ: [50 * rotateDirX, -35 * rotateDirX],
          transition: { duration: 0.3, ease:[0.42, 0, 0.58, 1] },
        });

        // 5) stabilize
        await controls.start({
          rotateX: [-25, 0],
          rotateZ: [-35 * rotateDirX, 0],
          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1]},
        });

        if (attackingPiece.finalRow !== undefined && attackingPiece.finalCol !== undefined) {
          const finalX = attackingPiece.finalCol * squareSize;
          const finalY = attackingPiece.finalRow * squareSize;
          await controls.start({
            x: [toX, finalX],
            y: [toY, finalY],
            scale: [1, 0.85, 1],
            opacity: [1, 0.85, 1],
            transition: { duration: 0.6, ease:  [0.25, 0.46, 0.45, 0.94] },
          });
        }

        isFlyingRef.current = false;
        hasAnimatedRef.current = true;
        rotationRef.current = { x: 0, z: 0 };

        const finalX = attackingPiece.finalCol !== undefined ? attackingPiece.finalCol * squareSize : toX;
        const finalY = attackingPiece.finalRow !== undefined ? attackingPiece.finalRow * squareSize : toY;
        controls.set({ x: finalX, y: finalY });
      }

      // -------------------- SIMPLE MOVE --------------------
      else if (isCurrentPiece && lastMove.captured == false && !hasAnimatedRef.current && !isAttacker && !isTarget) {
        hasAnimatedRef.current = true;
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

        rotationRef.current = { x: tiltX, z: angleZ };
        isFlyingRef.current = true;

        await controls.start({
          x: [fromX, toX],
          y: [fromY, toY],
          scale: [1, 0.85, 1],
          opacity: [1, 0.85, 1],
          rotateX: [tiltX, 0],
          rotateZ: [angleZ, 0],
          transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
        });

        isFlyingRef.current = false;
        rotationRef.current = { x: 0, z: 0 };
        controls.set({ x: toX, y: toY });
      }

      // -------------------- Rook (castling) --------------------
      if (
        piece.type === "rook" &&
        lastMove?.castling &&
        lastMove.rookMove &&
        lastMove.rookMove.rookId === piece.id
      ) {
        const fromX = lastMove.rookMove.fromCol * squareSize;
        const toX = lastMove.rookMove.toCol * squareSize;
        const y = lastMove.rookMove.row * squareSize;

        isFlyingRef.current = true;
        await controls.start({
          x: [fromX, (fromX + toX) / 2, toX],
          y: [y, y - squareSize * 0.25, y],
          scale: [1, 1.15, 1],
          rotateZ: [0, 8, -6, 0],
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1]},
        });
        isFlyingRef.current = false;
        controls.set({ x: toX, y });
      }

      // -------------------- TARGET (captured piece) --------------------
      if (isTarget) {
        if (!attackingPiece) {
          setIsAnimating(false);
          return;
        }

        const dirX = Math.sign(attackingPiece.toCol - attackingPiece.fromCol);
        const dirY = Math.sign(attackingPiece.toRow - attackingPiece.fromRow);

        const waitTime = 800 + extraDuration * 1000;
        await new Promise((resolve) => {
          const t = setTimeout(resolve, waitTime);
          timeoutRefs.current.push(t);
        });

        if (unmountedRef.current) {
          setIsAnimating(false);
          return;
        }

        await controls.start({
          opacity: [1, 1, 0.6, 0],
          x: [col * squareSize, col * squareSize + dirX * squareSize * 1.2],
          y: [row * squareSize, row * squareSize - 0.3 * squareSize, row * squareSize + dirY * squareSize * 1.2],
          rotateZ: [0, 30 * dirX, 90 * dirX],
          rotateX: [0, 0, 60],
          scale: [1, 1.05, 0.9, 0],
          transition: { duration: 0.6, ease: [0.25, 0.1, 0.3, 1.0] },
        });

        // Finalize board locally and write final board to Firestore
        await updateBoard(
          attackingPiece.fromRow,
          attackingPiece.fromCol,
          attackingPiece.toRow,
          attackingPiece.toCol,
          { removeTarget: true, finalizeOnline: true }
        );

        // clear local transient flags
        setIsAnimating(false);
        setHitPiece(null);
        setAttackingPiece(null);

        // clear server transient flags (hitPiece/attackingPiece) — do NOT write isAnimating to server
        if (onlineGameId) {
          try {
            await updateDoc(doc(db, 'games', onlineGameId), {
              hitPiece: null,
              attackingPiece: null,
            });
          } catch (err) {
            console.error('Failed clearing server attack markers:', err);
          }
        }
      }

      setIsAnimating(false);
    };

    animatePiece().catch((err) => {
      console.error("animatePiece error:", err);
      if (!unmountedRef.current) setIsAnimating(false);
    });
  }, [lastMove, attackingPiece, hitPiece, squareSize, piece, updateBoard, setIsAnimating]);

  // Initial position reset (snap to correct square immediately)
  useEffect(() => {
    if (typeof row !== 'number' || typeof col !== 'number' || typeof squareSize !== 'number') return;
    controls.set({ x: col * squareSize, y: row * squareSize, transition: { duration: 0.0 } });
  }, [row, col, squareSize, controls]);

  return (
    <motion.div
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      initial={{ x: col * squareSize, y: row * squareSize }}
      animate={controls}
      style={{
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
        zIndex: selected || isFlyingRef.current ? 10 : 5,
        userSelect: "none",
        pointerEvents: "auto",
        transformOrigin: "center center",
      }}
    >
      {piece.symbol}
    </motion.div>
  );
};

// React.memo optimization
export const Piece = React.memo(PieceComponent, (prev, next) => {
  if (!prev.piece && !next.piece) return true;
  if (!prev.piece || !next.piece) return false;

  return (
    prev.piece.id === next.piece.id &&
    prev.row === next.row &&
    prev.col === next.col &&
    prev.selected === next.selected &&
    (prev.hitPiece?.targetId || null) === (next.hitPiece?.targetId || null) &&
    (prev.attackingPiece?.pieceId || null) === (next.attackingPiece?.pieceId || null) &&
    (prev.lastMove?.id || null) === (next.lastMove?.id || null) &&
    prev.squareSize === next.squareSize
  );
});

export default Piece;

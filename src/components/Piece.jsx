// Piece.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

const PieceComponent = ({
  piece,
  row,
  col,
  prevRow,
  prevCol,
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
}) => {
  const animatedMoveRef = useRef(new Set());
  const controls = useAnimation();
  const [isFlying, setIsFlying] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, z: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [ready, setReady] = useState(false);
  const unmountedRef = useRef(false);

  // mount jelzés
  useEffect(() => {
    setReady(true);
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // reset hasAnimated amikor új lastMove jön
  useEffect(() => {
    setHasAnimated(false);
  }, [lastMove?.id]);

  const baseColor = piece.color === "white" ? "#f8f0ff" : "#120012";
  const glowColor =
    piece.color === "white"
      ? "0 0 10px rgba(200,150,255,0.9), 0 0 25px rgba(180,120,255,0.6)"
      : "0 0 8px rgba(170,0,255,0.6), 0 0 20px rgba(255,0,255,0.4)";
  const selectedColor = piece.color === "white" ? "#f0d5ff" : "#ff5afc";

  useEffect(() => {
    if (!ready) return;
    if (!lastMove || !piece) return;

    const isCurrentPiece = lastMove.pieceId === piece.id;
    const isAttacker = attackingPiece?.pieceId === piece.id;
    const isTarget = hitPiece?.targetId === piece.id;
    const isRook = lastMove?.rookMove?.rookId === piece.id
    // semmiért se futtassuk minden Piece-nél — csak az érintettnél
    
    if (!(isCurrentPiece || isAttacker || isTarget || isRook)) return;

    // ha már lefuttuk ezt az id-t erre a piece-re (és nem cél), ne futtassuk újra
    if (animatedMoveRef.current.has(lastMove.id) && !isTarget) return;

    const animatePiece = async () => {
      if (unmountedRef.current) return;

      animatedMoveRef.current.add(lastMove.id);
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

      // -------------------- TÁMADÓ animáció (az eredetivel megegyezően) --------------------
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
          offsetY == 0
            ? Math.max(-30, Math.min(30, Math.abs(dy) * 5 * rotateDirY))
            : Math.max(-30, Math.min(30, Math.abs(offsetY) * 5 * rotateDirY));

        const angleZ =
          offsetX == 0
            ? Math.max(-20, Math.min(20, Math.abs(dx) * 5 * rotateDirX))
            : Math.max(-20, Math.min(20, Math.abs(offsetX) * 5 * Math.sign(offsetX) * -1));

        setRotation({ x: tiltX, z: angleZ });
        setIsFlying(true);

        // 1) repülés a közelbe
        await controls.start({
          x: [fromX, toX - squareSize * positionDirX + offsetX],
          y: [fromY, toY - squareSize * positionDirY + offsetY],
          scale: extraDuration > 0 ? [1, 0.85, 1] : [1],
          opacity: extraDuration > 0 ? [1, 0.85, 1] : [1],
          rotateX: [tiltX, 0],
          rotateZ: [angleZ, 0],
          transition: { duration: extraDuration, ease: "easeInOut" },
        });

        // 2) ütközés előkészítő mozgás
        await controls.start({
          x: [toX - squareSize * positionDirX + offsetX, toX - squareSize * 0.5 * positionDirX + offsetX],
          y: [toY - squareSize * positionDirY + offsetY, toY - squareSize + offsetY],
          rotateX: [0, 10],
          rotateZ: [0, 5 * rotateDirX],
          transition: { duration: 0.4, ease: "easeInOut" },
        });

        // 3) ütközés pillanata
        await controls.start({
          rotateX: [10, 25],
          rotateZ: [5 * rotateDirX, 50 * rotateDirX],
          transition: { duration: 0.3, ease: "easeInOut" },
        });

        // 4) visszahúzás célmezőre
        await controls.start({
          x: [toX - squareSize * 0.5 * positionDirX + offsetX, toX],
          y: [toY - squareSize + offsetY, toY],
          rotateX: [25, -25],
          rotateZ: [50 * rotateDirX, -35 * rotateDirX],
          transition: { duration: 0.3, ease: "easeInOut" },
        });

        // 5) stabilizálás
        await controls.start({
          rotateX: [-25, 0],
          rotateZ: [-35 * rotateDirX, 0],
          transition: { duration: 0.3, ease: "easeInOut" },
        });

         if (attackingPiece.finalRow !== undefined && attackingPiece.finalCol !== undefined) {
          const finalX = attackingPiece.finalCol * squareSize;
          const finalY = attackingPiece.finalRow * squareSize;

          await controls.start({
            x: [toX, finalX],
            y: [toY, finalY],
            scale: [1, 0.85, 1],
            opacity: [1, 0.85, 1],
            transition: { duration: 0.6, ease: "easeInOut" },
          });
        }

  // 🔚 visszaállítjuk az állapotot
  setIsFlying(false);
  setHasAnimated(true);
  setRotation({ x: 0, z: 0 });

  // végső pozíció
  const finalX = attackingPiece.finalCol !== undefined
    ? attackingPiece.finalCol * squareSize
    : toX;
  const finalY = attackingPiece.finalRow !== undefined
    ? attackingPiece.finalRow * squareSize
    : toY;

  controls.set({ x: finalX, y: finalY });
      }

      // -------------------- sima lépés (nem ütés) --------------------
      else if (isCurrentPiece && !hasAnimated && !isAttacker && !isTarget) {
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

        await controls.start({
          x: [fromX, toX],
          y: [fromY, toY],
          scale: [1, 0.85, 1],
          opacity: [1, 0.85, 1],
          rotateX: [tiltX, 0],
          rotateZ: [angleZ, 0],
          transition: { duration: 0.8, ease: "easeInOut" },
        });

        setIsFlying(false);
        setRotation({ x: 0, z: 0 });
        controls.set({ x: toX, y: toY });
      }
      // -------------------- SÁNCOLÁS (ROOK) animáció --------------------// -------------------- SÁNCOLÁS (ROOK) animáció --------------------


      if (
   piece.type === 'rook' && 
    lastMove?.castling && 
    lastMove.rookMove &&
    lastMove.rookMove.rookId === piece.id
)  {
  console.log("🟣 Bástya sáncol animáció indul:", lastMove.rookMove);

  setHasAnimated(true);
  const fromX = lastMove.rookMove.fromCol * squareSize;
  const toX = lastMove.rookMove.toCol * squareSize;
  const y = lastMove.rookMove.row * squareSize;

  setIsFlying(true);
  await controls.start({
    x: [fromX, (fromX + toX) / 2, toX],
    y: [y, y - squareSize * 0.25, y],
    scale: [1, 1.15, 1],
    rotateZ: [0, 8, -6, 0],
    transition: { duration: 0.6, ease: "easeInOut" },
  });

  setIsFlying(false);
  controls.set({ x: toX, y });
}


      // -------------------- TARGET (ütött bábu) animáció --------------------
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
          // nem kell külön cleanup mert unmountedRef kezeli
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

        // végleges board frissítés (töröljük a targetet és mozgatjuk a támadót)
        updateBoard(attackingPiece.fromRow, attackingPiece.fromCol, attackingPiece.toRow, attackingPiece.toCol, {
          removeTarget: true,
        });

        setHitPiece(null);
        setAttackingPiece(null);
        // 🔥 FONTOS: jelezzük a Board-nak, hogy az ütés animáció véget ért

      }

      setIsAnimating(false);
    }; // animatePiece

    animatePiece().catch((err) => {
      console.error("animatePiece error:", err);
      if (!unmountedRef.current) setIsAnimating(false);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove, squareSize, hitPiece, attackingPiece, piece?.id, row, col, updateBoard, setHitPiece, setAttackingPiece, ready]);

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
        transformOrigin: "center center",
      }}
    >
      {piece.symbol}
    </motion.div>
  );
};

// React.memo a felesleges újrarenderelés csökkentésére.
// A custom comparison figyeli a ténylegesen fontos propokat.
export const Piece = React.memo(PieceComponent, (prev, next) => {
  // Ha nincs piece (null), akkor összehasonlítjuk kulcs szerint
  if (!prev.piece && !next.piece) return true;
  if (!prev.piece || !next.piece) return false;

  // Ha ugyanaz az id, és a pozíció, selected, hit/attacking, lastMove id nem változott, ne renderelj újra
  const sameId = prev.piece.id === next.piece.id;
  const samePos = prev.row === next.row && prev.col === next.col;
  const sameSelected = prev.selected === next.selected;
  const sameHit = (prev.hitPiece?.targetId || null) === (next.hitPiece?.targetId || null);
  const sameAttacking = (prev.attackingPiece?.pieceId || null) === (next.attackingPiece?.pieceId || null);
  const sameLastMove = (prev.lastMove?.id || null) === (next.lastMove?.id || null);
  const sameSquareSize = prev.squareSize === next.squareSize;

  return sameId && samePos && sameSelected && sameHit && sameAttacking && sameLastMove && sameSquareSize;
});

export default Piece;

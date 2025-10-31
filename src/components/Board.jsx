// Board.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Piece } from './Piece';
import './halloween-chess.css';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { PromotionPopup } from './PromotionPopup';
import { usePumpkins } from '../pumpkins/PumpkinContext';

export const Board = ({ onlineGameId, playerColor, gameMode }) => {
  const wrapperRef = useRef(null);
  const [board, setBoard] = useState(() => getInitialBoard());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [attackingPiece, setAttackingPiece] = useState(null);
  const [hitPiece, setHitPiece] = useState(null);
  const prevBoardRef = useRef(board);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [boardWidth, setBoardWidth] = useState(880);
  const [bothPlayersJoined, setBothPlayersJoined] = useState(false);
  const [pendingEnPassantMove, setPendingEnPassantMove] = useState(null);
  const [promotionData, setPromotionData] = useState(null);
// Board komponensen belül, pl. a squareSize és isPlayerTurn után
const { setShowPumpkins } = usePumpkins();

  const animatedMovesRef = useRef(new Set());
  const [gameStatus, setGameStatus] = useState(null);
  const usedPrevPositionsRef = useRef(new Set());
  const squareSize = useMemo(() => boardWidth / 8, [boardWidth]);
  const isPlayerTurn = useMemo(() => playerColor === currentTurn || gameMode === "local", [playerColor, currentTurn, gameMode]);

const selectedRef = useRef(selected);

useEffect(() => {
  selectedRef.current = selected;
}, [selected]);

  useEffect(() => {
    if (lastMove) usedPrevPositionsRef.current.clear();
  }, [lastMove]);

  const firestoreToBoard = useCallback((data) => {
    if (!data) return getInitialBoard();
    return Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => data[`${r}-${c}`] || null)
    );
  }, []);

  const boardToFirestore = useCallback((boardArray) => {
    const obj = {};
    boardArray.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) obj[`${r}-${c}`] = cell;
      })
    );
    return obj;
  }, []);

  const updateBoard = useCallback((fromRow, fromCol, toRow, toCol, options = {}) => {
    setBoard(prev => {
      // deep copy minimal: copy rows and piece objects
      const newBoard = prev.map(row => row.map(cell => (cell ? { ...cell } : null)));
      const movingPiece = newBoard[fromRow][fromCol];
      newBoard[fromRow][fromCol] = null;
      newBoard[toRow][toCol] = movingPiece;
      return newBoard;
    });
  }, []);

    const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    if (!onlineGameId) return;

    const initBoard = async () => {
      const user = auth.currentUser;
      const gameRef = doc(db, "games", onlineGameId);
      const snapshot = await getDoc(gameRef);
      let newBoard = getInitialBoard();

      if (!snapshot.exists()) {
        const players = playerColor === "white"
          ? { white: user?.uid || null, black: null }
          : { white: null, black: user?.uid || null };

        await setDoc(gameRef, {
          board: boardToFirestore(newBoard),
          currentTurn: 'white',
          lastMove: null,
          players,
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snapshot.data();
        if (data.board) newBoard = firestoreToBoard(data.board);
        setCurrentTurn(data.currentTurn || 'white');
        setLastMove(data.lastMove || null);
      }

      setBoard(newBoard);

      const unsub = onSnapshot(gameRef, snapshot => {
        const data = snapshot.data();
        if (!data) return;

        setBoard(firestoreToBoard(data.board));
        setCurrentTurn(data.currentTurn);

        // 🔥 Online animáció kezelése lastMove alapján (ugyanaz a logika)
        if (data.lastMove && data.lastMove.id !== lastMove?.id) {
          const lm = data.lastMove;

          if (lm.captured) {
            const targetPos = findPieceById(prevBoardRef.current, lm.targetId);
            if (targetPos) {
              setHitPiece({ row: targetPos.row, col: targetPos.col, targetId: lm.targetId });
              setAttackingPiece({
                fromRow: lm.fromRow,
                fromCol: lm.fromCol,
                toRow: lm.toRow,
                toCol: lm.toCol,
                pieceId: lm.pieceId,
              });
            }
          }

          setLastMove(lm);
        }

        setSelected(null);
        setValidMoves([]);
        setBothPlayersJoined(!!data.players.white && !!data.players.black);
      });

      return unsub;
    };

    initBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineGameId, playerColor, firestoreToBoard, boardToFirestore, lastMove]);

  useEffect(() => {
    const updateWidth = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.clientWidth * 0.9;
      setBoardWidth(Math.max(180, Math.min(width, 680)));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    wrapperRef.current && ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  function getInitialBoard() {
    const newBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    const addId = (piece, index) => ({ ...piece, id: `${piece.color}-${piece.type}-${index}`, hasMoved: false });


    newBoard[0] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
      .map((type, i) => addId({ type, color: 'black', symbol: getSymbol(type, 'black') }, i));
    newBoard[1] = Array(8).fill(null).map((_, i) => addId({ type: 'pawn', color: 'black', symbol: '♟' }, i));
    newBoard[6] = Array(8).fill(null).map((_, i) => addId({ type: 'pawn', color: 'white', symbol: '♙' }, i));
    newBoard[7] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
      .map((type, i) => addId({ type, color: 'white', symbol: getSymbol(type, 'white') }, i));

    return newBoard;
  }

  function getSymbol(type, color) {
    const map = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return map[color][type];
  }

  const simulateMove = useCallback((b, fr, fc, tr, tc) => {
    const newB = b.map(row => row.map(cell => (cell ? { ...cell } : null)));
    newB[tr][tc] = newB[fr][fc] ? { ...newB[fr][fc] } : null;
    newB[fr][fc] = null;
    return newB;
  }, []);

  const isPathClear = useCallback((fr, fc, tr, tc, b) => {
    const rowStep = tr > fr ? 1 : tr < fr ? -1 : 0;
    const colStep = tc > fc ? 1 : tc < fc ? -1 : 0;
    let r = fr + rowStep, c = fc + colStep;
    while (r !== tr || c !== tc) {
      if (b[r][c]) return false;
      r += rowStep;
      c += colStep;
    }
    return true;
  }, []);

  const isValidMove = useCallback((fr, fc, tr, tc, b = board) => {
      if (!b || !b[fr] || !b[tr]) return false;

    const piece = b[fr][fc]; if (!piece) return false;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false; // ne menjünk pályán kívül

    const target = b[tr][tc]; if (target && target.color === piece.color) return false;
    const type = piece.type;

    if (type === 'pawn') {
  const dir = piece.color === 'white' ? -1 : 1;

  // sima lépés és dupla lépés
  if (fc === tc && !target && tr === fr + dir) return true;
  if (fc === tc && !target &&
      ((piece.color === 'white' && fr === 6) || (piece.color === 'black' && fr === 1)) &&
      !b[fr + dir][fc] && tr === fr + dir * 2) {
    // enPassantTarget beállítása a köztes mezőre
    return true;
  }

  // en passant
  if (Math.abs(tc - fc) === 1 && tr === fr + dir && !target) {
    if (enPassantTarget?.row === tr && enPassantTarget?.col === tc) {
      // mellette van az ellenfél pawn?
      const adjPawn = b[fr][tc];
      if (adjPawn && adjPawn.type === 'pawn' && adjPawn.color !== piece.color) return true;
    }
  }

  // sima ütés
  if (Math.abs(tc - fc) === 1 && tr === fr + dir && target) return true;

  return false;
}

    if (type === 'knight') return (Math.abs(fr - tr) === 1 && Math.abs(fc - tc) === 2) || (Math.abs(fr - tr) === 2 && Math.abs(fc - tc) === 1);
    if (type === 'bishop') return Math.abs(fr - tr) === Math.abs(fc - tc) && isPathClear(fr, fc, tr, tc, b);
    if (type === 'rook') {
  return ((fr !== tr && fc === tc) || (fr === tr && fc !== tc)) && isPathClear(fr, fc, tr, tc, b);
}

    if (type === 'queen') return ((fr !== tr && fc === tc) || (fr === tr && fc !== tc) || (Math.abs(fr - tr) === Math.abs(fc - tc))) && isPathClear(fr, fc, tr, tc, b);
   if (type === 'king') {
  // Normál lépés
  if (Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1) {
    const testBoard = simulateMove(b, fr, fc, tr, tc);
    // csak akkor térj vissza true-val, ha a lépés UTÁN nincs sakkban
    if (!isKingInCheck(piece.color, testBoard)) return true;
    return false;
  }

  // 🔥 Sáncolás logika
 if (!piece.hasMoved && fr === tr && Math.abs(fc - tc) === 2) {
  const row = fr;
  const isKingSide = tc > fc;
  const rookCol = isKingSide ? 7 : 0;
  const step = isKingSide ? 1 : -1;
  const rook = b[row][rookCol];

  // 🟣 mindkettőnek mozdulatlannak kell lennie
  if (!rook || rook.type !== 'rook' || rook.color !== piece.color || rook.hasMoved) return false;

  // közte ne legyen bábu
  for (let c = fc + step; c !== rookCol; c += step) {
    if (b[row][c]) return false;
  }

  // sakkon át ne lépjen
  if (isKingInCheck(piece.color, b)) return false;
  const midCol = fc + step;
  const midBoard = simulateMove(b, fr, fc, fr, midCol);
  const endBoard = simulateMove(b, fr, fc, tr, tc);
  if (isKingInCheck(piece.color, midBoard)) return false;
  if (isKingInCheck(piece.color, endBoard)) return false;

  return true;
}

}

return false;
  }, [board, isPathClear]);

  const isKingInCheck = useCallback((color, b) => {
    const checkBoard = b || board;
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = checkBoard[r][c];
        if (p && p.type === 'king' && p.color === color) {
          kingPos = { row: r, col: c };
          break;
        }
      }
    }
    if (!kingPos) return false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = checkBoard[r][c];
        if (p && p.color !== color && isValidMove(r, c, kingPos.row, kingPos.col, checkBoard)) {
          return true;
        }
      }
    }
    return false;
  }, [board, isValidMove]);

  const getValidMoves = useCallback((r, c) => {
    const moves = [];
    const piece = board[r][c];
    if (!piece) return moves;

    for (let tr = 0; tr < 8; tr++) {
      for (let tc = 0; tc < 8; tc++) {
        if (!isValidMove(r, c, tr, tc)) continue;
        const testBoard = simulateMove(board, r, c, tr, tc);
        if (!isKingInCheck(piece.color, testBoard)) moves.push({ row: tr, col: tc });
      }
    }
    return moves;
  }, [board, simulateMove, isValidMove, isKingInCheck]);

  const hasAnyValidMove = useCallback((color) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === color && getValidMoves(r, c).length > 0) return true;
      }
    }
    return false;
  }, [board, getValidMoves]);

  const updateGameStatus = useCallback(() => {
    if (isKingInCheck(currentTurn, board) && !hasAnyValidMove(currentTurn)) setGameStatus('checkmate');
    else if (!isKingInCheck(currentTurn, board) && !hasAnyValidMove(currentTurn)) setGameStatus('stalemate');
    else setGameStatus(null);
  }, [board, currentTurn, isKingInCheck, hasAnyValidMove]);

useEffect(() => {
  // isKingInCheck a te meglévő függvényedet használja
  const inCheck = isKingInCheck(currentTurn, board);

  // védőellenőrzés, ha valamiért nincs provider
  if (typeof setShowPumpkins === 'function') {
    setShowPumpkins(Boolean(inCheck));
  }

  // cleanup: ha a Board unmountol, kapcsold ki az overlayt
  return () => {
    if (typeof setShowPumpkins === 'function') {
      setShowPumpkins(false);
    }
  };
}, [board, currentTurn, isKingInCheck, setShowPumpkins]);
// töröljük a kijelölést, amikor animáció folyik
useEffect(() => {
  if (isAnimating) {
    setSelected(null);
    setValidMoves([]);
  }
}, [isAnimating, attackingPiece, hitPiece]);


  useEffect(updateGameStatus, [board, currentTurn, updateGameStatus]);
  /*
  useEffect(() => {
  if (!pendingEnPassantMove || isAnimating) return;

  console.log("🏁 En passant phase 2 (move forward)");

  const {
    fromRow,
    fromCol,
    toRow,     // ütés helye (epRow)
    toCol,
    finalRow,  // végső cél
    finalCol,
    capturedPawn,
    movingPiece,
  } = pendingEnPassantMove;

  const currentBoard = boardRef.current;
  const newBoard = simulateMove(currentBoard, fromRow, fromCol, finalRow, finalCol);

  // töröljük a leütött gyalogot
  newBoard[toRow][toCol] = null;

  // 🔹 új egyedi id-t adunk, hogy az animáció mindenképp triggereljen
  const newLastMove = {
    id: `${movingPiece.id}-ep-${Date.now()}`,
    fromRow,
    fromCol,
    toRow: finalRow,
    toCol: finalCol,
    captured: true,
    enPassant: true,
    targetId: capturedPawn.id,
    pieceId: movingPiece.id,
  };

  // 🔹 először beállítjuk a lastMove-ot (így a Piece észleli a mozgást)
  setLastMove(newLastMove);
  setBoard(newBoard);

  const nextTurn = currentTurn === "white" ? "black" : "white";
  setCurrentTurn(nextTurn);
  setSelected(null);
  setValidMoves([]);
  setEnPassantTarget(null);
  setPendingEnPassantMove(null);
  setHitPiece(null);
  setAttackingPiece(null);

  // 🔹 animáció vége jelző
  setTimeout(() => setIsAnimating(false), 50); // minimális késleltetés, hogy a DOM reagáljon

  if (onlineGameId) {
    updateDoc(doc(db, "games", onlineGameId), {
      board: boardToFirestore(newBoard),
      currentTurn: nextTurn,
      lastMove: newLastMove,
    }).catch(err => console.error("Firestore update error:", err));
  }

  console.log("✅ En passant phase 2 done", {
    from: [fromRow, fromCol],
    mid: [toRow, toCol],
    final: [finalRow, finalCol],
    captured: capturedPawn.id,
  });
}, [pendingEnPassantMove, isAnimating]);
*/

   const handleSquareClick = useCallback(async (r, c) => {
  if (isAnimating) return;
  if (!isPlayerTurn && gameMode !== 'local') return;

  const currentBoard = boardRef.current;
  const piece = currentBoard[r][c];
  const currentSelected = selectedRef.current;

  // Ha nincs kiválasztott bábu, és a kattintott bábú nem a saját színünk, kilépünk
  if (!currentSelected && (!piece || piece.color !== currentTurn)) return;
  let target = 0
  // Ha van kiválasztott bábu és érvényes lépés
  if (currentSelected && isValidMove(currentSelected.row, currentSelected.col, r, c, currentBoard)) {
    target = currentBoard[r][c];
    const movingPiece = currentBoard[currentSelected.row][currentSelected.col];
    const testBoard = simulateMove(currentBoard, currentSelected.row, currentSelected.col, r, c);
  let newBoard = simulateMove(currentBoard, currentSelected.row, currentSelected.col, r, c);
  let capturedPiece = currentBoard[r][c] || null;

  // En passant
// En passant capture// 🩸 EN PASSANT külön kezelés (ütés animáció + lépés egyben)
// 🩸 EN PASSANT – kétfázisú animációval (üt + lép)// 🩸 EN PASSANT – fázis1: beállítjuk az ütés animációt és a pending move-ot, majd bekapcsoljuk az animáció-flaggot
// 🩸 EN PASSANT – fázis1: leütés animáció (epRow, c) majd előrelépés (r, c)
// 🩸 EN PASSANT – fázis1: leütés animáció (epRow, c) majd előrelépés (r, c)
/*
if (
  movingPiece.type === "pawn" &&
  !target &&
  enPassantTarget &&
  enPassantTarget.row === r &&
  enPassantTarget.col === c
) {
  const epRow = movingPiece.color === "white" ? r + 1 : r - 1;
  const capturedPawn = currentBoard[epRow]?.[c];

  if (
    capturedPawn &&
    capturedPawn.type === "pawn" &&
    capturedPawn.color !== movingPiece.color
  ) {
    console.log("💥 En passant hit animation phase 1", capturedPawn);

    // 1️⃣ ütés animáció (ott, ahol az ellenség állt)
    setHitPiece({
      row: epRow,
      col: c,
      target: capturedPawn,
      targetId: capturedPawn.id,
    });

    // 2️⃣ támadó gyalog először az ellenség pozíciójára "üt"
    setAttackingPiece({
      fromRow: currentSelected.row,
      fromCol: currentSelected.col,
      toRow: epRow,
      toCol: c,
      pieceId: movingPiece.id,
    });

    // 3️⃣ ideiglenes tábla – eltávolítjuk az áldozatot
    const tempBoard = currentBoard.map(row => [...row]);
    tempBoard[epRow][c] = null;
    setBoard(tempBoard);

    // 4️⃣ ideiglenes lastMove (ütéshez)
    const moveId = `${movingPiece.id}-${Date.now()}`;
    const tempLastMove = {
      id: moveId,
      fromRow: currentSelected.row,
      fromCol: currentSelected.col,
      toRow: epRow,
      toCol: c,
      captured: true,
      enPassant: true,
      targetId: capturedPawn.id,
      pieceId: movingPiece.id,
      phase: 1, // fontos jelző
    };
    setLastMove(tempLastMove);

    // 5️⃣ mentjük fázis2-höz is (ref-be vagy state-be)
    setPendingEnPassantMove({
      ...tempLastMove,
      finalRow: r, // a végső cél, ahová majd lép
      finalCol: c,
      capturedPawn: { ...capturedPawn },
      movingPiece,
    });

    // 6️⃣ csak egyszer kapcsoljuk be az animációt
    setIsAnimating(true);
    return;
  } else {
    console.warn("⚠️ En passant target not found at", epRow, c, capturedPawn);
  }
}
*/
// 🩸 EN PASSANT – egyfázisú ütés + előrelépés animáció
// 
if (
  movingPiece.type === "pawn" &&
  !target &&
  enPassantTarget &&
  enPassantTarget.row === r &&
  enPassantTarget.col === c
) {
  console.log("🧩 En passant CHECK", {
    movingPiece,
    from: [currentSelected.row, currentSelected.col],
    to: [r, c],
    enPassantTarget,
    boardPieceAtTarget: currentBoard[r][c],
    previousEnPassantTarget: enPassantTarget,
  });

  if (
    enPassantTarget &&
    movingPiece.type === "pawn" &&
    r === enPassantTarget.row &&
    c === enPassantTarget.col
  ) {
    const epRow = movingPiece.color === "white" ? r + 1 : r - 1;
    const capturedPawn = currentBoard[epRow]?.[c];

    console.log("🎯 En passant detailed check", {
      epRow,
      c,
      capturedPawn,
      epTarget: [r, c],
      currentBoardPreview: currentBoard.map(row =>
        row.map(cell => (cell ? cell.type[0] : ".")).join(" ")
      ),
    });

    if (capturedPawn && capturedPawn.type === "pawn") {
      console.log("✅ En passant detected!", {
        attacker: movingPiece.id,
        captured: capturedPawn.id,
        from: [currentSelected.row, currentSelected.col],
        to: [r, c],
        epRow,
      });

      // 🔹 ütés és mozgás beállítása
      setHitPiece({
        row: epRow,
        col: c,
        target: capturedPawn,
        targetId: capturedPawn.id,
      });

      setAttackingPiece({
        fromRow: currentSelected.row,
        fromCol: currentSelected.col,
        toRow: epRow,   // ide mozdul először
        toCol: c,
        finalRow: r,    // végső cél (üres mező)
        finalCol: c,
        pieceId: movingPiece.id,
      });

      // A Piece.jsx intézi az animáció utáni frissítést
    } else {
      console.warn("🚫 En passant rejected: nincs pawn a mögötte lévő sorban!");
    }
  }
}





  // King side / queen side castling
    // King-side / Queen-side castling
// King side / queen side castling// 🏰 Castling (king + rook move)
// King side / queen side castling
if (movingPiece.type === "king" && Math.abs(c - currentSelected.col) === 2) {

  const isKingSide = c > currentSelected.col;
  const rookCol = isKingSide ? 7 : 0;
  const newRookCol = isKingSide ? c - 1 : c + 1;

  // Bástya referencia
  const rook = currentBoard[r][rookCol];
  const rookId = rook?.id;
  const rookRow = r;

  // 🔍 Debug log — most már működni fog
  console.log("SÁNC:", {
    castling: true,
    rookMove: {
      rookId,
      fromCol: rookCol,
      toCol: newRookCol,
      row: rookRow,
    },
  });

  // Mozgatjuk a királyt
  const newBoard = simulateMove(currentBoard, currentSelected.row, currentSelected.col, r, c);

  // Mozgatjuk a bástyát
  newBoard[rookRow][newRookCol] = { ...rook, hasMoved: true };
  newBoard[rookRow][rookCol] = null;

  // Jelöljük, hogy a király is lépett
  newBoard[r][c] = { ...newBoard[r][c], hasMoved: true };

  // Létrehozunk egy "lastMove" objektumot a bástyára is
  const newLastMove = {
    id: `${movingPiece.id}-${Date.now()}`,
    fromRow: currentSelected.row,
    fromCol: currentSelected.col,
    toRow: r,
    toCol: c,
    castling: true,
    pieceId: movingPiece.id,
    rookMove: {
      fromCol: rookCol,
      toCol: newRookCol,
      row: rookRow,
      rookId:rook.id,
    },
  };

  setBoard(newBoard);
  setLastMove(newLastMove);
  setCurrentTurn(currentTurn === "white" ? "black" : "white");
  setSelected(null);
  setValidMoves([]);

  // 🔥 Firestore frissítés (ha online játék)
  if (onlineGameId) {
    await updateDoc(doc(db, "games", onlineGameId), {
      board: boardToFirestore(newBoard),
      currentTurn: currentTurn === "white" ? "black" : "white",
      lastMove: newLastMove,
    });
  }

  // Sáncolás befejezve
  return;
}



    if (isKingInCheck(movingPiece.color, testBoard)) return;
 
   
    if (target) {
      
      setHitPiece({ row: r, col: c, target, targetId: target.id });
      setAttackingPiece({
        fromRow: currentSelected.row,
        fromCol: currentSelected.col,
        toRow: r,
        toCol: c,
        pieceId: movingPiece.id,
      }); 
      if (capturedPiece) {
      setHitPiece({
        row: r,
        col: c,
        target: capturedPiece,
        targetId: capturedPiece.id
      });
      setAttackingPiece({
        fromRow: currentSelected.row,
        fromCol: currentSelected.col,
        toRow: r,
        toCol: c,
        pieceId: movingPiece.id
      });
    }

      const newLastMove = {
        id: `${movingPiece.id}-${Date.now()}`,
        fromRow: currentSelected.row,
        fromCol: currentSelected.col,
        toRow: r,
        toCol: c,
        captured: true,
        targetId: target.id,
        pieceId: movingPiece.id,
      };

      setLastMove(newLastMove);
      setCurrentTurn(currentTurn === "white" ? "black" : "white");
      setSelected(null);
      setValidMoves([]);

      if (onlineGameId) {
        updateDoc(doc(db, "games", onlineGameId), {
          currentTurn: currentTurn === "white" ? "black" : "white",
          lastMove: newLastMove,
        });
      }
    } else {
    
      console.log("barack");
      
      const newBoard = simulateMove(currentBoard, currentSelected.row, currentSelected.col, r, c);
      const newLastMove = {
        id: `${movingPiece.id}-${Date.now()}`,
        fromRow: currentSelected.row,
        fromCol: currentSelected.col,
        toRow: r,
        toCol: c,
        captured: false,
        pieceId: movingPiece.id,
      };

      setBoard(newBoard);
      setLastMove(newLastMove);
      setCurrentTurn(currentTurn === "white" ? "black" : "white");

      if (onlineGameId) {
      const updateData = {
        board: boardToFirestore(newBoard),
        currentTurn: currentTurn === "white" ? "black" : "white",
        lastMove: newLastMove,
      };
      if (!target && capturedPiece && capturedPiece.type === "pawn") {
        // en passant
        updateData.board = boardToFirestore(newBoard);
      }
      await updateDoc(doc(db, "games", onlineGameId), updateData);
    }
      
    }
    // pawn promotion check


    setSelected(null);
    setValidMoves([]);
   // En passant target management
// En passant target management
// En passant target management
if (movingPiece.type === "pawn" && Math.abs(r - currentSelected.row) === 2) {
  // most ténylegesen kettőt lépett -> itt hozunk létre enPassantTarget-et
  const dir = movingPiece.color === "white" ? -1 : 1;
  setEnPassantTarget({ row: currentSelected.row + dir, col: currentSelected.col });
} else {
  // bármilyen más lépés után töröljük
  setEnPassantTarget(null);
}
if (
  movingPiece.type === "pawn" &&
  ((movingPiece.color === "white" && r === 0) ||
   (movingPiece.color === "black" && r === 7))
) {
  // ne lépjen még, hanem jelenítsük meg a popupot
  setPromotionData({
    row: r,
    col: c,
    color: movingPiece.color,
    fromRow: currentSelected.row,
    fromCol: currentSelected.col,
  });
  return;
}

  }
  // Ha kattintottunk a saját bábuinkra, kiválasztjuk azt
  else if (piece && piece.color === currentTurn) {
    setSelected({ row: r, col: c });
    setValidMoves(getValidMoves(r, c));
  }
  
}

, [
  isAnimating, isPlayerTurn, gameMode, currentTurn,
  isValidMove, simulateMove, isKingInCheck, onlineGameId,
  getValidMoves, boardToFirestore, setAttackingPiece, setHitPiece
]);

  const isInValidMoves = useCallback((r, c) => validMoves.some(m => m.row === r && m.col === c), [validMoves]);
  const isLastMoveSquare = useCallback((r, c) =>
    lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c)), [lastMove]);

  // 🔥 Segédfüggvény a piece ID alapján való kereséshez
  const findPieceById = useCallback((b, id) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.id === id) return { row: r, col: c };
      }
    }
    return null;
  }, []);

  // memoizált squares render (kevesebb újraelőállítás)
  const renderedSquares = useMemo(() => {
    return Array.from({ length: 8 }).flatMap((_, r) =>
      Array.from({ length: 8 }).map((_, c) => {
        const isWhite = (r + c) % 2 === 0;
        const valid = isInValidMoves(r, c);
        const last = isLastMoveSquare(r, c);
        const selectedHere = selected && selected.row === r && selected.col === c;

        return (
          <div key={`sq-${r}-${c}`} onClick={() => handleSquareClick(r, c)}
            className={`square ${selectedHere ? 'selected-square' : ''} ${last ? 'last-move' : ''}`}
            style={{
              position: 'absolute',
              top: r * squareSize,
              left: c * squareSize,
              width: squareSize,
              height: squareSize,
              backgroundColor: isWhite ? '#1a1a1a' : '#2c2c2c',
              border: '1px solid #111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent'
            }}>
            {valid && <div className="move-hint" />}
          </div>
        );
      })
    );
  }, [squareSize, selected, isInValidMoves, isLastMoveSquare, handleSquareClick]);

  // memoizált pieces render
  const renderedPieces = useMemo(() => {
    return board.flatMap((rowArr, r) =>
      rowArr.map((piece, c) => {
        if (!piece) return null;

        const isBeingHit =
          hitPiece?.row === r && hitPiece?.col === c && hitPiece?.targetId === piece.id
            ? hitPiece
            : null;

        // prevPos logika — ugyanaz mint korábban
        let prevPos = null;
        outerLoop: for (let pr = 0; pr < 8; pr++) {
          for (let pc = 0; pc < 8; pc++) {
            const prevPiece = prevBoardRef.current[pr][pc];
            if (
              prevPiece &&
              prevPiece.id === piece.id &&
              !usedPrevPositionsRef.current.has(prevPiece.id)
            ) {
              prevPos = { row: pr, col: pc };
              usedPrevPositionsRef.current.add(prevPiece.id);
              break outerLoop;
            }
          }
        }

        const effectivePrevRow = prevPos?.row ?? r;
        const effectivePrevCol = prevPos?.col ?? c;
        const isSelected = selected?.row === r && selected?.col === c;

        return (
          <Piece
            key={piece.id}
            piece={piece}
            row={r}
            col={c}
            prevRow={effectivePrevRow}
            prevCol={effectivePrevCol}
            lastMove={lastMove}
            squareSize={squareSize}
            onClick={() => handleSquareClick(r, c)}
            selected={isSelected}
            hitPiece={isBeingHit}
            setHitPiece={setHitPiece}
            attackingPiece={attackingPiece}
            setAttackingPiece={setAttackingPiece}
            setIsAnimating={setIsAnimating}
            updateBoard={updateBoard}
          />
        );
      })
    );
  }, [board, hitPiece, lastMove, squareSize, selected, attackingPiece, setIsAnimating, updateBoard]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', maxWidth: 700, margin: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div className="turn-indicator" style={{ color: isKingInCheck(currentTurn, board) ? 'red' : 'white' }}>
          {gameStatus === 'checkmate' && `Checkmate! ${currentTurn === 'white' ? 'Black' : 'White'} wins`}
          {gameStatus === 'stalemate' && 'Stalemate! Draw'}
          {!gameStatus && `${currentTurn === 'white' ? "White's turn" : "Black's turn"}${isKingInCheck(currentTurn, board) ? ' — Check!' : ''}`}
        </div>
      </div>

      <div className="chess-board" style={{ position: 'relative', width: boardWidth, height: boardWidth, border: '2px solid #333', margin: 'auto', transformOrigin: 'center center' }}>
        {renderedSquares}
        {renderedPieces}
        { /* blokkoló réteg animáció idejére */ }
{(isAnimating || attackingPiece || hitPiece) && (
  <div
    className="board-blocker"
    onClick={(e) => e.stopPropagation()}
    role="presentation"
    aria-hidden="true"
  />
)}

{promotionData && (
  <PromotionPopup
    color={promotionData.color}
    onSelect={(type) => {
      setBoard(prev => {
        const newBoard = prev.map(row => row.map(cell => (cell ? { ...cell } : null)));

        // Keresés: először a promóciós (cél) mezőn, fallback a from mezőre, végső fallback dummy objektum
        const pawn =
          newBoard[promotionData.row]?.[promotionData.col] ??
          newBoard[promotionData.fromRow]?.[promotionData.fromCol] ??
          { color: promotionData.color, id: `promo-${Date.now()}`, hasMoved: true };

        // töröljük a kiinduló mezőt (ha még ott maradt)
        if (newBoard[promotionData.fromRow]?.[promotionData.fromCol]) {
          newBoard[promotionData.fromRow][promotionData.fromCol] = null;
        }

        // beállítjuk a promótált figurát a célmezőn
        newBoard[promotionData.row][promotionData.col] = {
          ...pawn,
          type,
          symbol: getSymbol(type, pawn.color ?? promotionData.color),
          id: `${pawn.color || promotionData.color}-${type}-${Date.now()}`,
          hasMoved: true,
        };

        return newBoard;
      });
      
      // Ha online játék, érdemes itt Firestore-t is frissíteni:
      // if (onlineGameId) { updateDoc(doc(db, "games", onlineGameId), { board: boardToFirestore(boardRef.current) }).catch(console.error); }

      setPromotionData(null);
    }}
    col={promotionData.col}
    squareSize={squareSize}

  />
)}


      </div>
    </div>
  );
};

export default Board;

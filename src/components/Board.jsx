// Board.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Piece } from './Piece';
import './halloween-chess.css';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { PromotionPopup } from './PromotionPopup';
import { usePumpkins } from '../pumpkins/PumpkinContext';

// === Board component (fixed & stabilized) ===
export const Board = ({ onlineGameId, playerColor, gameMode }) => {
  const wrapperRef = useRef(null);

  // main reactive state
  const [board, setBoard] = useState(() => getInitialBoard());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [attackingPiece, setAttackingPiece] = useState(null);
  const [hitPiece, setHitPiece] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [boardWidth, setBoardWidth] = useState(680);
  const [bothPlayersJoined, setBothPlayersJoined] = useState(false);
  const [promotionData, setPromotionData] = useState(null);
  const [gameStatus, setGameStatus] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // pumpkins (overlay) control
  const { setShowPumpkins } = usePumpkins();

  // refs for stable access inside callbacks and effects
  const boardRef = useRef(board);
  const selectedRef = useRef(selected);
  const currentTurnRef = useRef(currentTurn);
  const enPassantRef = useRef(enPassantTarget);
  const lastMoveRef = useRef(lastMove);
  const usedPrevPositionsRef = useRef(new Set());
  const prevBoardRef = useRef(getInitialBoard());

  // NEW: refs for attacking/hit/animating to avoid stale closures
  const attackingRef = useRef(attackingPiece);
  const hitRef = useRef(hitPiece);
  const isAnimatingRef = useRef(isAnimating);

  // keep refs in sync with state
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);
  useEffect(() => { enPassantRef.current = enPassantTarget; }, [enPassantTarget]);
  useEffect(() => { lastMoveRef.current = lastMove; }, [lastMove]);

  // sync new refs
  useEffect(() => { attackingRef.current = attackingPiece; }, [attackingPiece]);
  useEffect(() => { hitRef.current = hitPiece; }, [hitPiece]);
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);

  const isPlayerTurn = useMemo(() => gameMode === 'local' || playerColor === currentTurn, [playerColor, currentTurn, gameMode]);

  const squareSize = useMemo(() => Math.max(20, boardWidth / 8), [boardWidth]);

  // Responsive board width
  useEffect(() => {
    const updateWidth = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.clientWidth * 0.95;
      setBoardWidth(Math.max(180, Math.min(width, 700)));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    wrapperRef.current && ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Show pumpkins overlay when current player is in check
  useEffect(() => {
    const inCheck = isKingInCheck(currentTurn, board);
    if (typeof setShowPumpkins === 'function') setShowPumpkins(Boolean(inCheck));
    return () => { if (typeof setShowPumpkins === 'function') setShowPumpkins(false); };
  }, [board, currentTurn, setShowPumpkins]);

  // Clear selection during animation
  useEffect(() => {
    if (isAnimating) {
      setSelected(null);
      setValidMoves([]);
    }
  }, [isAnimating]);

  // prevBoard reset when a new lastMove arrives or animation resets
  useEffect(() => {
    if (lastMove) {
      usedPrevPositionsRef.current.clear();
    }
  }, [lastMove]);

  // If nothing is animating, clear transient attack/hit state
  useEffect(() => {
    if (!isAnimating) {
      // keep board state as is, but clear transient visual markers
      setHitPiece(null);
      setAttackingPiece(null);
    }
  }, [isAnimating]);

  // --- Firestore helpers ---
  const firestoreToBoard = useCallback((data) => {
    if (!data) return getInitialBoard();
    const out = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => (data?.[`${r}-${c}`] ? { ...data[`${r}-${c}`] } : null))
    );
    return out;
  }, []);

  const boardToFirestore = useCallback((boardArray) => {
    const obj = {};
    if (!Array.isArray(boardArray)) return obj;
    boardArray.forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (cell) obj[`${r}-${c}`] = { ...cell };
      });
    });
    return obj;
  }, []);

  const syncOnline = useCallback(async (payload) => {
    if (!onlineGameId) return;
    const updateData = {};
    if (payload.board) updateData.board = boardToFirestore(payload.board);
    if ('lastMove' in payload) updateData.lastMove = payload.lastMove;
    if ('currentTurn' in payload) updateData.currentTurn = payload.currentTurn;
    // send attacking / hit as explicit fields (or null)
    updateData.hitPiece = payload.hitPiece ?? null;
    updateData.attackingPiece = payload.attackingPiece ?? null;
    updateData.enPassantTarget = payload.enPassantTarget ?? null;
    if ('promotionData' in payload && payload.promotionData !== undefined) {
      updateData.promotionData = payload.promotionData;
    }
    updateData.lastMoveTime = serverTimestamp();
    try {
      await updateDoc(doc(db, 'games', onlineGameId), updateData);
    } catch (err) {
      console.error('syncOnline failed', err);
    }
  }, [onlineGameId, boardToFirestore]);

  // === Core board utilities ===
  function getInitialBoard() {
    const newBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    const addId = (piece, positionKey) => ({
      ...piece,
      id: `${piece.color}-${piece.type}-${positionKey}`,
      hasMoved: false
    });

    const backRank = (color, row) =>
      ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
        .map((type, i) => addId({ type, color, symbol: getSymbol(type, color) }, `${row}-${i}`));

    newBoard[0] = backRank('black', 0);
    newBoard[1] = Array(8).fill(null).map((_, i) => addId({ type: 'pawn', color: 'black', symbol: getSymbol('pawn', 'black') }, `1-${i}`));
    newBoard[6] = Array(8).fill(null).map((_, i) => addId({ type: 'pawn', color: 'white', symbol: getSymbol('pawn', 'white') }, `6-${i}`));
    newBoard[7] = backRank('white', 7);
    return newBoard;
  }

  function getSymbol(type, color) {
    const map = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return map[color][type];
  }

  const cloneBoard = useCallback((b) => b.map(row => row.map(cell => (cell ? { ...cell } : null))), []);
  const simulateMove = useCallback((b, fr, fc, tr, tc) => {
    const newB = cloneBoard(b);
    const moving = newB[fr][fc] ? { ...newB[fr][fc] } : null;
    if (!moving) return newB;
    moving.hasMoved = true;
    newB[tr][tc] = moving;
    newB[fr][fc] = null;
    return newB;
  }, [cloneBoard]);

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

  const isValidMove = useCallback((fr, fc, tr, tc, b = boardRef.current) => {
    if (!b || !b[fr] || !b[tr]) return false;
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    const piece = b[fr][fc]; if (!piece) return false;
    const target = b[tr][tc]; if (target && target.color === piece.color) return false;
    const type = piece.type;

    if (type === 'pawn') {
      const dir = piece.color === 'white' ? -1 : 1;
      if (fc === tc && !target && tr === fr + dir) return true;
      const fromStart = (piece.color === 'white' && fr === 6) || (piece.color === 'black' && fr === 1);
      if (fc === tc && !target && fromStart && !b[fr + dir][fc] && tr === fr + dir * 2) return true;
      if (Math.abs(tc - fc) === 1 && tr === fr + dir && target) return true;
      if (Math.abs(tc - fc) === 1 && tr === fr + dir && !target) {
        const ep = enPassantRef.current;
        if (ep && ep.row === tr && ep.col === tc) {
          const adjPawn = b[fr][tc];
          if (adjPawn && adjPawn.type === 'pawn' && adjPawn.color !== piece.color) return true;
        }
      }
      return false;
    }

    if (type === 'knight') return (Math.abs(fr - tr) === 1 && Math.abs(fc - tc) === 2) || (Math.abs(fr - tr) === 2 && Math.abs(fc - tc) === 1);
    if (type === 'bishop') return Math.abs(fr - tr) === Math.abs(fc - tc) && isPathClear(fr, fc, tr, tc, b);
    if (type === 'rook') return ((fr !== tr && fc === tc) || (fr === tr && fc !== tc)) && isPathClear(fr, fc, tr, tc, b);
    if (type === 'queen') return ((fr !== tr && fc === tc) || (fr === tr && fc !== tc) || (Math.abs(fr - tr) === Math.abs(fc - tc))) && isPathClear(fr, fc, tr, tc, b);

    if (type === 'king') {
      if (Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1) {
        const testBoard = simulateMove(b, fr, fc, tr, tc);
        if (!isKingInCheck(piece.color, testBoard)) return true;
        return false;
      }
      if (!piece.hasMoved && fr === tr && Math.abs(fc - tc) === 2) {
        const row = fr;
        const isKingSide = tc > fc;
        const rookCol = isKingSide ? 7 : 0;
        const rook = b[row][rookCol];
        if (!rook || rook.type !== 'rook' || rook.color !== piece.color || rook.hasMoved) return false;
        const step = isKingSide ? 1 : -1;
        for (let c = fc + step; c !== rookCol; c += step) if (b[row][c]) return false;
        if (isKingInCheck(piece.color, b)) return false;
        const midCol = fc + step;
        const midBoard = simulateMove(b, fr, fc, fr, midCol);
        if (isKingInCheck(piece.color, midBoard)) return false;
        const endBoard = simulateMove(b, fr, fc, tr, tc);
        if (isKingInCheck(piece.color, endBoard)) return false;
        return true;
      }
    }
    return false;
  }, [isPathClear, simulateMove]);

  const isKingInCheck = useCallback((color, b = boardRef.current) => {
    const checkBoard = b;
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = checkBoard[r][c];
        if (p && p.type === 'king' && p.color === color) { kingPos = { row: r, col: c }; break; }
      }
      if (kingPos) break;
    }
    if (!kingPos) return false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = checkBoard[r][c];
        if (p && p.color !== color && isValidMove(r, c, kingPos.row, kingPos.col, checkBoard)) return true;
      }
    }
    return false;
  }, [isValidMove]);

  const getValidMoves = useCallback((r, c) => {
    const moves = [];
    const piece = boardRef.current[r][c];
    if (!piece) return moves;
    for (let tr = 0; tr < 8; tr++) {
      for (let tc = 0; tc < 8; tc++) {
        if (!isValidMove(r, c, tr, tc)) continue;
        const testBoard = simulateMove(boardRef.current, r, c, tr, tc);
        if (!isKingInCheck(piece.color, testBoard)) moves.push({ row: tr, col: tc });
      }
    }
    return moves;
  }, [isValidMove, simulateMove, isKingInCheck]);

  const hasAnyValidMove = useCallback((color) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardRef.current[r][c];
        if (piece && piece.color === color && getValidMoves(r, c).length > 0) return true;
      }
    }
    return false;
  }, [getValidMoves]);

  const updateGameStatus = useCallback(() => {
    if (isKingInCheck(currentTurn, board) && !hasAnyValidMove(currentTurn)) setGameStatus('checkmate');
    else if (!isKingInCheck(currentTurn, board) && !hasAnyValidMove(currentTurn)) setGameStatus('stalemate');
    else setGameStatus(null);
  }, [board, currentTurn, hasAnyValidMove, isKingInCheck]);

  useEffect(() => { updateGameStatus(); }, [board, currentTurn, updateGameStatus]);
  const findPieceById = useCallback((b, id) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.id === id) return { row: r, col: c };
      }
    }
    return null;
  }, []);

  // --- Firestore: initialization & realtime listener ---
  useEffect(() => {
    if (!onlineGameId) return;
    let unsub = null;

    const init = async () => {
      try {
        // Reset transient state before loading Firestore
        setIsAnimating(false);
        setAttackingPiece(null);
        setHitPiece(null);
        setSelected(null);
        setValidMoves([]);
        setGameStatus(null);
        setLastMove(null);
        setShowPumpkins(false);
        usedPrevPositionsRef.current.clear();
        prevBoardRef.current = getInitialBoard();

        const user = auth.currentUser;
        const gameRef = doc(db, 'games', onlineGameId);
        const snapshot = await getDoc(gameRef);
        let newBoard = getInitialBoard();

        if (!snapshot.exists()) {
          const players =
            playerColor === 'white'
              ? { white: user?.uid || null, black: null }
              : { white: null, black: user?.uid || null };

          await setDoc(gameRef, {
            board: boardToFirestore(newBoard),
            currentTurn: 'white',
            lastMove: null,
            players,
            hitPiece: null,
            attackingPiece: null,
            createdAt: serverTimestamp(),
          });
        } else {
          const data = snapshot.data();

          // Clear stale attack data on startup (prevents stuck animations after a refresh)
          if (data.hitPiece || data.attackingPiece) {
            console.log('Clearing stale attack data after reload...');
            try {
              await updateDoc(gameRef, {
                hitPiece: null,
                attackingPiece: null,
              });
            } catch (err) {
              console.warn('Could not clear stale attack data:', err);
            }
            data.hitPiece = null;
            data.attackingPiece = null;
          }

          if (data.board) newBoard = firestoreToBoard(data.board);
          setBoard(newBoard);
          prevBoardRef.current = cloneBoard(newBoard);
          boardRef.current = newBoard;

          if ('promotionData' in data && data.promotionData) {
            setPromotionData(data.promotionData);
          } else {
            setPromotionData(null);
          }

          setLastMove(data.lastMove || null);
          setBothPlayersJoined(!!data.players?.white && !!data.players?.black);
        }

        // Snapshot listener
        unsub = onSnapshot(gameRef, (snap) => {
          const data = snap.data();
          if (!data) return;

          if (!hasMounted) {
            setIsAnimating(false);
            setHasMounted(true);
          }

          const previous = cloneBoard(boardRef.current);

          // Board update (only if different)
          if (data.board) {
            const incoming = firestoreToBoard(data.board);
            const old = boardRef.current;
            if (JSON.stringify(incoming) !== JSON.stringify(old)) {
              prevBoardRef.current = cloneBoard(old);
              boardRef.current = incoming;
              setBoard(incoming);
            }
          }

          // Turn update
          if ('currentTurn' in data) {
            const newTurn = data.currentTurn || (lastMoveRef.current?.piece?.color ?? currentTurnRef.current);
            setCurrentTurn(newTurn);
          }

          // enPassantTarget
          if ('enPassantTarget' in data) {
            setEnPassantTarget(data.enPassantTarget || null);
          }

          // players joined
          if (data.players) setBothPlayersJoined(!!data.players.white && !!data.players.black);

          // Last move handling
          if (data.lastMove && data.lastMove.id !== lastMoveRef.current?.id) {
            const lm = data.lastMove;
            setLastMove(lm);

            if (lm.captured) {
              const targetPos = findPieceById(previous, lm.targetId);
              if (targetPos) {
                setHitPiece({
                  row: targetPos.row,
                  col: targetPos.col,
                  targetId: lm.targetId,
                });
              }

              setAttackingPiece({
                fromRow: lm.fromRow,
                fromCol: lm.fromCol,
                toRow: lm.toRow,
                toCol: lm.toCol,
                pieceId: lm.pieceId,
              });
            } else if (lm.castling) {
              setAttackingPiece({
                fromRow: lm.fromRow,
                fromCol: lm.fromCol,
                toRow: lm.toRow,
                toCol: lm.toCol,
                pieceId: lm.pieceId,
              });
            }

            if ('enPassantTarget' in data) setEnPassantTarget(data.enPassantTarget || null);
            if ('promotionData' in data) setPromotionData(data.promotionData || null);
          } else if (!data.lastMove) {
            // if firestore removed lastMove, clear our transient states
            setHitPiece(null);
            setAttackingPiece(null);
          }

          // IMPORTANT: sync attacking/hit from server explicitly and set isAnimating based on their presence
          setAttackingPiece(data.attackingPiece || null);
          setHitPiece(data.hitPiece || null);
          const animActive = Boolean(data.attackingPiece || data.hitPiece);
          setIsAnimating(animActive);
        });

      } catch (err) {
        console.error('init game failed', err);
      }
    };

    setIsAnimating(false);
    setAttackingPiece(null);
    setHitPiece(null);
    init();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [onlineGameId, playerColor, firestoreToBoard, boardToFirestore, cloneBoard, findPieceById]);

  // updateBoard: apply locally and optionally write final board to firestore
  const updateBoard = useCallback(async (fromRow, fromCol, toRow, toCol, options = {}) => {
    const current = boardRef.current;
    if (!Array.isArray(current) || current.length !== 8) {
      console.error('updateBoard: invalid current board', current);
      return;
    }

    prevBoardRef.current = cloneBoard(current);
    let nb = simulateMove(current, fromRow, fromCol, toRow, toCol);

    if (options.removeTarget) {
      const lm = lastMoveRef.current;
      let removed = false;

      if (lm?.targetId) {
        for (let r = 0; r < 8 && !removed; r++) {
          for (let c = 0; c < 8; c++) {
            if (nb[r][c] && nb[r][c].id === lm.targetId) {
              nb[r][c] = null;
              removed = true;
              break;
            }
          }
        }
      }

      if (!removed && lm?.enPassant) {
        const mover = current[fromRow]?.[fromCol];
        const moverColor = mover?.color ?? null;
        const capturedRow = moverColor === 'white' ? toRow + 1 : toRow - 1;
        if (capturedRow >= 0 && capturedRow <= 7 && typeof toCol === 'number') {
          nb[capturedRow][toCol] = null;
          removed = true;
        }
      }
    }

    if (!Array.isArray(nb) || nb.length !== 8 || !nb.every(r => Array.isArray(r) && r.length === 8)) {
      console.error('updateBoard: invalid simulated board shape', nb);
      return;
    }

    setBoard(nb);

    if (options.finalizeOnline && onlineGameId) {
      try {
        await updateDoc(doc(db, 'games', onlineGameId), {
          board: boardToFirestore(nb),
          hitPiece: null,
          attackingPiece: null,
          enPassantTarget: enPassantRef.current ?? null,
          promotionData: null,
          lastMoveTime: serverTimestamp(),
        });
      } catch (err) {
        console.error('updateBoard firestore write failed', err);
      }
    }

    return nb;
  }, [onlineGameId, boardToFirestore, cloneBoard, simulateMove]);

  // sendMoveOnline wrapper (kept for completeness)
  const sendMoveOnline = useCallback(async (move) => {
    if (!onlineGameId) return;
    try {
      await updateDoc(doc(db, 'games', onlineGameId), {
        board: boardToFirestore(boardRef.current),
        lastMove: move.lastMove,
        attackingPiece: move.attackingPiece || null,
        hitPiece: move.hitPiece || null,
        currentTurn: move.nextTurn,
        enPassantTarget: move.enPassantTarget || null,
        promotionData: move.promotionData || null,
        lastMoveTime: serverTimestamp(),
      });
    } catch (err) { console.error('sendMoveOnline failed', err); }
  }, [onlineGameId, boardToFirestore]);

  // --- Main click handler (uses refs to avoid stale closure) ---
  // --- Main click handler (uses refs to avoid stale closure) ---
const handleSquareClick = useCallback(async (r, c) => {
  
console.log("💡 My color:", playerColor, "Turn:", currentTurnRef.current);

  // Don't let a player move during remote animation
  if (gameMode === "online") {
    const remoteAnimActive = Boolean(attackingRef.current || hitRef.current);
    if (remoteAnimActive) return;

    // Only proceed if it's your turn
    if (!currentTurnRef.current || !playerColor) return;
    if (currentTurnRef.current !== playerColor) return;
  }

  if (!hasMounted) setHasMounted(true), setIsAnimating(false);

  const currentBoard = boardRef.current;
  const piece = currentBoard[r][c];
  const curSelected = selectedRef.current;

  // --- Selecting a piece ---
  if (!curSelected) {
    if (!piece) return;

    if (gameMode === "online") {
      // Only pick your own pieces
      if (piece.color !== playerColor) return;
    } else if (gameMode === "local") {
      // Only pick the side whose turn it is
      if (piece.color !== currentTurnRef.current) return;
    }

    setSelected({ row: r, col: c });
    setValidMoves(getValidMoves(r, c));
    return;
  }

    // deselect if same square
    if (curSelected.row === r && curSelected.col === c) {
      setSelected(null);
      setValidMoves([]);
      return;
    }

    // select other own piece
    if (piece && piece.color === currentTurnRef.current) {
      setSelected({ row: r, col: c });
      setValidMoves(getValidMoves(r, c));
      return;
    }

    // invalid move
    if (!isValidMove(curSelected.row, curSelected.col, r, c, currentBoard)) {
      setSelected(null);
      setValidMoves([]);
      return;
    }

    // attempt to move (rest of your move logic remains essentially unchanged)
    if (isValidMove(curSelected.row, curSelected.col, r, c, currentBoard)) {
      const movingPiece = currentBoard[curSelected.row][curSelected.col];
      const target = currentBoard[r][c] || null;
      const nextTurn = currentTurnRef.current === 'white' ? 'black' : 'white';

      // en passant
      if (movingPiece.type === 'pawn' && !target) {
        const ep = enPassantRef.current;
        if (ep && ep.row === r && ep.col === c) {
          const epCaptureRow = movingPiece.color === 'white' ? r + 1 : r - 1;
          const capturedPawn = currentBoard[epCaptureRow]?.[c];
          if (capturedPawn && capturedPawn.type === 'pawn') {
            const newLastMove = {
              id: `${movingPiece.id}-${Date.now()}`,
              fromRow: curSelected.row,
              fromCol: curSelected.col,
              toRow: r,
              toCol: c,
              captured: true,
              targetId: capturedPawn.id,
              pieceId: movingPiece.id,
              enPassant: true,
            };

            setLastMove(newLastMove);
            if (!onlineGameId) setCurrentTurn(nextTurn);
            setEnPassantTarget(null);

            setHitPiece({ row: epCaptureRow, col: c, target: capturedPawn, targetId: capturedPawn.id });
            setAttackingPiece({
              fromRow: curSelected.row,
              fromCol: curSelected.col,
              toRow: epCaptureRow,
              toCol: c,
              finalRow: r,
              finalCol: c,
              pieceId: movingPiece.id,
            });
            setIsAnimating(true);
            prevBoardRef.current = cloneBoard(currentBoard);

            // prepare new board locally (so UI shows pawn moved)
            const newBoard = cloneBoard(currentBoard);
            newBoard[r][c] = { ...movingPiece, hasMoved: true };
            newBoard[curSelected.row][curSelected.col] = null;
            setBoard(newBoard);

            // sync only meta to start animation remotely
            if (onlineGameId) {
              await syncOnline({
                lastMove: newLastMove,
                currentTurn: nextTurn,
                hitPiece: { row: epCaptureRow, col: c, target: capturedPawn, targetId: capturedPawn.id },
                attackingPiece: { fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, pieceId: movingPiece.id, finalRow: r, finalCol: c },
                enPassantTarget: null,
                promotionData: null,
              });
            }

            setSelected(null);
            setValidMoves([]);
            return;
          }
        }
      }

      // castling
      if (movingPiece.type === 'king' && Math.abs(c - curSelected.col) === 2) {
        const isKingSide = c > curSelected.col;
        const rookCol = isKingSide ? 7 : 0;
        const newRookCol = isKingSide ? c - 1 : c + 1;
        const rook = currentBoard[r][rookCol];

        const newBoard = simulateMove(currentBoard, curSelected.row, curSelected.col, r, c);
        if (rook) {
          newBoard[r][newRookCol] = { ...rook, hasMoved: true };
          newBoard[r][rookCol] = null;
        }
        newBoard[r][c] = { ...newBoard[r][c], hasMoved: true };

        const newLastMove = { id: `${movingPiece.id}-${Date.now()}`, fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, castling: true, pieceId: movingPiece.id, rookMove: { fromCol: rookCol, toCol: newRookCol, row: r, rookId: rook?.id } };

        prevBoardRef.current = cloneBoard(currentBoard);
        setBoard(newBoard);
        setLastMove(newLastMove);
        if (!onlineGameId) setCurrentTurn(nextTurn);
        setSelected(null);
        setValidMoves([]);

        setHitPiece(target ? { row: r, col: c, target, targetId: target.id } : null);
        setAttackingPiece(target ? { fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, pieceId: movingPiece.id } : null);

        if (onlineGameId) {
          await syncOnline({ lastMove: newLastMove, currentTurn: nextTurn, hitPiece: hitPiece ?? null, attackingPiece: attackingPiece ?? null, enPassantTarget: enPassantRef.current, promotionData: promotionData ?? null });
        }

        return;
      }

      // king-in-check validation
      if (isKingInCheck(movingPiece.color, simulateMove(currentBoard, curSelected.row, curSelected.col, r, c))) return;

      // capture
      if (target) {
        const captureHitPiece = { row: r, col: c, target, targetId: target.id };
        const captureAttackingPiece = { fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, pieceId: movingPiece.id };

        const newLastMove = { id: `${movingPiece.id}-${Date.now()}`, fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, captured: true, targetId: target.id, pieceId: movingPiece.id };

        prevBoardRef.current = cloneBoard(currentBoard);

        setLastMove(newLastMove);
        if (!onlineGameId) setCurrentTurn(nextTurn);
        setHitPiece(captureHitPiece);
        setAttackingPiece(captureAttackingPiece);
        setSelected(null);
        setValidMoves([]);

        if (onlineGameId) {
          await syncOnline({ lastMove: newLastMove, currentTurn: nextTurn, hitPiece: captureHitPiece, attackingPiece: captureAttackingPiece, enPassantTarget: null, promotionData: null });
        }
      } else {
        // normal move (no capture)
        const newBoard = simulateMove(currentBoard, curSelected.row, curSelected.col, r, c);
        const newLastMove = { id: `${movingPiece.id}-${Date.now()}`, fromRow: curSelected.row, fromCol: curSelected.col, toRow: r, toCol: c, captured: false, pieceId: movingPiece.id };

        prevBoardRef.current = cloneBoard(currentBoard);
        setLastMove(newLastMove);
        setBoard(newBoard);
        if (!onlineGameId) setCurrentTurn(nextTurn);
        setSelected(null);
        setValidMoves([]);

        if (onlineGameId) {
          // for a normal non-capture move we can immediately sync board+lastMove
          await syncOnline({ board: newBoard, lastMove: newLastMove, currentTurn: nextTurn, hitPiece: null, attackingPiece: null, enPassantTarget: null, promotionData: null });
        }
      }

      // en passant target update for double pawn push
      if (movingPiece.type === 'pawn' && Math.abs(r - curSelected.row) === 2) {
        const dir = movingPiece.color === 'white' ? -1 : 1;
        const ep = { row: curSelected.row + dir, col: curSelected.col };
        setEnPassantTarget(ep);
        if (onlineGameId) {
          await syncOnline({ enPassantTarget: ep });
        }
      } else {
        setEnPassantTarget(null);
        if (onlineGameId) {
          await syncOnline({ enPassantTarget: null });
        }
      }

      // promotion handling
      if (movingPiece.type === 'pawn' && ((movingPiece.color === 'white' && r === 0) || (movingPiece.color === 'black' && r === 7))) {
        setPromotionData({ row: r, col: c, color: movingPiece.color, fromRow: curSelected.row, fromCol: curSelected.col });
        if (onlineGameId) {
          try {
            await updateDoc(doc(db, 'games', onlineGameId), { promotionData: { row: r, col: c, color: movingPiece.color, fromRow: curSelected.row, fromCol: curSelected.col } });
          } catch (err) { console.error('promotionData update failed', err); }
        }
        return;
      }
    }
  }, [isAnimating, isPlayerTurn, gameMode, getValidMoves, isValidMove, simulateMove, isKingInCheck, syncOnline, sendMoveOnline, cloneBoard]);

  // little helpers used by rendering
  const isInValidMoves = useCallback((r, c) => validMoves.some(m => m.row === r && m.col === c), [validMoves]);
  const isLastMoveSquare = useCallback((r, c) => lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c)), [lastMove]);

  // render squares
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

  // render pieces with prev positions so animations can compute transitions
  const renderedPieces = useMemo(() => {
    return board.map((rowArr, r) =>
      rowArr.map((piece, c) => {
        if (!piece) return null;

        // determine prev position for this piece from prevBoardRef
        let prevPos = null;
        outer: for (let pr = 0; pr < 8; pr++) {
          for (let pc = 0; pc < 8; pc++) {
            const prevPiece = prevBoardRef.current[pr][pc];
            if (prevPiece && prevPiece.id === piece.id && !usedPrevPositionsRef.current.has(prevPiece.id)) {
              prevPos = { row: pr, col: pc };
              usedPrevPositionsRef.current.add(prevPiece.id);
              break outer;
            }
          }
        }

        const effectivePrevRow = prevPos?.row ?? r;
        const effectivePrevCol = prevPos?.col ?? c;
        const isSelected = selected?.row === r && selected?.col === c;

        const isBeingHit = hitPiece?.row === r && hitPiece?.col === c && hitPiece?.targetId === piece.id ? hitPiece : null;

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
            currentTurn={currentTurn}
            onlineGameId={onlineGameId}
          />
        );
      })
    ).flat();
  }, [board, squareSize, updateBoard, currentTurn, onlineGameId, handleSquareClick, lastMove, attackingPiece, hitPiece]);

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

        {(isAnimating || hitPiece) && (
          <div className="board-blocker" onClick={(e) => e.stopPropagation()} role="presentation" aria-hidden="true" />
        )}

        {promotionData && (
          <PromotionPopup
            color={promotionData.color}
            onSelect={async (type) => {
              const newBoard = cloneBoard(boardRef.current);
              const pawn =
                newBoard[promotionData.row]?.[promotionData.col] ??
                newBoard[promotionData.fromRow]?.[promotionData.fromCol];

              if (newBoard[promotionData.fromRow]?.[promotionData.fromCol])
                newBoard[promotionData.fromRow][promotionData.fromCol] = null;

              const promotedPiece = {
                ...pawn,
                type,
                symbol: getSymbol(type, pawn.color || promotionData.color),
                id: `${pawn.color || promotionData.color}-${type}-${Date.now()}`,
                hasMoved: true,
              };

              newBoard[promotionData.row][promotionData.col] = promotedPiece;
              setBoard(newBoard);
              setPromotionData(null);

              if (onlineGameId) {
                try {
                  await updateDoc(doc(db, 'games', onlineGameId), {
                    board: boardToFirestore(newBoard),
                    promotionData: null,
                    lastMoveTime: serverTimestamp(),
                  });
                } catch (err) {
                  console.error('Promotion sync failed', err);
                }
              }
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

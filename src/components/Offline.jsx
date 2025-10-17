// Board.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './halloween-chess.css';
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Piece } from './Piece';

export const Offline = ({ onlineGameId, playerColor, gameMode }) => {
  const wrapperRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [flashCells, setFlashCells] = useState([]);
  const [boardWidth, setBoardWidth] = useState(880);
  const [explosions, setExplosions] = useState([]);
  const [board, setBoard] = useState(
    Array(8).fill(null).map(() => Array(8).fill(null))
  );

  const squareSize = boardWidth / 8;
  const isPlayerTurn = playerColor === currentTurn || gameMode === "local";

  // Flashing cells
  useEffect(() => {
    const interval = setInterval(() => {
      const randRow = Math.floor(Math.random() * 8);
      const randCol = Math.floor(Math.random() * 8);
      setFlashCells([{ row: randRow, col: randCol }]);
      setTimeout(() => setFlashCells([]), 500);
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Firestore subscription (online only)
  useEffect(() => {
    if (!onlineGameId) return;
    const unsub = onSnapshot(doc(db, "games", onlineGameId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setLastMove(data.lastMove || null);
    });
    return () => unsub();
  }, [onlineGameId]);

  // Board resize
  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        const width = wrapperRef.current.clientWidth * 0.9;
        setBoardWidth(Math.max(180, Math.min(width, 680)));
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Initial pieces only if offline
  useEffect(() => {
    if (!onlineGameId) setupInitialPieces();
  }, [onlineGameId]);

  const setupInitialPieces = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    newBoard[0] = [
      { type: 'rook', color: 'black', symbol: '♜' },
      { type: 'knight', color: 'black', symbol: '♞' },
      { type: 'bishop', color: 'black', symbol: '♝' },
      { type: 'queen', color: 'black', symbol: '♛' },
      { type: 'king', color: 'black', symbol: '♚' },
      { type: 'bishop', color: 'black', symbol: '♝' },
      { type: 'knight', color: 'black', symbol: '♞' },
      { type: 'rook', color: 'black', symbol: '♜' },
    ];
    newBoard[1] = Array(8).fill(null).map(() => ({ type: 'pawn', color: 'black', symbol: '♟' }));
    newBoard[6] = Array(8).fill(null).map(() => ({ type: 'pawn', color: 'white', symbol: '♙' }));
    newBoard[7] = [
      { type: 'rook', color: 'white', symbol: '♖' },
      { type: 'knight', color: 'white', symbol: '♘' },
      { type: 'bishop', color: 'white', symbol: '♗' },
      { type: 'queen', color: 'white', symbol: '♕' },
      { type: 'king', color: 'white', symbol: '♔' },
      { type: 'bishop', color: 'white', symbol: '♗' },
      { type: 'knight', color: 'white', symbol: '♘' },
      { type: 'rook', color: 'white', symbol: '♖' },
    ];
    setBoard(newBoard);
  };

  // Helpers
  const simulateMove = (boardState, fromRow, fromCol, toRow, toCol) => {
    const newBoard = boardState.map(row => row.map(cell => (cell ? { ...cell } : null)));
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;
    return newBoard;
  };

  const isPathClear = (fromRow, fromCol, toRow, toCol, boardState) => {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let r = fromRow + rowStep;
    let c = fromCol + colStep;
    while (r !== toRow || c !== toCol) {
      if (boardState[r][c] !== null) return false;
      r += rowStep;
      c += colStep;
    }
    return true;
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol, boardState = board) => {
    const piece = boardState[fromRow][fromCol];
    const target = boardState[toRow][toCol];
    if (!piece) return false;
    if (target && target.color === piece.color) return false;
    const type = piece.type;

    if (type === 'pawn') {
      if (piece.color === 'white') {
        if (fromCol === toCol && !target && toRow === fromRow - 1) return true;
        if (fromCol === toCol && !target && fromRow === 6 && toRow === 4) return true;
        if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow - 1 && target) return true;
      } else {
        if (fromCol === toCol && !target && toRow === fromRow + 1) return true;
        if (fromCol === toCol && !target && fromRow === 1 && toRow === 3) return true;
        if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + 1 && target) return true;
      }
    } else if (type === 'bishop') {
      if (Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow)) return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
    } else if (type === 'rook') {
      if ((fromRow !== toRow && fromCol === toCol) || (fromRow === toRow && fromCol !== toCol)) return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
    } else if (type === 'knight') {
      if ((Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2) ||
          (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1)) return true;
    } else if (type === 'queen') {
      if ((Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow)) ||
          (fromRow !== toRow && fromCol === toCol) ||
          (fromRow === toRow && fromCol !== toCol)) return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
    } else if (type === 'king') {
      if ((Math.abs(fromCol - toCol) <= 1 && Math.abs(fromRow - toRow) <= 1)) return true;
    }
    return false;
  };

  const isKingInCheck = (color, boardState) => {
    let kingPosition = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece && piece.type === 'king' && piece.color === color) {
          kingPosition = { row: r, col: c };
          break;
        }
      }
    }
    if (!kingPosition) return false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece && piece.color !== color) {
          if (isValidMove(r, c, kingPosition.row, kingPosition.col, boardState)) return true;
        }
      }
    }
    return false;
  };

  const getValidMoves = (row, col) => {
    const moves = [];
    const piece = board[row][col];
    if (!piece) return moves;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const testBoard = simulateMove(board, row, col, r, c);
        if (isValidMove(row, col, r, c) && !isKingInCheck(piece.color, testBoard)) moves.push({ row: r, col: c });
      }
    }
    return moves;
  };

  const handleSquareClick = (row, col) => {
    if (!isPlayerTurn) return;
    const piece = board[row][col];
    if (!selected && piece && gameMode!='local' && piece.color !== playerColor) return;
    
    if (!selected && piece && piece.color !== currentTurn) return;
    if (selected) {
      if (piece && piece.color === board[selected.row][selected.col].color) {
        setSelected({ row, col });
        setValidMoves(getValidMoves(row, col));
        return;
      }

      if (isValidMove(selected.row, selected.col, row, col)) {
        const target = board[row][col];
        const testBoard = simulateMove(board, selected.row, selected.col, row, col);
        if (!isKingInCheck(currentTurn, testBoard)) {
          setBoard(testBoard);
          setLastMove({ fromRow: selected.row, fromCol: selected.col, toRow: row, toCol: col, captured: !!target });

          if (target) {
            const id = Date.now();
            setExplosions(prev => [...prev, { id, row, col }]);
            setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 700);
          }

          setCurrentTurn(prev => {
            const next = prev === 'white' ? 'black' : 'white';
            if (onlineGameId) {
              updateDoc(doc(db, "games", onlineGameId), {
                board: testBoard,
                currentTurn: next,
                lastMove: { fromRow: selected.row, fromCol: selected.col, toRow: row, toCol: col, captured: !!target }
              });
            }
            return next;
          });
        }
        setSelected(null);
        setValidMoves([]);
        return;
      }

      setSelected(null);
      setValidMoves([]);
    } else if (piece && piece.color === currentTurn) {
      setSelected({ row, col });
      setValidMoves(getValidMoves(row, col));
    }
  };

  const isInValidMoves = (r, c) => validMoves.some(m => m.row === r && m.col === c);
  const isLastMoveSquare = (r, c) => lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c));

  return (
    <div ref={wrapperRef} style={{ width: '100%', maxWidth: 700, margin: 'auto' }}>
      <div className="chess-board" style={{ position: 'relative', width: boardWidth, height: boardWidth, border: '2px solid #333', margin: 'auto', transform: playerColor === 'black' ? 'rotate(180deg)' : 'none' }}>
        {Array(8).fill(0).map((_, r) => Array(8).fill(0).map((_, c) => {
          const isWhite = (r + c) % 2 === 0;
          const flash = flashCells.some(f => f.row === r && f.col === c);
          const valid = isInValidMoves(r, c);
          const last = isLastMoveSquare(r, c);
          const selectedHere = selected && selected.row === r && selected.col === c;

          return (
            <div key={`sq-${r}-${c}`} onClick={() => handleSquareClick(r, c)} className={`square ${selectedHere ? 'selected-square' : ''} ${last ? 'last-move' : ''}`} style={{
              position: 'absolute',
              top: r * squareSize,
              left: c * squareSize,
              width: squareSize,
              height: squareSize,
              backgroundColor: isWhite ? '#1a1a1a' : '#2c2c2c',
              border: '1px solid #111',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {valid && <div className="move-hint" />}
            </div>
          );
        }))}

        {board.flatMap((rowArr, r) => rowArr.map((piece, c) => {
          if (!piece) return null;
          return (
            <Piece
              key={`${piece.type}-${piece.color}-${r}-${c}`}
              piece={piece}
              row={r}
              col={c}
              lastMove={lastMove}
              squareSize={squareSize}
              onClick={() => handleSquareClick(r, c)}
              selected={selected && selected.row === r && selected.col === c}
            />
          );
        }))}

        <AnimatePresence>
          {explosions.map(exp => (
            <motion.div key={exp.id} initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} style={{
              position: 'absolute',
              top: exp.row * squareSize,
              left: exp.col * squareSize,
              width: squareSize,
              height: squareSize,
              borderRadius: '50%',
              background: 'radial-gradient(circle, orange, red, transparent)',
              pointerEvents: 'none',
              zIndex: 5,
            }} />
          ))}
        </AnimatePresence>

        <div style={{ position: 'absolute', top: -36, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
          <div className="turn-indicator" style={{ color: isKingInCheck(currentTurn, board) ? 'red' : 'white' }}>
            {currentTurn === 'white' ? 'White' : 'Black'}'s turn {isKingInCheck(currentTurn, board) ? ' — Check!' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offline;

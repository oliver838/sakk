import React, { useState } from 'react';
import { Row } from './Row';

export const Board = () => {
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [board, setBoard] = useState(
    Array(8).fill(null).map(() => Array(8).fill(null))
  );

  const setupInitialPieces = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));

    // fekete bábuk
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

    // fehér bábuk
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

  const simulateMove = (board, fromRow, fromCol, toRow, toCol) => {
    const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;
    return newBoard;
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
          if (isValidMove(r, c, kingPosition.row, kingPosition.col, boardState)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const isPathClear = (fromRow, fromCol, toRow, toCol, boardState) => {
    const rowStep = toRow > fromRow ? 1 : (toRow < fromRow ? -1 : 0);
    const colStep = toCol > fromCol ? 1 : (toCol < fromCol ? -1 : 0);

    let r = fromRow + rowStep;
    let c = fromCol + colStep;

    while (r !== toRow || c !== toCol) {
      if (boardState[r][c] !== null) {
        return false;
      }
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
      if (Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow)) {
        return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
      }
    } else if (type === 'rook') {
      if ((fromRow !== toRow && fromCol === toCol) || (fromRow === toRow && fromCol !== toCol)) {
        return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
      }
    } else if (type === 'knight') {
      if ((Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2) ||
          (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1)) return true;
    } else if (type === 'queen') {
      if ((Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow)) ||
          (fromRow !== toRow && fromCol === toCol) ||
          (fromRow === toRow && fromCol !== toCol)) {
        return isPathClear(fromRow, fromCol, toRow, toCol, boardState);
      }
    } else if (type === 'king') {
      if ((Math.abs(fromCol - toCol) <= 1 && Math.abs(fromRow - toRow) <= 1)) return true;
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
        if (isValidMove(row, col, r, c) && !isKingInCheck(piece.color, testBoard)) {
          moves.push({ row: r, col: c });
        }
      }
    }

    return moves;
  };

  const handleSquareClick = (row, col) => {
    const piece = board[row][col];

    if (!selected && piece && piece.color !== currentTurn) return;

    if (selected) {
      if (piece && piece.color === board[selected.row][selected.col].color) {
        if (piece.color !== currentTurn) return;
        setSelected({ row, col });
        setValidMoves(getValidMoves(row, col));
        return;
      }

      if (isValidMove(selected.row, selected.col, row, col)) {
        const testBoard = simulateMove(board, selected.row, selected.col, row, col);
        if (isKingInCheck(currentTurn, testBoard)) return;

        setBoard(testBoard);
        setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
      }

      setValidMoves([]);
      setSelected(null);
    } else if (piece && piece.color === currentTurn) {
      setSelected({ row, col });
      setValidMoves(getValidMoves(row, col));
    }
  };

  return (
    <div>
      <button onClick={setupInitialPieces}>Setup Board</button>
      <div style={{ border: '3px solid black', display: 'inline-block' }}>
        {board.map((row, i) => (
          <Row
            key={i}
            rowIndex={i}
            pieces={row}
            onSquareClick={handleSquareClick}
            selected={selected}
            validMoves={validMoves}
          />
        ))}
        <p style={{ color: isKingInCheck(currentTurn, board) ? 'red' : 'black' }}>
          {currentTurn === 'white' ? 'White' : 'Black'}'s turn
          {isKingInCheck(currentTurn, board) ? ' — Check!' : ''}
        </p>
      </div>
    </div>
  );
};

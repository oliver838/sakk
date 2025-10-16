import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Piece } from './Piece';

export const Row = ({ rowIndex, pieces, onSquareClick, selected, validMoves, lastMove }) => {
  const [flashSquare, setFlashSquare] = useState(null);

  // Random villódzás
  useEffect(() => {
    const interval = setInterval(() => {
      setFlashSquare(Math.floor(Math.random() * 8));
      setTimeout(() => setFlashSquare(null), 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      {Array(8).fill(0).map((_, colIndex) => {
        const isWhite = (rowIndex + colIndex) % 2 === 0;
        const bgColor = isWhite ? '#1a1a1a' : '#2c2c2c';
        const piece = pieces[colIndex];
        const isValid = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
        const isLastMove =
          (lastMove?.fromRow === rowIndex && lastMove?.fromCol === colIndex) ||
          (lastMove?.toRow === rowIndex && lastMove?.toCol === colIndex);
        const isFlashing = flashSquare === colIndex;

        return (
          <motion.div
            key={colIndex}
            whileTap={{ scale: 0.95 }}
            animate={{
              backgroundColor:
                selected?.row === rowIndex && selected?.col === colIndex
                  ? '#3a0ca3'
                  : isValid
                  ? '#f3c623'
                  : isFlashing
                  ? '#7209b7'
                  : bgColor,
              boxShadow: isValid
                ? '0 0 20px 5px #f3c623'
                : isLastMove
                ? '0 0 20px 5px #4361ee'
                : 'none',
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: '60px',
              height: '60px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #111',
              position: 'relative',
            }}
            onClick={() => onSquareClick(rowIndex, colIndex)}
          >
            {piece && (
             <Piece
                key={`${piece.color}-${piece.type}-${rowIndex}-${colIndex}`}
                symbol={piece.symbol}
                color={piece.color}
                row={rowIndex}
                col={colIndex}
                lastMove={lastMove}
                onClick={() => onSquareClick(rowIndex, colIndex)}
              />


            )}
          </motion.div>
        );
      })}
    </div>
  );
};

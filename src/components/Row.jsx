import React from 'react';
import { Piece } from './Piece';

export const Row = ({ rowIndex, pieces, onSquareClick, selected, validMoves }) => {
  return (
    <div style={{ display: 'flex' }}>
      {Array(8).fill(0).map((_, colIndex) => {
        const isWhite = (rowIndex + colIndex) % 2 === 0;
        const bgColor = isWhite ? '#eee' : '#444';
        const piece = pieces[colIndex]; // adott cellába figura?
        const isValid = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
        return (
          <div
            key={colIndex}
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: bgColor,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            boxShadow: isValid ? ' 0 0 10px 3px yellow' : 'none', // lehetséges lépés
              backgroundColor:selected?.row === rowIndex && selected?.col === colIndex
        ? 'blue' : bgColor,
            }}
            onClick={() => onSquareClick(rowIndex, colIndex)}
          >
            {piece && <Piece symbol={piece.symbol} />}
          </div>
        );
      })}
    </div>
  );
};

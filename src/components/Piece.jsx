import React from 'react';

export const Piece = ({ symbol }) => {
  return (
    <div  style={{ fontSize: '2rem', textAlign: 'center', userSelect: 'none', cursor:'pointer'}}>
      {symbol}
    </div>
  );
};

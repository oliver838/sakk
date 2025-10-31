import React from "react";
import Piece from "./Piece";

export const Square = ({ piece, row, col, squareSize, isWhite, onClick, children }) => (
  <div
    onClick={onClick}
    style={{
      position: "absolute",
      top: row * squareSize,
      left: col * squareSize,
      width: squareSize,
      height: squareSize,
      backgroundColor: isWhite ? "#1a1a1a" : "#2c2c2c",
      border: "1px solid #111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      WebkitTapHighlightColor: "transparent",
    }}
  >
    {<Piece piece={piece}
          row={row}
          col={col}
          lastMove={squareSize}
          squareSize={squareSize}
          selected={selected?.row === r && selected?.col === c}
          playerColor={playerColor}
          isAttacking={attackingPiece?.row === r && attackingPiece?.col === c}
          targetPos={attackingPiece?.target}
          isBeingHit={hitPiece?.row === r && hitPiece?.col === c}
          onClick={() => handleSquareClick(r, c)}/>}
  </div>
);

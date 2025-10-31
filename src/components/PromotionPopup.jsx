// components/PromotionPopup.jsx
import React from "react";
import "./promotion-popup.css";

export const PromotionPopup = ({ color, onSelect, col,squareSize }) => {
  const pieces = [
    { type: "queen", symbol: color === "white" ? "♕" : "♛" },
    { type: "rook", symbol: color === "white" ? "♖" : "♜" },
    { type: "bishop", symbol: color === "white" ? "♗" : "♝" },
    { type: "knight", symbol: color === "white" ? "♘" : "♞" },
  ];

  return (
    <div style={{left:col*squareSize + squareSize/2}}
 className="promotion-popup">
      <div className="popup-content">
        {pieces.map(p => (
          <div
            key={p.type}
            className="promotion-option"
            onClick={() => onSelect(p.type)}
          >
            {p.symbol}
          </div>
        ))}
      </div>
      <div className="popup-arrow" />
    </div>
  );
};

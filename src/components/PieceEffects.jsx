// PieceEffects.jsx
import React, { useEffect } from "react";

/**
 props:
  - x, y: pixel positions (top-left of the square)
  - squareSize: number
  - lightning: bool
  - crack: bool
  - dust: bool
  - animateKey: string (changes when new animation is needed)
*/

const PieceEffects = ({ x = 0, y = 0, squareSize = 64, lightning, crack, dust, animateKey }) => {
  // We re-trigger CSS animations by changing the key / className using animateKey
  const style = {
    position: "absolute",
    left: x,
    top: y,
    width: squareSize,
    height: squareSize,
    pointerEvents: "none",
    overflow: "visible",
    zIndex: 1000,
  };

  return (
    <div style={style} className={`piece-effects ${animateKey || ""}`}>
      {/* Lightning: fast radial flash + streak */}
      <svg className={`lightning ${lightning ? "active" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)">
          <polygon className="bolt" points="45,5 60,40 50,40 68,95 35,55 45,55" />
        </g>
      </svg>

      {/* Crack: an animated svg path that scales */}
      <svg className={`crack ${crack ? "active" : ""}`} viewBox="0 0 120 40" preserveAspectRatio="xMidYMid slice">
        <path className="crack-path" d="M10 28 L36 20 L48 30 L60 18 L72 28 L86 16 L110 26" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Dust puff */}
      <div className={`dust ${dust ? "active" : ""}`} aria-hidden>
        <div className="puff puff1" />
        <div className="puff puff2" />
        <div className="puff puff3" />
      </div>
    </div>
  );
};

export default PieceEffects;

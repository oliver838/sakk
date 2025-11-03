// src/components/BoardWrapper.jsx
import React from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Board } from "./Board";
import GameControls from "./GameControls";

export const BoardWrapper = ({ user }) => {
  const location = useLocation();
  const { gameId: paramGameId } = useParams();
  const navigate = useNavigate();

  // playerColor jöhet route state-ből (ha meghíváskor átadtuk), egyébként default "white"
  const playerColor = location.state?.playerColor || "white";

  // gameId próbáljuk először az URL-ből, aztán a location.state-ből
  const gameId = paramGameId || location.state?.gameId || null;

  // amikor a GameControls onEnd meghívja, itt tudsz plusz cleanup-et, analytics-t, stb.
  const handleEnd = () => {
    // példa: vissza a home-ra
    navigate("/home");
  };

  return (
    <div className="board-layout">
      <main className="board-container">
        <Board
          onlineGameId={gameId}
          playerColor={playerColor}
          gameMode="online"
          user={user}
        />
      </main>

      <aside className="controls-container">
        <GameControls
          gameId={gameId}
          mode="online"
          user={user}
          onEnd={handleEnd}
        />
      </aside>
    </div>
  );
};

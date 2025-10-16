import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { Board } from "./Board";

export const BoardWrapper = () => {
  const location = useLocation();
  const { gameId } = useParams();

  const playerColor = location.state?.playerColor || "white"; // default white

  return <Board onlineGameId={gameId} playerColor={playerColor} gameMode="online" />;
};

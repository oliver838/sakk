import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const JoinGame = ({ user }) => {
  const [gameIdInput, setGameIdInput] = useState("");
  const navigate = useNavigate();

  const joinGame = async () => {
    if (!user?.uid || !gameIdInput) return;

    const gameRef = doc(db, "games", gameIdInput);
    const snapshot = await getDoc(gameRef);

    if (!snapshot.exists()) {
      alert("Game not found!");
      return;
    }

    const gameData = snapshot.data();

    if (gameData.playerBlack) {
      alert("This game already has two players!");
      return;
    }

    await updateDoc(gameRef, {
      playerBlack: user.uid,
    });

    navigate(`/game/${gameIdInput}`, { state: { playerColor: "black" } });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Enter Game ID"
        value={gameIdInput}
        onChange={(e) => setGameIdInput(e.target.value)}
        className="border px-2 py-1 rounded"
      />
      <button
        onClick={joinGame}
        className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
      >
        Join Game
      </button>
    </div>
  );
};

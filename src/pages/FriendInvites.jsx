import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const FriendInvites = ({ user }) => {
  const [invites, setInvites] = useState([]);
  const navigate = useNavigate();
  const setupInitialPieces = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));

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
  const fetchInvites = async () => {
    const q = query(
      collection(db, "game_invites"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchInvites(); }, []);

  const handleAccept = async (invite) => {
    await updateDoc(doc(db, "game_invites", invite.id), { status: "accepted" });
    const playerColor = user.uid === invite.toUserId ? "black" : "white";
    navigate(`/game/${invite.gameId}`, { state: { playerColor } });
  };

  const handleReject = async (invite) => {
    await updateDoc(doc(db, "game_invites", invite.id), { status: "rejected" });
    setInvites(prev => prev.filter(i => i.id !== invite.id));
  };

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-xl font-semibold mb-3">Game Invites</h2>
      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map(inv => (
            <li key={inv.id} className="p-2 bg-white rounded-lg shadow flex justify-between items-center">
              <span>🎮 {inv.fromUsername} invited you</span>
              <div className="space-x-2">
                <button
                  onClick={() => handleAccept(inv)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(inv)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No pending game invites.</p>
      )}
    </div>
  );
};

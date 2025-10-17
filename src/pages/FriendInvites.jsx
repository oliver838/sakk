import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const FriendInvites = ({ user }) => {
  const [invites, setInvites] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    // Realtime listener a game invitokra, csak a toUserId mező alapján
    const q = query(
      collection(db, "game_invites"),
      where("toUserId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const pendingInvites = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(inv => inv.status === "pending"); // kliens oldali szűrés

      setInvites(pendingInvites);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAccept = async (invite) => {
    try {
      await updateDoc(doc(db, "game_invites", invite.id), { status: "accepted" });
      const playerColor = user.uid === invite.toUserId ? "black" : "white";
      navigate(`/game/${invite.gameId}`, { state: { playerColor } });
    } catch (err) {
      console.error("Error accepting invite:", err);
    }
  };

  const handleReject = async (invite) => {
    try {
      await updateDoc(doc(db, "game_invites", invite.id), { status: "rejected" });
      setInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (err) {
      console.error("Error rejecting invite:", err);
    }
  };

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-xl font-semibold mb-3">Game Invites</h2>
      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map(inv => (
            <li key={inv.id} className="p-2 bg-white rounded-lg shadow flex justify-between items-center">
              <span>🎮 {inv.fromDisplayName} invited you</span>
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

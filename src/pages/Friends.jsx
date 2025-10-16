import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid"; // ha nincs, telepítsd: npm i uuid

export const Friends = ({ user }) => {
  const [friendUsername, setFriendUsername] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  // --- Fetch friends ---
  const fetchFriends = async () => {
    const q = query(collection(db, "friends"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    setFriends(snapshot.docs.map(doc => doc.data()));
  };

  // --- Fetch pending friend requests ---
  const fetchRequests = async () => {
    const q = query(
      collection(db, "friend_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  // --- Add Friend ---
  const handleAddFriend = async () => {
    if (!friendUsername) return;
    const userQuery = query(collection(db, "users"), where("username", "==", friendUsername));
    const snapshot = await getDocs(userQuery);

    if (!snapshot.empty) {
      const friendData = snapshot.docs[0].data();
      if (friendData.uid === user.uid) {
        alert("You can’t add yourself 😅");
        return;
      }

      const reqQuery = query(
        collection(db, "friend_requests"),
        where("fromUserId", "==", user.uid),
        where("toUserId", "==", friendData.uid),
        where("status", "==", "pending")
      );
      const existingReq = await getDocs(reqQuery);
      if (!existingReq.empty) {
        alert("Friend request already sent!");
        return;
      }

      await addDoc(collection(db, "friend_requests"), {
        fromUserId: user.uid,
        fromUsername: user.username,
        toUserId: friendData.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      alert("Friend request sent!");
      setFriendUsername("");
    } else {
      alert("No user found with that username!");
    }
  };

  // --- Accept Friend Request ---
  const handleAccept = async (request) => {
    await updateDoc(doc(db, "friend_requests", request.id), { status: "accepted" });

    await addDoc(collection(db, "friends"), {
      userId: user.uid,
      friendId: request.fromUserId,
      friendUsername: request.fromUsername,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "friends"), {
      userId: request.fromUserId,
      friendId: user.uid,
      friendUsername: user.username,
      createdAt: serverTimestamp(),
    });

    setRequests(prev => prev.filter(r => r.id !== request.id));
    fetchFriends();
  };

  // --- Reject Friend Request ---
  const handleReject = async (request) => {
    await updateDoc(doc(db, "friend_requests", request.id), { status: "rejected" });
    setRequests(prev => prev.filter(r => r.id !== request.id));
  };

  // --- Invite to Game ---
  const handleInvite = async (friend) => {
    const gameId = uuidv4();
    await addDoc(collection(db, "game_invites"), {
      fromUserId: user.uid,
      fromUsername: user.username,
      toUserId: friend.friendId,
      toUsername: friend.friendUsername,
      status: "pending",
      gameId,
      createdAt: serverTimestamp(),
    });

    alert(`Game invite sent to ${friend.friendUsername}!`);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>

      {/* Add Friend */}
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <input
          type="text"
          placeholder="Friend's username"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          className="p-2 rounded-lg border border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleAddFriend}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          ➕ Add Friend
        </button>
      </div>

      {/* Friends List */}
      <div className="w-full max-w-md mb-8">
        <h2 className="text-xl font-semibold mb-3">Your Friends</h2>
        {friends.length > 0 ? (
          <ul className="space-y-2">
            {friends.map((f, i) => (
              <li
                key={i}
                className="p-2 bg-white rounded-lg shadow flex items-center cursor-pointer hover:bg-purple-100 transition"
                onClick={() => handleInvite(f)}
              >
                👤 {f.friendUsername}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">You have no friends yet.</p>
        )}
      </div>

      {/* Pending Requests */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-3">Pending Friend Requests</h2>
        {requests.length > 0 ? (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="p-2 bg-white rounded-lg shadow flex justify-between items-center">
                <span>👤 {r.fromUsername}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleAccept(r)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(r)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No pending friend requests.</p>
        )}
      </div>
    </div>
  );
};

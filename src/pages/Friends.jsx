// Friends.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const Friends = ({ user }) => {
  const [friendName, setFriendName] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  // 🔹 Friends realtime listener
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "friends"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const friendList = snapshot.docs.map(doc => doc.data());
      setFriends(friendList);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 🔹 Pending requests listener
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "friend_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, snapshot => {
      const reqList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 🔹 Add friend
  const handleAddFriend = async () => {
    if (!friendName || !user?.uid) return;

    const userQuery = query(
      collection(db, "users"),
      where("publicProfile.displayName", "==", friendName)
    );
    const snapshot = await getDocs(userQuery);

    if (snapshot.empty) {
      alert("No user found with that display name!");
      return;
    }

    const friendData = snapshot.docs[0].data();
    const friendUid = snapshot.docs[0].id;

    if (friendUid === user.uid) {
      alert("You can't add yourself 😅");
      return;
    }

    const friendsQuery = query(
      collection(db, "friends"),
      where("userId", "==", user.uid),
      where("friendId", "==", friendUid)
    );
    const friendsSnapshot = await getDocs(friendsQuery);
    if (!friendsSnapshot.empty) {
      alert("You are already friends with this user!");
      return;
    }

    const reqQuery = query(
      collection(db, "friend_requests"),
      where("fromUserId", "==", user.uid),
      where("toUserId", "==", friendUid),
      where("status", "==", "pending")
    );
    const existingReq = await getDocs(reqQuery);
    if (!existingReq.empty) {
      alert("Friend request already sent!");
      return;
    }

    await addDoc(collection(db, "friend_requests"), {
      fromUserId: user.uid,
      fromDisplayName: user.displayName,
      toUserId: friendUid,
      toDisplayName: friendData.publicProfile.displayName,
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("Friend request sent!");
    setFriendName("");
  };

  // 🔹 Accept friend request
  const handleAccept = async (request) => {
    try {
      await updateDoc(doc(db, "friend_requests", request.id), { status: "accepted" });

      const userFriendData = {
        userId: user.uid,
        friendId: request.fromUserId,
        friendDisplayName: request.fromDisplayName,
        createdAt: serverTimestamp(),
      };
      const friendUserData = {
        userId: request.fromUserId,
        friendId: user.uid,
        friendDisplayName: user.displayName,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "friends"), userFriendData);
      await addDoc(collection(db, "friends"), friendUserData);
    } catch (err) {
      console.error("Error accepting friend:", err);
      alert("Error accepting friend. Check console.");
    }
  };

  const handleReject = async (request) => {
    await updateDoc(doc(db, "friend_requests", request.id), { status: "rejected" });
  };

  // 🔹 Invite friend to game
  const handleInvite = async (friend) => {
  const gameId = uuidv4();

  // 🔹 Létrehozunk egy game doksit
  await addDoc(collection(db, "games"), {
    gameId,
    players: [
      { uid: user.uid, displayName: user.displayName, color: "white" },
      { uid: friend.friendId, displayName: friend.friendDisplayName, color: "black" }
    ],
    status: "waiting", // vagy "active", ha azonnal indítod
    createdAt: serverTimestamp()
  });

  // 🔹 Létrehozunk egy invite doksit is a meghívottnak
  await addDoc(collection(db, "game_invites"), {
    fromUserId: user.uid,
    fromDisplayName: user.displayName,
    toUserId: friend.friendId,
    toDisplayName: friend.friendDisplayName,
    status: "pending",
    gameId,
    createdAt: serverTimestamp()
  });

  alert(`Game invite sent to ${friend.friendDisplayName}!`);

  // 🔹 Navigálás a meghívó oldalán is
  navigate(`/game/${gameId}`, { state: { playerColor: "white" } });
};


  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>

      {/* Add Friend */}
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <input
          type="text"
          placeholder="Friend's display name"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
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
                👤 {f.friendDisplayName}
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
                <span>👤 {r.fromDisplayName}</span>
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

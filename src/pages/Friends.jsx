// Friends.jsx
import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/**
 * Friends component
 *
 * - Megjeleníti a saját displayName-t
 * - Barátok listája: minden barát mellett Join / Invite gomb
 * - Real-time figyelés: a games doksikat figyeli páronként (participantsId alapján)
 * - Egy szoba/pár: participantsId = rendezett uid string
 * - Szoba létrehozás: id = `${playerAdisplay}-${playerBdisplay}-${Date.now()}`
 * - Szoba törlése: deleteDoc -> másik kliensen is eltűnik
 */

export const Friends = ({ user }) => {
  const [friendName, setFriendName] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]); // ha kell továbbra is
  const [existingGamesMap, setExistingGamesMap] = useState({}); // participantsId -> { id, ...data }
  const navigate = useNavigate();
  const gamesUnsubsRef = useRef({}); // participantsId -> unsubscribe fn

  // helper: rendezett participantsId
  const getParticipantsId = (uidA, uidB) => {
    return [uidA, uidB].sort().join("_");
  };

  // --- realtime friends listener ---
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "friends"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(list);
    });
    return () => unsub();
  }, [user?.uid]);

  // --- pending friend requests (opcionális, ha kell) ---
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "friend_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, snapshot => {
      const reqList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });
    return () => unsub();
  }, [user?.uid]);

  // --- Real-time game listeners: per-friend ---
  useEffect(() => {
    // cleanup old unsubscribes
    Object.values(gamesUnsubsRef.current).forEach(un => typeof un === "function" && un());
    gamesUnsubsRef.current = {};
    setExistingGamesMap({});

    if (!user?.uid || friends.length === 0) return;

    friends.forEach((f) => {
      const pid = getParticipantsId(user.uid, f.friendId);
      // query: participantsId == pid AND completed == false (aktív / várakozó)
      const q = query(
        collection(db, "games"),
        where("participantsId", "==", pid),
        where("completed", "==", false)
      );

      const unsub = onSnapshot(q, (snap) => {
        setExistingGamesMap(prev => {
          const copy = { ...prev };
          if (snap.empty) {
            // nincs aktív game -> töröljük a mapből
            delete copy[pid];
          } else {
            // ha több doksi, használjuk az elsőt (ált. csak 1 lehet participantsId-re)
            const g = snap.docs[0];
            copy[pid] = { id: g.id, ...g.data() };
          }
          return copy;
        });
      });

      gamesUnsubsRef.current[pid] = unsub;
    });

    return () => {
      Object.values(gamesUnsubsRef.current).forEach(un => typeof un === "function" && un());
      gamesUnsubsRef.current = {};
    };
  }, [user?.uid, friends]);

  // --- Find user by displayName (helper for add friend) ---
  const findUserByDisplayName = async (displayName) => {
    const q = query(collection(db, "users"), where("publicProfile.displayName", "==", displayName));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { uid: docSnap.id, data: docSnap.data() };
  };

  // --- Add friend (kept similar) ---
  const handleAddFriend = async () => {
    if (!friendName || !user?.uid) return;
    try {
      const f = await findUserByDisplayName(friendName);
      if (!f) { alert("No user found with that display name!"); return; }
      if (f.uid === user.uid) { alert("You can't add yourself 😅"); return; }

      // ellenőrizzük, hogy már barátok vagy kértünk-e
      const friendsQuery = query(
        collection(db, "friends"),
        where("userId", "==", user.uid),
        where("friendId", "==", f.uid)
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      if (!friendsSnapshot.empty) { alert("You are already friends with this user!"); return; }

      const reqQuery = query(
        collection(db, "friend_requests"),
        where("fromUserId", "==", user.uid),
        where("toUserId", "==", f.uid),
        where("status", "==", "pending")
      );
      const existingReq = await getDocs(reqQuery);
      if (!existingReq.empty) { alert("Friend request already sent!"); return; }

      await addDoc(collection(db, "friend_requests"), {
        fromUserId: user.uid,
        fromDisplayName: user.displayName,
        toUserId: f.uid,
        toDisplayName: f.data.publicProfile.displayName,
        status: "pending",
        createdAt: serverTimestamp()
      });

      alert("Friend request sent!");
      setFriendName("");
    } catch (err) {
      console.error("handleAddFriend error:", err);
      alert("Hiba történt: nézd a konzolt.");
    }
  };

  // --- Accept / Reject friend request (same as before) ---
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
    try {
      await updateDoc(doc(db, "friend_requests", request.id), { status: "rejected" });
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  // --- Create a new game doc and (optionally) a game_invite doc ---
  const createGameAndInvite = async (friend) => {
  if (!user?.uid) return;

  const participantsId = getParticipantsId(user.uid, friend.friendId);
  const safeA = (user.displayName || "playerA").replace(/\s+/g, "-");
  const safeB = (friend.friendDisplayName || "playerB").replace(/\s+/g, "-");
  const newGameId = `${safeA}-${safeB}-${Date.now()}`;

  const gameRef = doc(db, "games", newGameId);

  // 🔹 Mindig ellenőrizzük, hogy UID-k különböznek
  const players = [
    { uid: user.uid, displayName: user.displayName, color: "white" },
    { uid: friend.friendId, displayName: friend.friendDisplayName, color: "black" }
  ];

  const gameData = {
    gameId: newGameId,
    participantsId,
    players,
    status: "waiting",
    completed: false,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(gameRef, gameData);

    await addDoc(collection(db, "game_invites"), {
      fromUserId: user.uid,
      fromDisplayName: user.displayName,
      toUserId: friend.friendId,
      toDisplayName: friend.friendDisplayName,
      status: "pending",
      gameId: newGameId,
      participantsId,
      createdAt: serverTimestamp()
    });

    // 🔹 Navigáláskor mindig a Firestore alapján adjuk a színt
    const myPlayer = players.find(p => p.uid === user.uid);
    navigate(`/game/${newGameId}`, { state: { playerColor: myPlayer.color } });

  } catch (err) {
    console.error("createGameAndInvite error:", err);
    alert("Hiba történt játék létrehozásakor. Nézd a konzolt.");
  }
};


  // --- Join existing game (or create if finished) ---
  const handleInviteOrJoin = async (friend) => {
  if (!user?.uid) return;

  const participantsId = getParticipantsId(user.uid, friend.friendId);
  const existing = existingGamesMap[participantsId];

  try {
    if (existing) {
      if (!existing.completed) {
        // ha waiting -> set status active
        if (existing.status === "waiting") {
          try {
            await updateDoc(doc(db, "games", existing.id), {
              status: "active",
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.warn("Could not mark game active:", err);
          }
        }

        // 🔹 Itt mindig a Firestore-ból határozzuk meg a színt
        const myPlayer = existing.players?.find(p => p.uid === user.uid);
        const playerColor = myPlayer?.color;

        console.log("🎨 My player color:", playerColor, "existing game:", existing.id);
        navigate(`/game/${existing.id}`, { state: { playerColor } });
        return;
      }

      // ha a játék befejeződött -> hozzunk létre újat
      await createGameAndInvite(friend);
      return;
    }

    // nincs még game -> új létrehozása
    await createGameAndInvite(friend);

  } catch (err) {
    console.error("handleInviteOrJoin error:", err);
    alert("Hiba történt (invite/join). Nézd a konzolt.");
  }
};



  // --- Delete a game (completely) ---
  const handleDeleteGame = async (game) => {
    if (!game?.id) return;
    const ok = window.confirm("Tényleg törlöd ezt a szobát? Ez mindenkinél eltűnik.");
    if (!ok) return;

    try {
      // 1) töröljük a game doksit
      await deleteDoc(doc(db, "games", game.id));

      // 2) töröljük az ehhez tartozó game_invites dokumenteket (ha vannak)
      const qInv = query(collection(db, "game_invites"), where("gameId", "==", game.id));
      const snapInv = await getDocs(qInv);
      const deletes = snapInv.docs.map(d => deleteDoc(doc(db, "game_invites", d.id)));
      await Promise.all(deletes);

      // existingGamesMap majd a snapshot listener frissíti automatikusan a kliensen
      alert("Szoba törölve.");
    } catch (err) {
      console.error("handleDeleteGame error:", err);
      alert("Hiba a szoba törlésekor. Nézd a konzolt.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Friends</h1>

      {/* Saját felhasználónév megjelenítése */}
      <div className="mb-6 p-3 bg-white rounded shadow w-full max-w-md">
        <div className="text-sm text-gray-500">You are signed in as</div>
        <div className="text-lg font-semibold">{user?.displayName || user?.email || "Unknown user"}</div>
      </div>

      {/* Add Friend */}
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-8 w-full max-w-md">
        <input
          type="text"
          placeholder="Friend's display name"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          className="p-2 rounded-lg border border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
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
            {friends.map((f, i) => {
              const pid = getParticipantsId(user.uid, f.friendId);
              const existing = existingGamesMap[pid];

              const btnLabel = existing
                ? (existing.status === "waiting" || existing.status === "active") ? "Join" : "Invite"
                : "Invite";

              return (
             <li style={{margin:'20px'}}
  key={i}
  className="p-4 bg-white rounded-lg shadow hover:bg-purple-50 transition flex items-center justify-between mb-4"
>
  {/* Bal oldal: név */}
  <div className="font-medium text-left text-lg flex-1">
    👤 {f.friendDisplayName}
  </div>

  {/* Jobb oldal: game info + gombok */}
  <div className="flex items-center space-x-4">
    <span className="text-xs text-gray-500">
      {existing ? `Game: ${existing.id} · status: ${existing.status}` : "No active game"}
    </span>

    <button
      onClick={() => handleInviteOrJoin(f)}
      className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
    >
      {btnLabel}
    </button>

    {existing && (existing.players || []).some(p => p.uid === user.uid) && (
      <button
        onClick={() => handleDeleteGame(existing)}
        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        title="Delete room for both players"
      >
        Delete
      </button>
    )}
  </div>
</li>


              );
            })}
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

export default Friends;

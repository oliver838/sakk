// App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import "./App.css";

import { Board } from "./components/Board";
import { Authentication } from "./components/Authentication";
import { Home } from "./pages/Home";
import { Menu } from "./components/Menu";
import { OnlineMatchmaking } from "./pages/OnlineMatchmaking";
import { Friends } from "./pages/Friends";
import { FriendInvites } from "./pages/FriendInvites";
import { BoardWrapper } from "./components/BoardWrapper";

function App() {
  const [user, setUser] = useState(null); // most ez tartalmaz mindent
  const [loading, setLoading] = useState(true);

  const startLocalGame = () => {
    window.location.href = "/chess";
  };

  const startOnlineGame = () => {
    window.location.href = "/online";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            // 🔹 Firestore-ból jövő adatok hozzáadása a user objektumhoz
            setUser({ ...currentUser, ...docSnap.data() });
          } else {
            setUser(currentUser); // ha nincs Firestore dokumentum
          }
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      {user && (
        <Menu
          user={user}
          setUser={setUser}
          onStartLocal={startLocalGame}
          onStartOnline={startOnlineGame}
        />
      )}
      <Routes>
        <Route
          path="/login"
          element={!user ? <Authentication onLogin={(u) => setUser(u)} /> : <Navigate to="/home" />}
        />
        <Route
          path="/home"
          element={user ? <Home user={user} setUser={setUser} onStartLocal={startLocalGame} onStartOnline={startOnlineGame} /> : <Navigate to="/login" />}
        />
        <Route
          path="/online"
          element={user ? <OnlineMatchmaking user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/friends"
          element={user ? <Friends user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/friendinvites"
          element={user ? <FriendInvites user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/game/:gameId"
          element={user ? <BoardWrapper user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/chess"
          element={user ? <Board gameMode="local" playerColor="white" user={user} /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 Játék indítási függvények
  const startLocalGame = () => navigate("/chess");
  const startOnlineGame = () => navigate("/online");

  // 🔹 Auth figyelés
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName  // <- username helyett displayName
      } : null);

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;
  }

  return (
    <>
      {/* 🔹 Menu csak ha be van jelentkezve */}
      {user && (
        <Menu setUser={setUser} onStartLocal={startLocalGame} onStartOnline={startOnlineGame} />
      )}

      <Routes>
        {/* 🔹 Login */}
        <Route
          path="/login"
          element={!user ? <Authentication onLogin={setUser} /> : <Navigate to="/home" />}
        />

        {/* 🔹 Home */}
        <Route
          path="/home"
          element={user ? <Home setUser={setUser} onStartLocal={startLocalGame} onStartOnline={startOnlineGame} /> : <Navigate to="/login" />}
        />

        {/* 🔹 Online matchmaking */}
        <Route
          path="/online"
          element={user ? <OnlineMatchmaking user={user} setUser={setUser} /> : <Navigate to="/login" />}
        />

        {/* 🔹 Friends */}
        <Route
          path="/friends"
          element={user ? <Friends user={user} /> : <Navigate to="/login" />}
        />

        {/* 🔹 Friend invites */}
        <Route
          path="/friendinvites"
          element={user ? <FriendInvites user={user} /> : <Navigate to="/login" />}
        />

        {/* 🔹 Online game board */}
        <Route
          path="/game/:gameId"
          element={user ? <BoardWrapper user={user} /> : <Navigate to="/login" />}
        />

        {/* 🔹 Local game */}
        <Route
          path="/chess"
          element={
            user ? (
              <Board gameMode="local" playerColor="white" user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* 🔹 Default */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </>
  );
}

export default App;

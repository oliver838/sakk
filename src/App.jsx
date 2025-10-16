import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

  const startLocalGame = () => {
    // Offline játék: white kezd
    window.location.href = "/chess";
  };

  const startOnlineGame = () => {
    // Online játék: matchmaking oldal
    window.location.href = "/online";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      {user && (
        <Menu
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
          element={user ? <Home setUser={setUser} onStartLocal={startLocalGame} onStartOnline={startOnlineGame} /> : <Navigate to="/login" />}
        />
        <Route
          path="/online"
          element={user ? <OnlineMatchmaking user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/friends"
          element={user ? <Friends user={user} /> : <Navigate to="/friends" />}
        />
        <Route
          path="/friendinvites"
          element={user ? <FriendInvites user={user} /> : <Navigate to="/friendinvites" />}
        />
        <Route
          path="/game/:gameId"
          element={user ? <BoardWrapper /> : <Navigate to="/" />}
        />
        <Route
          path="/chess"
          element={
            user ? (
              <Board gameMode="local" playerColor="white" /> // Offline: white kezd
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

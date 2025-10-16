import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";
import "./App.css";
import { Board } from "./components/Board";
import { Authentication } from "./components/Authentication";
import { Menu } from "./components/Menu";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <Routes>
        <Route
          path="/login"
          element={
            !user ? (
              <Authentication onLogin={(user) => setUser(user)} />
            ) : (
              <Navigate to="/chess" />
            )
          }
        />
        <Route
          path="/chess"
          element={
            user ? (
              <>
                <Board />
                <Menu setUser={setUser} />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? "/chess" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

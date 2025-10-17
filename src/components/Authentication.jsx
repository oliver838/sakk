// Authentication.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, query, collection, where, getDocs } from "firebase/firestore";

export const Authentication = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    if (!email || !password || (isRegister && !displayName.trim())) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Ellenőrzés Firestore-ban, hogy foglalt-e a displayName
        const nameQuery = query(
          collection(db, "users"),
          where("publicProfile.displayName", "==", displayName)
        );
        const nameSnap = await getDocs(nameQuery);
        if (!nameSnap.empty) {
          setError("This display name is already taken!");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName });

        // 🔹 Firestore doc létrehozása
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          displayName,
          publicProfile: { displayName: user.displayName } // ✅ javított typo
        });

        onLogin({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          publicProfile: { displayName: user.displayName }
        });

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        onLogin({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          publicProfile: { displayName: user.displayName }
        });
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setIsRegister(prev => !prev);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError("");
  };

  useEffect(() => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setIsRegister(false);
    setError("");
  }, []);

  return (
    <div className="auth-container flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-2xl font-bold mb-2">{isRegister ? "Register" : "Login"}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        {isRegister && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="p-2 border rounded text-black"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 border rounded text-black"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-2 border rounded text-black"
        />

        <button
          type="submit"
          disabled={loading}
          className={`bg-purple-600 text-white px-6 py-2 rounded-lg ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
          }`}
        >
          {loading ? "Loading..." : isRegister ? "Sign Up" : "Login"}
        </button>
      </form>

      <p>
        {isRegister ? "Already have an account?" : "No account yet?"}{" "}
        <button
          onClick={handleSwap}
          className="text-purple-400 underline"
          disabled={loading}
        >
          {isRegister ? "Login" : "Register"}
        </button>
      </p>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

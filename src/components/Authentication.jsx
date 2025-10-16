import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export const Authentication = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        // 🔹 1️⃣ Létrehozzuk a felhasználót
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // 🔹 2️⃣ Mentjük Firestore-ba az extra adatokat
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          username,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      // 🔹 3️⃣ Visszaadjuk a bejelentkezett user-t a fő App.jsx-nek
      onLogin(auth.currentUser);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleSwap = () => {
    setIsRegister(!isRegister);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  useEffect(() => {
    setEmail("");
    setPassword("");
    setIsRegister(false);
  }, []);

  return (
    <div className="auth-container flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-2xl font-bold mb-2">
        {isRegister ? "Register" : "Login"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        {isRegister && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
        >
          {isRegister ? "Sign up" : "Login"}
        </button>
      </form>

      <p>
        {isRegister ? "Already have an account?" : "No account yet?"}{" "}
        <button onClick={handleSwap} className="text-purple-400 underline">
          {isRegister ? "Login" : "Register"}
        </button>
      </p>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

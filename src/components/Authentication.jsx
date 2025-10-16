import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
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
            // 🔹 Ellenőrizzük, hogy a username már foglalt-e
            const userQuery = query(collection(db, "users"), where("username", "==", username));
            const snapshot = await getDocs(userQuery);
            if (!snapshot.empty) {
                setError("This username is already taken!");
                return;
            }

            // 🔹 Regisztráció
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 🔹 Username mentése az Auth user-be
            await updateProfile(user, { displayName: username });

            // 🔹 Extra adatok mentése Firestore-ba
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email,
                username,
            });

            // 🔹 Visszaadjuk az aktuális user-t a fő App-nek
            onLogin({ ...user, username });
            } else {
            // 🔹 Bejelentkezés
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 🔹 Lekérjük Firestore-ból a username-t
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                onLogin({ ...user, ...docSnap.data() });
            } else {
                onLogin(user);
            }
            }


        // 🔹 Visszaadjuk az aktuális user-t a fő App-nek
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
    // Alapértelmezett állapot
    setEmail("");
    setPassword("");
    setUsername("");
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

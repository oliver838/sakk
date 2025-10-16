import { useState } from "react";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useEffect } from "react";

export const Authentication = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin(auth.currentUser);

    } catch (err) {
      setError(err.message);
    }
  };
  const handleSwap = () => {
    setIsRegister(!isRegister);
    setEmail("");
    setPassword("");
  }

  useEffect(() => {
    setEmail("");
    setPassword("");
    setIsRegister(false);
  }, []);
  return (
    <div className="auth-container">
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isRegister ? "Sign up" : "Login"}</button>
      </form>
      <p>
        {isRegister ? "Already have an account?" : "No account yet?"}{" "}
        <button onClick={handleSwap}>
          {isRegister ? "Login" : "Register"}
        </button>
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

export const LogoutButton = ({ onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth); 
      if(onLogout) onLogout(); // frissítjük a state-et
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button className="logout-button" onClick={handleLogout}>
      Logout
    </button>
  );
};

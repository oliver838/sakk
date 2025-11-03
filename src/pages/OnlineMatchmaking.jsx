import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "../components/Menu";

export const OnlineMatchmaking = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRandomMatch = async () => {
    setLoading(true);
    try {
      // Példa: findOrCreateGame user.uid alapján
      const { id, color } = await findOrCreateGame(user.uid);
      navigate(`/chess?gameId=${id}&color=${color}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayWithFriend = () => {
    navigate("/friends");
  };

  return (
    <div className="home-container">
      <Menu setUser={setUser} />
      <div className="flex flex-col items-center justify-center h-screen space-y-6">
       

        <button
          onClick={handlePlayWithFriend}
          className="bg-gray-800 text-white text-xl px-8 py-4 rounded-2xl shadow-lg hover:bg-gray-900 transition"
        >
          🧑‍🤝‍🧑 Play with Friend
        </button>
      </div>
    </div>
  );
};

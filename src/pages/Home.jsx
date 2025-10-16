import React from "react";
import { Menu } from "../components/Menu";

export const Home = ({ onStartLocal, onStartOnline, setUser }) => {
  return (
    <div className="home-container">
      <div className="flex flex-col items-center justify-center h-screen space-y-6">
        <button
          onClick={onStartLocal}
          className="bg-purple-600 text-white text-xl px-8 py-4 rounded-2xl shadow-lg hover:bg-purple-700 transition"
        >
          🧩 Local Game
        </button>
        <button
          onClick={onStartOnline}
          className="bg-gray-800 text-white text-xl px-8 py-4 rounded-2xl shadow-lg hover:bg-gray-900 transition"
        >
          🌍 Online Game
        </button>
      </div>
    </div>
  );
};

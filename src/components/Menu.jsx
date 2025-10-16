import React, { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineMenuAlt2, HiOutlineMenuAlt3 } from "react-icons/hi";
import { LogoutButton } from "./Logout";
import { Link } from "react-router-dom";

export const Menu = ({ setUser, onStartLocal, onStartOnline }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelWidth = 250; // menü szélessége
    
  return (
    <>
      {/* A csúszó panel */}
      <motion.div
        initial={{ x: -panelWidth }}
        animate={{ x: isOpen ? 0 : -panelWidth }}
        transition={{ type: "tween", duration: 0.3 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: panelWidth,
          height: "100vh",
          background: "#222",
          color: "white",
          padding: "20px",
          zIndex: 100,
          boxShadow: "2px 0 10px rgba(0,0,0,0.5)",
          marginLeft: !isOpen ? '-50px' : '0', // panel eltolása
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, marginTop: 60 }}>
          
          <li><Link to="/" className="hover:underline">Home</Link></li>
          <li> <Link to="/friends" className="hover:underline">Friends</Link></li>
          <li> <Link to="/friendinvites" className="hover:underline">Friendinvites</Link></li>
          
          <li style={{ marginBottom: "16px", cursor: "pointer" }}>Help</li>
          <li><LogoutButton onLogout={() => setUser(null)} /></li>
        </ul>
      </motion.div>

      {/* Hamburger gomb, ami a panellel együtt csúszik */}
     <motion.button
  onClick={() => setIsOpen(prev => !prev)}
  animate={{
    x: isOpen ? panelWidth : 0,
    marginLeft: isOpen ? -55 : 10, // itt animáljuk
  }}
  transition={{ type: "tween", duration: 0.3 }}
  style={{
    position: "fixed",
    top: 10,
    left: 0,
    zIndex: 110,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: "6px",
    boxShadow: "0 0 5px 2px rgba(179, 142, 238, 0.8)",
    cursor: "pointer",
    background: "#6a0dad",
    color: "white",
    fontWeight: "bold",
    fontSize: "20px",
    outline: "none",
  }}
>
  {isOpen ? <HiOutlineMenuAlt3 /> : <HiOutlineMenuAlt2 />}
</motion.button>



    </>
  );
};

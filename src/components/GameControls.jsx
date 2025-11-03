// src/components/GameControls.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function GameControls({ gameId = null, mode = "online", user = null, onEnd = null }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);

  const handleEndMatch = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "online" && gameId) {
        // Update Firestore game doc: mark it finished / completed
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, {
          completed: true,
          status: "finished",
          finishedAt: serverTimestamp(),
          finishedBy: user?.uid ?? "unknown",
          finishReason: "resign" // lehet "resign" | "checkmate" | "disconnect"
        });
      } else {
        // local mode: nothing to touch in firestore by default
        // (ha szeretnéd, ide is lehet mentést/bejegyzést)
      }

      setLoading(false);
      setConfirmOpen(false);

      // callback a parentnek ha van
      if (typeof onEnd === "function") onEnd();

      // egyszerű UX: vissza a home-ra
      navigate("/home");
    } catch (err) {
      console.error("Error finishing game:", err);
      alert("Hiba történt a meccs lezárásakor. Nézd a konzolt.");
      setLoading(false);
    }
  };

  return (
    <div className="game-controls-sidebar">
      <div className="controls-card">
        <h3 className="controls-title">Match controls</h3>

        <p className="muted">Itt tudod befejezni a meccset — a másik játékost tájékoztathatod róla.</p>

        <div className="controls-actions">
          <button
            className="btn end-btn"
            onClick={openConfirm}
            aria-label="End match"
            title="Vége a meccsnek"
          >
            ⛔ End match
          </button>

          <button
            className="btn small-btn"
            onClick={() => { navigate("/home"); }}
            title="Kilépés vissza a főoldalra"
          >
            ↩ Back to Home
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h4 className="modal-title">Are you sure you want to end the match?</h4>
            <p className="modal-desc">Ez a lépés beállítja a meccset <strong>finished</strong>-re. A játék véget ér és a másik játékosnak is jelezve lesz.</p>

            <div className="modal-actions">
              <button
                className="btn cancel-btn"
                onClick={closeConfirm}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="btn confirm-btn"
                onClick={handleEndMatch}
                disabled={loading}
              >
                {loading ? "Ending…" : "Yes, end match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

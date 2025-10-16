import { db } from "../firebaseConfig";
import { collection, addDoc, query, where, getDocs, doc, onSnapshot, updateDoc } from "firebase/firestore";

export async function findOrCreateGame(userId) {
  const gamesRef = collection(db, "games");

  // keresünk üres játékot
  const q = query(gamesRef, where("status", "==", "waiting"));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // csatlakozás meglévőhöz
    const gameDoc = snapshot.docs[0];
    await updateDoc(gameDoc.ref, {
      player2: userId,
      status: "active",
    });
    return { id: gameDoc.id, color: "black" };
  } else {
    // új játék létrehozása
    const newGame = await addDoc(gamesRef, {
      player1: userId,
      player2: null,
      status: "waiting",
      board: initialBoard(),
      currentTurn: "white",
      lastMove: null,
    });
    return { id: newGame.id, color: "white" };
  }
}

function initialBoard() {
  return Array(8).fill(null).map(() => Array(8).fill(null));
}

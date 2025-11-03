// src/hooks/useOnlineGame.js
import { useEffect } from "react";
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

export default function useOnlineGame({
  onlineGameId,
  playerColor,
  getInitialBoard,
  firestoreToBoard,
  boardToFirestore,
  setters,
  prevBoardRef,
}) {
  const {
    setBoard,
    setCurrentTurn,
    setLastMove,
    setBothPlayersJoined,
    setHitPiece,
    setAttackingPiece,
    setSelected,
    setValidMoves,
  } = setters;

  // csak az első snapshotot akarjuk kihagyni
  let firstSnapshot = true;

  useEffect(() => {
    if (!onlineGameId) return;

    let unsub = null;
    let cancelled = false;

    const init = async () => {
      try {
        const user = auth.currentUser;
        const gameRef = doc(db, "games", onlineGameId);
        const snapshot = await getDoc(gameRef);
        let newBoard = getInitialBoard();

        if (!snapshot.exists()) {
          const players = playerColor === "white"
            ? { white: user?.uid || null, black: null }
            : { white: null, black: user?.uid || null };

          await setDoc(gameRef, {
            board: boardToFirestore(newBoard),
            currentTurn: "white",
            lastMove: null,
            players,
            hitPiece: null,
            attackingPiece: null,
            createdAt: serverTimestamp(),
          });
        } else {
          const data = snapshot.data();
          if (data?.board) {
            const candidate = firestoreToBoard(data.board);
            newBoard = candidate || newBoard;
          }
          if (!cancelled) {
            setCurrentTurn(data?.currentTurn || "white");
            setLastMove(data?.lastMove || null);
            setBothPlayersJoined(!!data?.players?.white && !!data?.players?.black);
          }
        }

        prevBoardRef.current = newBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
        if (!cancelled) {
          setBoard(newBoard);
          setSelected(null);
          setValidMoves([]);
        }

        // 🔥 Realtime listener
        // 🔥 Realtime listener
unsub = onSnapshot(gameRef, (snap) => {
  const data = snap.data();
  if (!data) return;

  // ⚡ Ha az első snapshotban nincs board, nem frissítünk
  if (firstSnapshot) {
    firstSnapshot = false;

    if (data.board) {
      prevBoardRef.current = firestoreToBoard(data.board);
    }

    // Ha még nincs board a Firestore-ban → NE setBoard-olj, várjuk a következő snapshotot
    if (!data.board) {
      console.log("Első snapshotban nincs még board — kihagyva inicializálás");
      return;
    }
  }

  const previous = prevBoardRef.current
    ? prevBoardRef.current.map(row => row.map(c => (c ? { ...c } : null)))
    : [];

  if (data.board) {
    const incoming = firestoreToBoard(data.board);

    // ⚡ Ha üres vagy null board jön, NE írjuk felül
    const totalPieces = incoming.flat().filter(Boolean).length;
    if (totalPieces === 0) {
      console.log("Üres board snapshot érkezett — kihagyva");
      return;
    }

    // 🔁 Csak akkor frissítünk, ha tényleg más a board
    const same = JSON.stringify(prevBoardRef.current) === JSON.stringify(incoming);
    if (!same) {
      console.log("Board változott, frissítés...");
      prevBoardRef.current = previous;
      setBoard(incoming);
    }
  }

  if ("currentTurn" in data) setCurrentTurn(data.currentTurn || "white");
  if (data.players) setBothPlayersJoined(!!data.players.white && !!data.players.black);

  // 🔥 Move + animációk
  if (data.lastMove && data.lastMove.id !== (typeof window !== "undefined" ? window.__lastMoveId : null)) {
    const lm = data.lastMove;
    setLastMove(lm);

    if (lm.captured) {
      const targetPos = (() => {
        for (let r = 0; r < previous.length; r++) {
          for (let c = 0; c < previous[r].length; c++) {
            if (previous[r][c]?.id === lm.targetId) return { row: r, col: c };
          }
        }
        return null;
      })();

      if (targetPos) {
        setHitPiece({ row: targetPos.row, col: targetPos.col, targetId: lm.targetId });
      }

      setAttackingPiece({
        fromRow: lm.fromRow,
        fromCol: lm.fromCol,
        toRow: lm.toRow,
        toCol: lm.toCol,
        pieceId: lm.pieceId,
      });
    } else if (lm.castling) {
      setAttackingPiece({
        fromRow: lm.fromRow,
        fromCol: lm.fromCol,
        toRow: lm.toRow,
        toCol: lm.toCol,
        pieceId: lm.pieceId,
      });
    }

    if (typeof window !== "undefined") window.__lastMoveId = lm.id;
  } else if (!data.lastMove) {
    setHitPiece(data.hitPiece || null);
    setAttackingPiece(data.attackingPiece || null);
  }

  setSelected(null);
  setValidMoves([]);
});

      } catch (err) {
        console.error("useOnlineGame init failed", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [
    onlineGameId,
    playerColor,
    getInitialBoard,
    firestoreToBoard,
    boardToFirestore,
    setBoard,
    setCurrentTurn,
    setLastMove,
    setBothPlayersJoined,
    setHitPiece,
    setAttackingPiece,
    setSelected,
    setValidMoves,
    prevBoardRef,
  ]);
}

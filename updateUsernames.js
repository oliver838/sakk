import { db } from "./src/firebaseConfig"; // a te firebase configod
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function addMissingUsernames() {
  const usersCol = collection(db, "users");
  const snapshot = await getDocs(usersCol);

  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    if (!data.username) {
      let username = data.displayName;

      // Ha nincs displayName, akkor az emailből készítünk egy rövid nevet
      if (!username && data.email) {
        username = data.email.split("@")[0];
      }

      // Ha még így se lenne, generálunk egy random rövid nevet
      if (!username) {
        username = `user${Math.floor(Math.random() * 10000)}`;
      }

      await updateDoc(doc(db, "users", userDoc.id), { username });
      console.log(`Updated user ${userDoc.id} with username: ${username}`);
    }
  }

  console.log("All missing usernames updated!");
}

addMissingUsernames().catch(console.error);

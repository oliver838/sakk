// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbwSfgKO2aefbKQz5bRo6oXV_8RkDgng8",
  authDomain: "chess-alma.firebaseapp.com",
  projectId: "chess-alma",
  storageBucket: "chess-alma.firebasestorage.app",
  messagingSenderId: "1073063882031",
  appId: "1:1073063882031:web:c3634cb20ab8b9ed3985da"
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore();


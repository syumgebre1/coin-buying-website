import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCK5kfyHhrbywpbLbGzDhjjYgd7qakBJQc",
  authDomain: "coin-buying-website.firebaseapp.com",
  projectId: "coin-buying-website",
  storageBucket: "coin-buying-website.firebasestorage.app",
  messagingSenderId: "511864697105",
  appId: "1:511864697105:web:a19811391c4484e4de5cb0",
  measurementId: "G-005MP9B7YF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

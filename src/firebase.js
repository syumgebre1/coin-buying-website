import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAN_XcDH_YhXI3PN_FYZ6LvRGntHDeDE2k",
  authDomain: "coin-buying-website.firebaseapp.com",
  projectId: "coin-buying-website",
  storageBucket: "coin-buying-website.firebasestorage.app",
  messagingSenderId: "881810560595", 
  appId: "1:881810560595:web:8d9714f76c1e542a3b0fa6" 
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUXGyNDaxU1GNI8o-lAuRQicCseLpqLFg",
  authDomain: "gourmet-ecab9.firebaseapp.com",
  projectId: "gourmet-ecab9",
  storageBucket: "gourmet-ecab9.firebasestorage.app",
  messagingSenderId: "380215284621",
  appId: "1:380215284621:web:0c4bd45c89839756eea3c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;  
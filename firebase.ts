// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClcEtJjoJ2yL6Dfhx8FqUIoILvzwjI1dw",
  authDomain: "gourmet-dc6d1.firebaseapp.com",
  projectId: "gourmet-dc6d1",
  storageBucket: "gourmet-dc6d1.firebasestorage.app",
  messagingSenderId: "247319407957",
  appId: "1:247319407957:web:6faa02ed072200c2aa13dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Export the app instance as well (in case it's needed elsewhere)
export default app;
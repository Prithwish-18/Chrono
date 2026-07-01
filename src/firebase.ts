import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCRX7_bYzNNr2Y8aSfi6SxZBhXkPMMqoWU",
  authDomain: "chrono-8ebda.firebaseapp.com",
  projectId: "chrono-8ebda",
  storageBucket: "chrono-8ebda.firebasestorage.app",
  messagingSenderId: "1090485271081",
  appId: "1:1090485271081:web:5d994ac73a17a4fef7ba38",
  measurementId: "G-L8KZB03KMK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

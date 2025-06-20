// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDcPnWAaEhbNGz_FAu130JU9a20sk6PZes",
    authDomain: "turtle-stock.firebaseapp.com",
    projectId: "turtle-stock",
    storageBucket: "turtle-stock.firebasestorage.app",
    messagingSenderId: "449148241912",
    appId: "1:449148241912:web:f366e6dcf9d7d96063b80d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };


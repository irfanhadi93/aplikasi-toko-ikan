// ===== firebase.js =====

// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// (Optional tapi penting kalau mau database)
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Config project kamu
const firebaseConfig = {
  apiKey: "AIzaSyBsGieL8yJ0zjmhuKEhp10vnNR5LvJV3hU",
  authDomain: "toko-belut.firebaseapp.com",
  projectId: "toko-belut",
  storageBucket: "toko-belut.firebasestorage.app",
  messagingSenderId: "853114825791",
  appId: "1:853114825791:web:bc5fa9ae75a0c60c021c8a"
};

// Init Firebase
const app = initializeApp(firebaseConfig);

// Init Firestore (database)
const db = getFirestore(app);

// Export biar bisa dipakai file lain
export { app, db };
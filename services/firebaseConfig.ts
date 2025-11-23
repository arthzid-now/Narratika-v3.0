
// --- KONFIGURASI FIREBASE ---
// 1. Buka console.firebase.google.com
// 2. Buat project baru
// 3. Masuk Project Settings -> General -> Your Apps -> Add Web App
// 4. Copy config object-nya dan paste di bawah ini menggantikan nilai placeholder

export const firebaseConfig = {
  apiKey: "AIzaSyAe_4V6ZewMpl-aEzy11i5PQ4d5kppgKk0",
  authDomain: "narratika-v3.firebaseapp.com",
  projectId: "narratika-v3",
  storageBucket: "narratika-v3.firebasestorage.app",
  messagingSenderId: "590324305792",
  appId: "1:590324305792:web:cb97fd0a94dfff3ea77b65"
};

// Cek sederhana biar gak crash kalau lupa isi
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "AIzaSyAe_4V6ZewMpl-aEzy11i5PQ4d5kppgKk0";
};

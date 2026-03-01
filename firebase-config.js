// ============================================================
// FIREBASE CONFIG — LEX NOVA HQ
// Central config file. Import this into every HTML page.
// DO NOT duplicate firebaseConfig in individual files.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
  authDomain: "lexnova-hq.firebaseapp.com",
  projectId: "lexnova-hq",
  storageBucket: "lexnova-hq.firebasestorage.app",
  messagingSenderId: "539475214055",
  appId: "1:539475214055:web:c01a99ec94ff073a9b6c42"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

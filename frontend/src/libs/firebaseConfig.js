import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB_u9SRySukWgFpXnPRAPkVZg1s9RnsIUE",
  authDomain: "wallet-expenses-coa.firebaseapp.com",
  projectId: "wallet-expenses-coa",
  storageBucket: "wallet-expenses-coa.firebasestorage.app",
  messagingSenderId: "829626328995",
  appId: "1:829626328995:web:72795b472ee578cf4ddc16",
  measurementId: "G-YRNPLKGFS6",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
export { app, analytics, auth };

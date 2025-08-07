import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { getVertexAI, Schema } from "@firebase/vertexai";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_PUBLIC_API_KEY,
  authDomain: "datachecking-7997c.firebaseapp.com",
  projectId: "datachecking-7997c",
  storageBucket: "datachecking-7997c.firebasestorage.app",
  messagingSenderId: "931996417182",
  appId: "1:931996417182:web:ed3228abafceec5efa4f8f",
  measurementId: "G-B5B19Z9B5N",
};

export const app = initializeApp(firebaseConfig);

const database = getFirestore(app);
const analytics = getAnalytics(app);
const vertexAI = getVertexAI(app);

let messaging = null;
async function initMessaging() {
  if (await isSupported()) {
    messaging = getMessaging(app);
    // Proceed with messaging-related logic
    console.log("messaging...", messaging);
  } else {
    console.warn("Firebase Messaging is not supported in this environment.");
    // Optionally, set up a fallback or skip messaging entirely
  }
}
initMessaging();

// 3) Pass that into your model’s generationConfig:

export { database, analytics, vertexAI, messaging, Schema };

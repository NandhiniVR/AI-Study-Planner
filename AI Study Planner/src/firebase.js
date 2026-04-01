import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyB5L0HhLngJDD-T43HRC6L4HHJohtIFcew",
  authDomain: "study-planner-aicc.firebaseapp.com",
  projectId: "study-planner-aicc",
  storageBucket: "study-planner-aicc.firebasestorage.app",
  messagingSenderId: "894625398208",
  appId: "1:894625398208:web:4c44595389857ab7ce1c25",
  measurementId: "G-0BZMG8GP9P"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const analytics = getAnalytics(app)

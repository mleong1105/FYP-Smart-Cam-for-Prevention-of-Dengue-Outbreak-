// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYcfKQn-qa77dG-N73nJe2JBpGEDO1-5E",
  authDomain: "dengueshield.firebaseapp.com",
  projectId: "dengueshield",
  storageBucket: "dengueshield.appspot.com",
  messagingSenderId: "628193220247",
  appId: "1:628193220247:web:2b7bbbe115041de7337bd2",
  measurementId: "G-9YCV5RT8VT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
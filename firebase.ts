// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeNz_jiEsiWyaWZr9KOrLyDi9VWa3GZ1Q",
  authDomain: "smart-materials-ab957.firebaseapp.com",
  projectId: "smart-materials-ab957",
  storageBucket: "smart-materials-ab957.firebasestorage.app",
  messagingSenderId: "512597206147",
  appId: "1:512597206147:web:834d4270bf2840bebe27b6"
};

// Initialize Firebase if it hasn't been already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services using the compat API from the global object
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };
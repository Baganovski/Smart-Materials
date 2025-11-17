// Capture the global firebase object from the window, as it's loaded via a script tag.
const firebase = (window as any).firebase;

// --- Firebase Configuration ---
// IMPORTANT: Replace the placeholder values below with your actual Firebase project credentials.
// You can find these in your Firebase project settings.

// For a public-facing web app, it's standard for this configuration to be included in the client-side code.
// The primary security layer for your data is Firebase's Security Rules, not hiding this key.
//
// TO ENHANCE SECURITY FOR A PRODUCTION APP:
// 1. Go to the Google Cloud Console for your project.
// 2. Navigate to "APIs & Services" > "Credentials".
// 3. Find the API key used by your web app.
// 4. Click on it and under "Application restrictions", select "HTTP referrers (web sites)".
// 5. Add your website's domain (e.g., `*.your-domain.com`). This prevents others from using your key on their own sites.

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

// Initialize Firebase services using the compat API
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db, firebase };
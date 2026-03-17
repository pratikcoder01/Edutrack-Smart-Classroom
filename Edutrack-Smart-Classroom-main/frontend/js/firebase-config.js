// Firebase API Configuration
// IMPORTANT: Replace these with your actual Firebase project config from the Firebase Console (Web App settings)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
window.db = firebase.firestore();

// Optional: Initialize Analytics (if needed later)
// const analytics = firebase.analytics();

console.log("🔥 Firebase Web SDK Initialized successfully.");

# Firebase Setup Instructions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Add authorized domains:
   - Go to Authentication > Settings > Authorized domains
   - Add your Vercel domain: `prefects-itzlewmithas-projects.vercel.app`
   - Add `localhost` for testing
5. Enable Firestore:
   - Go to Firestore Database
   - Create database (start in test mode)
6. Get your config:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Add a web app if you haven't already
   - Copy the config object
7. Update `firebase.js`:
   - Replace the `firebaseConfig` object with your actual config

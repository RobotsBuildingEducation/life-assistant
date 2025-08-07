// public/firebase-messaging-sw.js

// Import Firebase scripts required for the service worker.
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js"
);

// Initialize Firebase with your configuration.
firebase.initializeApp({
  apiKey: "AIzaSyA4GL5Uc-Nod0OvshPE3EsZRLkLLfJ07-c",
  authDomain: "datachecking-7997c.firebaseapp.com",
  projectId: "datachecking-7997c",
  storageBucket: "datachecking-7997c.firebasestorage.app",
  messagingSenderId: "931996417182",
  appId: "1:931996417182:web:ed3228abafceec5efa4f8f",
  measurementId: "G-B5B19Z9B5N",
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const { title, body } = payload.notification;
  const notificationOptions = {
    body: body,
    // Optionally, you can add an icon or other options here.
  };

  // Show the notification to the user.
  self.registration.showNotification(title, notificationOptions);
});

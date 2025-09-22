// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOdJVAU_MC4l7m2ymZVjWhqsc6ERIK78A",
  authDomain: "prefects-src.firebaseapp.com",
  projectId: "prefects-src",
  storageBucket: "prefects-src.firebasestorage.app",
  messagingSenderId: "664071200239",
  appId: "1:664071200239:web:1a5f09b26e6f4781f62a1a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Prefects collection reference
const prefectsCollection = collection(db, "prefects");

// Attendance collection reference
const attendanceCollection = collection(db, "attendance");

// Function to check if user is authenticated
function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(!!user);
    });
  });
}

// Function to login with email and password
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

// Function to create a new user
async function createUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Function to logout
async function logoutUser() {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// Function to get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Function to add a new prefect
async function addPrefect(prefect) {
  try {
    const docRef = await addDoc(prefectsCollection, {
      ...prefect,
      createdAt: new Date().toISOString(),
      createdBy: getCurrentUser()?.email || "unknown"
    });
    console.log("Prefect added with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding prefect: ", e);
    throw e;
  }
}

// Function to get all prefects
async function getAllPrefects() {
  try {
    const querySnapshot = await getDocs(prefectsCollection);
    const prefects = [];
    querySnapshot.forEach((doc) => {
      prefects.push({ id: doc.id, ...doc.data() });
    });
    return prefects;
  } catch (e) {
    console.error("Error getting prefects: ", e);
    throw e;
  }
}

// Function to update a prefect
async function updatePrefect(id, updates) {
  try {
    const prefectRef = doc(db, "prefects", id);
    await updateDoc(prefectRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: getCurrentUser()?.email || "unknown"
    });
    console.log("Prefect updated successfully");
  } catch (e) {
    console.error("Error updating prefect: ", e);
    throw e;
  }
}

// Function to delete a prefect
async function deletePrefect(id) {
  try {
    await deleteDoc(doc(db, "prefects", id));
    console.log("Prefect deleted successfully");
  } catch (e) {
    console.error("Error deleting prefect: ", e);
    throw e;
  }
}

// Function to mark attendance
async function markAttendance(prefectId, date, timestamp) {
  try {
    // Create a unique ID for the attendance record (date + prefectId)
    const attendanceId = `${date}_${prefectId}`;
    const attendanceRef = doc(db, "attendance", attendanceId);
    
    await setDoc(attendanceRef, {
      prefectId: prefectId,
      date: date,
      timestamp: timestamp,
      markedBy: getCurrentUser()?.email || "unknown"
    });
    
    console.log("Attendance marked successfully");
    
    // Update the prefect's total attendance count
    const prefects = await getAllPrefects();
    const prefect = prefects.find(p => p.id === prefectId);
    if (prefect) {
      const newCount = (prefect.totalAttendance || 0) + 1;
      await updatePrefect(prefectId, { totalAttendance: newCount });
    }
  } catch (e) {
    console.error("Error marking attendance: ", e);
    throw e;
  }
}

// Function to get attendance for a specific date
async function getAttendanceByDate(date) {
  try {
    const q = query(attendanceCollection, where("date", "==", date));
    const querySnapshot = await getDocs(q);
    const attendance = [];
    querySnapshot.forEach((doc) => {
      attendance.push({ id: doc.id, ...doc.data() });
    });
    return attendance;
  } catch (e) {
    console.error("Error getting attendance: ", e);
    throw e;
  }
}

// Function to initialize admin user
async function initializeAdmin() {
  try {
    // Try to create admin user - it will fail if already exists, which is fine
    await createUser("admin@prefectsystem.com", "10058");
    console.log("Admin user created or already exists");
  } catch (error) {
    // User likely already exists, which is fine
    console.log("Admin user already exists or error creating:", error.message);
  }
}

// Export functions for use in other files
window.firebaseFunctions = {
  checkAuth,
  loginUser,
  logoutUser,
  getCurrentUser,
  addPrefect,
  getAllPrefects,
  updatePrefect,
  deletePrefect,
  markAttendance,
  getAttendanceByDate,
  initializeAdmin
};

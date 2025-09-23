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
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Your Firebase configuration
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

// Initialize Cloud Firestore
const db = getFirestore(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Authentication functions
function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(!!user);
    });
  });
}

async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

function getCurrentUser() {
  return auth.currentUser;
}

// Prefects functions
async function addPrefect(prefectData) {
  try {
    const docRef = await addDoc(collection(db, "prefects"), {
      ...prefectData,
      createdAt: new Date().toISOString(),
      createdBy: getCurrentUser()?.email || "system"
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding prefect:", error);
    throw error;
  }
}

async function getAllPrefects() {
  try {
    const querySnapshot = await getDocs(collection(db, "prefects"));
    const prefects = [];
    querySnapshot.forEach((doc) => {
      prefects.push({ id: doc.id, ...doc.data() });
    });
    return prefects;
  } catch (error) {
    console.error("Error getting prefects:", error);
    throw error;
  }
}

async function deletePrefect(prefectId) {
  try {
    await deleteDoc(doc(db, "prefects", prefectId));
    return true;
  } catch (error) {
    console.error("Error deleting prefect:", error);
    throw error;
  }
}

// Attendance functions
async function markAttendance(prefectId, date, timestamp) {
  try {
    const attendanceId = `${date}_${prefectId}`;
    const attendanceRef = doc(db, "attendance", attendanceId);
    
    await setDoc(attendanceRef, {
      prefectId: prefectId,
      date: date,
      timestamp: timestamp,
      markedBy: getCurrentUser()?.email || "system"
    });
    
    // Update prefect's total attendance
    await updatePrefectAttendance(prefectId);
    
    return true;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

async function updatePrefectAttendance(prefectId) {
  try {
    const prefectRef = doc(db, "prefects", prefectId);
    const prefectDoc = await getDocs(prefectRef);
    
    if (!prefectDoc.exists) {
      throw new Error("Prefect not found");
    }
    
    const currentAttendance = prefectDoc.data().totalAttendance || 0;
    await updateDoc(prefectRef, {
      totalAttendance: currentAttendance + 1,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating prefect attendance:", error);
    throw error;
  }
}

async function getAttendanceByDate(date) {
  try {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const querySnapshot = await getDocs(q);
    const attendance = [];
    querySnapshot.forEach((doc) => {
      attendance.push(doc.data());
    });
    return attendance;
  } catch (error) {
    console.error("Error getting attendance:", error);
    throw error;
  }
}

// Real-time listener for prefects
function listenToPrefects(callback) {
  return onSnapshot(collection(db, "prefects"), (snapshot) => {
    const prefects = [];
    snapshot.forEach((doc) => {
      prefects.push({ id: doc.id, ...doc.data() });
    });
    callback(prefects);
  });
}

// Export functions
window.firebaseApp = {
  // Auth
  checkAuth,
  loginUser,
  logoutUser,
  getCurrentUser,
  
  // Prefects
  addPrefect,
  getAllPrefects,
  deletePrefect,
  listenToPrefects,
  
  // Attendance
  markAttendance,
  getAttendanceByDate
};

console.log("Firebase initialized successfully");

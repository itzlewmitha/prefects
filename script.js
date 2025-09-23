// Global variables
let currentUser = null;
let isFirebaseReady = false;

// Initialize the application
async function initializeApp() {
  try {
    // Check if Firebase is available
    if (window.firebaseApp) {
      isFirebaseReady = true;
      console.log("Firebase is ready");
      
      // Check authentication state
      const isAuthenticated = await window.firebaseApp.checkAuth();
      if (isAuthenticated) {
        currentUser = window.firebaseApp.getCurrentUser();
        console.log("User is authenticated:", currentUser?.email);
      }
    } else {
      console.log("Firebase not available, using fallback mode");
      isFirebaseReady = false;
    }
  } catch (error) {
    console.error("Error initializing app:", error);
    isFirebaseReady = false;
  }
}

// Authentication functions
async function checkAuth() {
  if (isFirebaseReady) {
    return await window.firebaseApp.checkAuth();
  }
  return localStorage.getItem('prefectAuth') === 'true';
}

async function login(email, password) {
  if (isFirebaseReady) {
    try {
      await window.firebaseApp.loginUser(email, password);
      currentUser = window.firebaseApp.getCurrentUser();
      return true;
    } catch (error) {
      console.error("Firebase login failed:", error);
      // Fallback to simple auth
      if (password === "10058") {
        localStorage.setItem('prefectAuth', 'true');
        return true;
      }
      return false;
    }
  } else {
    // Fallback authentication
    if (password === "10058") {
      localStorage.setItem('prefectAuth', 'true');
      return true;
    }
    return false;
  }
}

async function logout() {
  if (isFirebaseReady && currentUser) {
    await window.firebaseApp.logoutUser();
  }
  localStorage.removeItem('prefectAuth');
  currentUser = null;
  window.location.href = 'index.html';
}

// Prefects management
async function addPrefect(prefectData) {
  if (isFirebaseReady) {
    try {
      const prefectId = await window.firebaseApp.addPrefect(prefectData);
      console.log("Prefect added to Firebase:", prefectId);
      return prefectId;
    } catch (error) {
      console.error("Error adding prefect to Firebase:", error);
      throw error;
    }
  } else {
    // Fallback to localStorage
    const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
    const prefectId = 'P' + Date.now();
    const newPrefect = { id: prefectId, ...prefectData };
    prefects.push(newPrefect);
    localStorage.setItem('prefects', JSON.stringify(prefects));
    return prefectId;
  }
}

async function getPrefects() {
  if (isFirebaseReady) {
    try {
      const prefects = await window.firebaseApp.getAllPrefects();
      console.log("Prefects from Firebase:", prefects);
      return prefects;
    } catch (error) {
      console.error("Error getting prefects from Firebase:", error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('prefects') || '[]');
    }
  } else {
    return JSON.parse(localStorage.getItem('prefects') || '[]');
  }
}

async function deletePrefect(prefectId) {
  if (isFirebaseReady) {
    try {
      await window.firebaseApp.deletePrefect(prefectId);
      console.log("Prefect deleted from Firebase");
    } catch (error) {
      console.error("Error deleting prefect from Firebase:", error);
      throw error;
    }
  }
  
  // Always update localStorage for consistency
  const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
  const updatedPrefects = prefects.filter(p => p.id !== prefectId);
  localStorage.setItem('prefects', JSON.stringify(updatedPrefects));
}

// Attendance management
async function markAttendance(prefectId) {
  const timestamp = new Date().toISOString();
  const date = new Date().toISOString().split('T')[0];
  
  if (isFirebaseReady) {
    try {
      await window.firebaseApp.markAttendance(prefectId, date, timestamp);
      return true;
    } catch (error) {
      console.error("Error marking attendance in Firebase:", error);
      // Continue with localStorage fallback
    }
  }
  
  // Fallback to localStorage
  const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
  if (!attendance[date]) {
    attendance[date] = [];
  }
  
  // Check if already marked
  const alreadyMarked = attendance[date].some(record => record.prefectId === prefectId);
  if (alreadyMarked) {
    return false;
  }
  
  attendance[date].push({ prefectId, timestamp });
  localStorage.setItem('attendance', JSON.stringify(attendance));
  
  // Update prefect's attendance count
  const prefects = await getPrefects();
  const updatedPrefects = prefects.map(p => {
    if (p.id === prefectId) {
      return { ...p, totalAttendance: (p.totalAttendance || 0) + 1 };
    }
    return p;
  });
  localStorage.setItem('prefects', JSON.stringify(updatedPrefects));
  
  return true;
}

async function getAttendanceByDate(date) {
  if (isFirebaseReady) {
    try {
      return await window.firebaseApp.getAttendanceByDate(date);
    } catch (error) {
      console.error("Error getting attendance from Firebase:", error);
    }
  }
  
  // Fallback to localStorage
  const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
  return attendance[date] || [];
}

// QR Code function
function generateQRCode(text, elementId) {
  const container = document.getElementById(elementId);
  if (container && text) {
    container.innerHTML = '';
    try {
      new QRCode(container, {
        text: text,
        width: 200,
        height: 200,
        colorDark: "#1a4f8e",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (error) {
      console.error("QR Code error:", error);
      container.innerHTML = `<div style="padding: 20px; background: #f0f0f0; border-radius: 5px;">
        <p>Prefect ID: ${text}</p>
        <p><small>QR Code generation failed. Use the ID above.</small></p>
      </div>`;
    }
  }
}

// Utility functions
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

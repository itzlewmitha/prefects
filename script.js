// Password for authentication (fallback)
const SYSTEM_PASSWORD = "100580";
let firebaseAvailable = false;

// Check if Firebase is available
function checkFirebaseAvailability() {
  return !!(window.firebaseFunctions && typeof window.firebaseFunctions.loginUser === 'function');
}

// Check if user is logged in
async function checkAuth() {
  try {
    if (checkFirebaseAvailability()) {
      firebaseAvailable = true;
      const isAuthenticated = await window.firebaseFunctions.checkAuth();
      return isAuthenticated;
    } else {
      // Fallback to localStorage
      firebaseAvailable = false;
      return localStorage.getItem('prefectAuth') === 'true';
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    firebaseAvailable = false;
    return localStorage.getItem('prefectAuth') === 'true';
  }
}

// Redirect to login if not authenticated
async function requireAuth() {
  // Don't require auth for login page
  if (window.location.pathname.endsWith('index.html')) {
    return true;
  }
  
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Login functionality
document.addEventListener('DOMContentLoaded', async function() {
  // Check Firebase availability
  firebaseAvailable = checkFirebaseAvailability();
  
  if (!firebaseAvailable && document.getElementById('firebaseError')) {
    document.getElementById('firebaseError').style.display = 'block';
  }
  
  // Handle login form submission
  const loginForm = document.getElementById('loginForm');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('loginError');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      // Show loading, hide error
      if (loadingElement) loadingElement.style.display = 'block';
      if (errorElement) errorElement.style.display = 'none';
      
      try {
        if (firebaseAvailable) {
          // Use Firebase authentication
          await window.firebaseFunctions.loginUser(email, password);
          window.location.href = 'dashboard.html';
        } else {
          // Fallback to simple password check
          if (password === SYSTEM_PASSWORD) {
            localStorage.setItem('prefectAuth', 'true');
            window.location.href = 'dashboard.html';
          } else {
            if (errorElement) {
              errorElement.textContent = 'Incorrect password. Please try again.';
              errorElement.style.display = 'block';
            }
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        
        if (errorElement) {
          errorElement.textContent = 'Login failed. Please check your credentials.';
          errorElement.style.display = 'block';
        }
      } finally {
        if (loadingElement) loadingElement.style.display = 'none';
      }
    });
  }
  
  // Check authentication on other pages (except login page)
  if (!window.location.pathname.endsWith('index.html')) {
    const isAuthenticated = await requireAuth();
    
    // Only load page content if authenticated
    if (isAuthenticated) {
      // Update UI with current user
      if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.getCurrentUser) {
        const user = window.firebaseFunctions.getCurrentUser();
        if (user) {
          const userElement = document.getElementById('currentUser');
          if (userElement) {
            userElement.textContent = user.email;
          }
        }
      }
      
      // Load prefects data
      if (typeof loadPrefects === 'function') {
        loadPrefects();
      }
      
      // Load attendance data
      if (typeof loadAttendance === 'function') {
        loadAttendance();
      }
      
      // Set default date to today
      const dateInput = document.getElementById('dateSelector');
      if (dateInput) {
        dateInput.value = formatDate();
      }
    }
  }
});

// Format date for display and input
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Format date for display in a more readable format
function formatDateDisplay(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Logout function
async function logout() {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.logoutUser) {
      await window.firebaseFunctions.logoutUser();
    }
    localStorage.removeItem('prefectAuth');
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Error during logout:", error);
    localStorage.removeItem('prefectAuth');
    window.location.href = 'index.html';
  }
}

// Prefects data management - FIXED VERSION
async function getPrefects() {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.getAllPrefects) {
      console.log("Getting prefects from Firebase");
      const prefects = await window.firebaseFunctions.getAllPrefects();
      console.log("Firebase prefects retrieved:", prefects);
      
      // Also sync to localStorage for fallback
      localStorage.setItem('prefects', JSON.stringify(prefects));
      
      return prefects;
    } else {
      // Fallback to localStorage if Firebase is not available
      console.log("Getting prefects from localStorage");
      const prefects = localStorage.getItem('prefects');
      const parsedPrefects = prefects ? JSON.parse(prefects) : [];
      console.log("LocalStorage prefects:", parsedPrefects);
      return parsedPrefects;
    }
  } catch (error) {
    console.error("Error getting prefects:", error);
    // Fallback to localStorage
    const prefects = localStorage.getItem('prefects');
    return prefects ? JSON.parse(prefects) : [];
  }
}

// Get attendance for a specific date
async function getAttendanceByDate(date) {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.getAttendanceByDate) {
      const attendance = await window.firebaseFunctions.getAttendanceByDate(date);
      // Also sync to localStorage for fallback
      const currentAttendance = JSON.parse(localStorage.getItem('attendance') || '{}');
      currentAttendance[date] = attendance;
      localStorage.setItem('attendance', JSON.stringify(currentAttendance));
      return attendance;
    } else {
      // Fallback to localStorage if Firebase is not available
      const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
      return attendanceData[date] || [];
    }
  } catch (error) {
    console.error("Error getting attendance by date:", error);
    // Fallback to localStorage
    const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
    return attendanceData[date] || [];
  }
}

// Update attendance display based on selected date
function updateAttendanceDisplay() {
  if (typeof loadAttendance === 'function') {
    loadAttendance();
  }
}

// Generate QR code
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
      console.error("Error generating QR code:", error);
      container.innerHTML = `<p style="color: red;">Error generating QR code. ID: ${text}</p>`;
    }
  }
}

// Mark attendance - FIXED VERSION
async function markAttendanceWithFirestore(prefectId) {
  try {
    console.log("Marking attendance for prefect ID:", prefectId);
    
    // First, get current prefects to verify the prefect exists
    const prefects = await getPrefects();
    const prefect = prefects.find(p => p.id === prefectId);
    
    if (!prefect) {
      console.error("Prefect not found with ID:", prefectId);
      return false;
    }
    
    console.log("Found prefect:", prefect.name);
    
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.markAttendance) {
      const timestamp = new Date().toISOString();
      const date = formatDate();
      await window.firebaseFunctions.markAttendance(prefectId, date, timestamp);
      
      // Also update localStorage for consistency
      const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
      if (!attendanceData[date]) {
        attendanceData[date] = [];
      }
      attendanceData[date].push({
        prefectId: prefectId,
        timestamp: timestamp
      });
      localStorage.setItem('attendance', JSON.stringify(attendanceData));
      
      return true;
    } else {
      // Fallback to localStorage if Firebase is not available
      const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
      const today = formatDate();
      
      if (!attendanceData[today]) {
        attendanceData[today] = [];
      }
      
      // Check if already marked attendance today
      const alreadyMarked = attendanceData[today].some(record => 
        record.prefectId === prefectId
      );
      
      if (alreadyMarked) {
        return false;
      }
      
      // Add attendance record
      attendanceData[today].push({
        prefectId: prefectId,
        timestamp: new Date().toISOString()
      });
      
      // Update prefect's total attendance in both Firebase and localStorage
      const updatedPrefects = prefects.map(p => {
        if (p.id === prefectId) {
          return { ...p, totalAttendance: (p.totalAttendance || 0) + 1 };
        }
        return p;
      });
      
      // Update localStorage
      localStorage.setItem('prefects', JSON.stringify(updatedPrefects));
      
      // If Firebase is available, update there too
      if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.updatePrefect) {
        try {
          await window.firebaseFunctions.updatePrefect(prefectId, { 
            totalAttendance: (prefect.totalAttendance || 0) + 1 
          });
        } catch (error) {
          console.error("Error updating Firebase:", error);
        }
      }
      
      localStorage.setItem('attendance', JSON.stringify(attendanceData));
      return true;
    }
  } catch (error) {
    console.error("Error marking attendance:", error);
    return false;
  }
}

// Add a new prefect - FIXED VERSION
async function addPrefectWithFirestore(prefect) {
  try {
    let prefectId = prefect.id;
    
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.addPrefect) {
      // Remove the id before sending to Firebase (Firebase will generate its own)
      const { id, ...prefectWithoutId } = prefect;
      const firebaseId = await window.firebaseFunctions.addPrefect(prefectWithoutId);
      prefectId = firebaseId; // Use Firebase-generated ID
      console.log("Prefect added to Firebase with ID:", prefectId);
    }
    
    // Always update localStorage for consistency
    const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
    const newPrefect = { ...prefect, id: prefectId };
    prefects.push(newPrefect);
    localStorage.setItem('prefects', JSON.stringify(prefects));
    console.log("Prefect added to localStorage with ID:", prefectId);
    
    return prefectId;
  } catch (error) {
    console.error("Error adding prefect:", error);
    throw error;
  }
}

// Delete a prefect - FIXED VERSION
async function deletePrefectWithFirestore(prefectId) {
  try {
    console.log("Deleting prefect with ID:", prefectId);
    
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.deletePrefect) {
      await window.firebaseFunctions.deletePrefect(prefectId);
      console.log("Prefect deleted from Firebase");
    }
    
    // Always update localStorage for consistency
    const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
    const prefectIndex = prefects.findIndex(p => p.id === prefectId);
    
    if (prefectIndex !== -1) {
      prefects.splice(prefectIndex, 1);
      localStorage.setItem('prefects', JSON.stringify(prefects));
      console.log("Prefect deleted from localStorage");
      
      // Clean up attendance records
      const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
      for (const date in attendanceData) {
        attendanceData[date] = attendanceData[date].filter(
          record => record.prefectId !== prefectId
        );
      }
      localStorage.setItem('attendance', JSON.stringify(attendanceData));
      console.log("Attendance records cleaned up");
    }
  } catch (error) {
    console.error("Error deleting prefect:", error);
    throw error;
  }
}

// Debug function to check storage
function debugStorage() {
  console.log("=== Storage Debug ===");
  console.log("LocalStorage prefects:", localStorage.getItem('prefects'));
  console.log("LocalStorage attendance:", localStorage.getItem('attendance'));
  
  if (firebaseAvailable && window.firebaseFunctions.getAllPrefects) {
    window.firebaseFunctions.getAllPrefects().then(prefects => {
      console.log("Firebase prefects:", prefects);
    }).catch(error => {
      console.error("Error getting Firebase prefects:", error);
    });
  }
}

// Function to sync data from localStorage to Firebase
async function syncToFirebase() {
  if (!firebaseAvailable) {
    alert("Firebase is not available. Cannot sync data.");
    return;
  }
  
  try {
    // Get data from localStorage
    const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    
    // Sync prefects
    for (const prefect of prefects) {
      try {
        // Check if prefect already exists in Firebase
        const existingPrefects = await window.firebaseFunctions.getAllPrefects();
        const exists = existingPrefects.some(p => p.id === prefect.id);
        
        if (!exists) {
          await window.firebaseFunctions.addPrefect(prefect);
          console.log("Synced prefect:", prefect.name);
        }
      } catch (error) {
        console.error("Error syncing prefect:", error);
      }
    }
    
    // Sync attendance
    for (const date in attendance) {
      for (const record of attendance[date]) {
        try {
          await window.firebaseFunctions.markAttendance(record.prefectId, date, record.timestamp);
          console.log("Synced attendance for:", record.prefectId, "on", date);
        } catch (error) {
          console.error("Error syncing attendance:", error);
        }
      }
    }
    
    alert("Data sync completed!");
  } catch (error) {
    console.error("Error syncing data:", error);
    alert("Error syncing data. Please check console for details.");
  }
}

// Password for authentication (fallback)
const SYSTEM_PASSWORD = "10058";

// Check if user is logged in
async function checkAuth() {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.checkAuth) {
      return await window.firebaseFunctions.checkAuth();
    } else {
      // Fallback to localStorage
      return localStorage.getItem('prefectAuth') === 'true';
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    return localStorage.getItem('prefectAuth') === 'true';
  }
}

// Redirect to login if not authenticated
async function requireAuth() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated && !window.location.pathname.endsWith('index.html')) {
    window.location.href = 'index.html';
  }
}

// Login functionality
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize admin user
  if (window.firebaseFunctions && window.firebaseFunctions.initializeAdmin) {
    await window.firebaseFunctions.initializeAdmin();
  }
  
  // Handle login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('loginError');
      
      try {
        if (window.firebaseFunctions && window.firebaseFunctions.loginUser) {
          // Use Firebase authentication
          await window.firebaseFunctions.loginUser(email, password);
          window.location.href = 'dashboard.html';
        } else {
          // Fallback to simple password check
          if (password === SYSTEM_PASSWORD) {
            localStorage.setItem('prefectAuth', 'true');
            window.location.href = 'dashboard.html';
          } else {
            errorDiv.textContent = 'Incorrect password. Please try again.';
            errorDiv.style.display = 'block';
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        errorDiv.textContent = 'Login failed. Please check your credentials.';
        errorDiv.style.display = 'block';
      }
    });
  }
  
  // Check authentication on other pages
  if (!window.location.pathname.endsWith('index.html')) {
    await requireAuth();
    
    // Update UI with current user
    if (window.firebaseFunctions && window.firebaseFunctions.getCurrentUser) {
      const user = window.firebaseFunctions.getCurrentUser();
      if (user) {
        const userElement = document.getElementById('currentUser');
        if (userElement) {
          userElement.textContent = user.email;
        }
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
});

// Prefects data management - using Firestore
async function getPrefects() {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.getPrefectsOnce) {
      return await window.firebaseFunctions.getPrefectsOnce();
    } else {
      // Fallback to localStorage if Firebase is not available
      console.warn("Firebase not available, using localStorage fallback");
      const prefects = localStorage.getItem('prefects');
      return prefects ? JSON.parse(prefects) : [];
    }
  } catch (error) {
    console.error("Error getting prefects:", error);
    // Fallback to localStorage
    const prefects = localStorage.getItem('prefects');
    return prefects ? JSON.parse(prefects) : [];
  }
}

// Real-time prefects listener
function listenForPrefectsChanges(callback) {
  if (window.firebaseFunctions && window.firebaseFunctions.getAllPrefects) {
    return window.firebaseFunctions.getAllPrefects(callback);
  } else {
    console.warn("Firebase not available, cannot use real-time updates");
    // Fallback: call callback once with current data
    getPrefects().then(callback);
    return () => {}; // Return empty unsubscribe function
  }
}

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
    if (window.firebaseFunctions && window.firebaseFunctions.logoutUser) {
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

// Get attendance for a specific date
async function getAttendanceByDate(date) {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.getAttendanceByDate) {
      return await window.firebaseFunctions.getAttendanceByDate(date);
    } else {
      // Fallback to localStorage if Firebase is not available
      console.warn("Firebase not available, using localStorage fallback");
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

// Mark attendance using Firestore
async function markAttendanceWithFirestore(prefectId) {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.markAttendance) {
      const timestamp = new Date().toISOString();
      const date = formatDate();
      await window.firebaseFunctions.markAttendance(prefectId, date, timestamp);
      return true;
    } else {
      // Fallback to localStorage if Firebase is not available
      console.warn("Firebase not available, using localStorage fallback");
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
      
      // Update prefect's total attendance
      const prefects = await getPrefects();
      const prefectIndex = prefects.findIndex(p => p.id === prefectId);
      if (prefectIndex !== -1) {
        prefects[prefectIndex].totalAttendance = (prefects[prefectIndex].totalAttendance || 0) + 1;
        localStorage.setItem('prefects', JSON.stringify(prefects));
      }
      
      localStorage.setItem('attendance', JSON.stringify(attendanceData));
      return true;
    }
  } catch (error) {
    console.error("Error marking attendance:", error);
    return false;
  }
}

// Add a new prefect using Firestore
async function addPrefectWithFirestore(prefect) {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.addPrefect) {
      const id = await window.firebaseFunctions.addPrefect(prefect);
      return id;
    } else {
      // Fallback to localStorage if Firebase is not available
      console.warn("Firebase not available, using localStorage fallback");
      const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
      const prefectId = 'P' + Date.now();
      prefects.push({ id: prefectId, ...prefect });
      localStorage.setItem('prefects', JSON.stringify(prefects));
      return prefectId;
    }
  } catch (error) {
    console.error("Error adding prefect:", error);
    throw error;
  }
}

// Delete a prefect using Firestore
async function deletePrefectWithFirestore(prefectId) {
  try {
    if (window.firebaseFunctions && window.firebaseFunctions.deletePrefect) {
      await window.firebaseFunctions.deletePrefect(prefectId);
    } else {
      // Fallback to localStorage if Firebase is not available
      console.warn("Firebase not available, using localStorage fallback");
      const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
      const prefectIndex = prefects.findIndex(p => p.id === prefectId);
      
      if (prefectIndex !== -1) {
        prefects.splice(prefectIndex, 1);
        localStorage.setItem('prefects', JSON.stringify(prefects));
        
        // Clean up attendance records
        const attendanceData = JSON.parse(localStorage.getItem('attendance') || '{}');
        for (const date in attendanceData) {
          attendanceData[date] = attendanceData[date].filter(
            record => record.prefectId !== prefectId
          );
        }
        localStorage.setItem('attendance', JSON.stringify(attendanceData));
      }
    }
  } catch (error) {
    console.error("Error deleting prefect:", error);
    throw error;
  }
}

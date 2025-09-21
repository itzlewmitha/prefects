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
      return await window.firebaseFunctions.checkAuth();
    } else {
      // Fallback to localStorage
      firebaseAvailable = false;
      if (document.getElementById('firebaseError')) {
        document.getElementById('firebaseError').style.display = 'block';
      }
      return localStorage.getItem('prefectAuth') === 'true';
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    firebaseAvailable = false;
    if (document.getElementById('firebaseError')) {
      document.getElementById('firebaseError').style.display = 'block';
    }
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
  
  // Check authentication on other pages
  if (!window.location.pathname.endsWith('index.html')) {
    await requireAuth();
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

// Prefects data management
async function getPrefects() {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.getAllPrefects) {
      return await window.firebaseFunctions.getAllPrefects();
    } else {
      // Fallback to localStorage if Firebase is not available
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

// Get attendance for a specific date
async function getAttendanceByDate(date) {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.getAttendanceByDate) {
      return await window.firebaseFunctions.getAttendanceByDate(date);
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

// Mark attendance
async function markAttendanceWithFirestore(prefectId) {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.markAttendance) {
      const timestamp = new Date().toISOString();
      const date = formatDate();
      await window.firebaseFunctions.markAttendance(prefectId, date, timestamp);
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

// Add a new prefect
async function addPrefectWithFirestore(prefect) {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.addPrefect) {
      const id = await window.firebaseFunctions.addPrefect(prefect);
      return id;
    } else {
      // Fallback to localStorage if Firebase is not available
      const prefects = JSON.parse(localStorage.getItem('prefects') || '[]');
      const prefectId = prefect.id || 'P' + Date.now();
      prefects.push({ ...prefect, id: prefectId });
      localStorage.setItem('prefects', JSON.stringify(prefects));
      return prefectId;
    }
  } catch (error) {
    console.error("Error adding prefect:", error);
    throw error;
  }
}

// Delete a prefect
async function deletePrefectWithFirestore(prefectId) {
  try {
    if (firebaseAvailable && window.firebaseFunctions && window.firebaseFunctions.deletePrefect) {
      await window.firebaseFunctions.deletePrefect(prefectId);
    } else {
      // Fallback to localStorage if Firebase is not available
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

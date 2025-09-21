// Password for authentication
const SYSTEM_PASSWORD = "10058";

// Check if user is logged in
function checkAuth() {
    return localStorage.getItem('prefectAuth') === 'true';
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!checkAuth() && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
}

// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            
            if (password === SYSTEM_PASSWORD) {
                localStorage.setItem('prefectAuth', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('Incorrect password. Please try again.');
            }
        });
    }
    
    // Check authentication on other pages
    if (!window.location.pathname.endsWith('index.html')) {
        requireAuth();
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

// Prefects data management - now using Firestore
async function getPrefects() {
    try {
        if (window.firebaseFunctions && window.firebaseFunctions.getAllPrefects) {
            return await window.firebaseFunctions.getAllPrefects();
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

async function savePrefects(prefects) {
    try {
        // For Firestore, we need to handle saving differently
        // This function is kept for compatibility but may not be used directly
        console.log("Prefects saving handled by individual Firestore functions");
    } catch (error) {
        console.error("Error saving prefects:", error);
        // Fallback to localStorage
        localStorage.setItem('prefects', JSON.stringify(prefects));
    }
}

// Attendance data management - now using Firestore
async function getAttendance() {
    try {
        // For Firestore, we need to get attendance by date
        // This function is kept for compatibility but works differently
        console.log("Attendance retrieval handled by getAttendanceByDate function");
        return {};
    } catch (error) {
        console.error("Error getting attendance:", error);
        // Fallback to localStorage
        const attendance = localStorage.getItem('attendance');
        return attendance ? JSON.parse(attendance) : {};
    }
}

async function saveAttendance(attendance) {
    try {
        // For Firestore, we need to handle saving differently
        // This function is kept for compatibility but may not be used directly
        console.log("Attendance saving handled by individual Firestore functions");
    } catch (error) {
        console.error("Error saving attendance:", error);
        // Fallback to localStorage
        localStorage.setItem('attendance', JSON.stringify(attendance));
    }
}

// Generate QR code
function generateQRCode(text, elementId) {
    const container = document.getElementById(elementId);
    if (container && text) {
        container.innerHTML = '';
        new QRCode(container, {
            text: text,
            width: 200,
            height: 200,
            colorDark: "#1a4f8e",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
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
function logout() {
    localStorage.removeItem('prefectAuth');
    window.location.href = 'index.html';
}

// Get attendance for a specific date
async function getAttendanceByDate(date) {
    try {
        if (window.firebaseFunctions && window.firebaseFunctions.getAttendanceByDate) {
            return await window.firebaseFunctions.getAttendanceByDate(date);
        } else {
            // Fallback to localStorage if Firebase is not available
            console.warn("Firebase not available, using localStorage fallback");
            const attendanceData = getAttendance();
            return attendanceData[date] || [];
        }
    } catch (error) {
        console.error("Error getting attendance by date:", error);
        // Fallback to localStorage
        const attendanceData = getAttendance();
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
            const attendanceData = getAttendance();
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
                savePrefects(prefects);
            }
            
            saveAttendance(attendanceData);
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
            const prefects = getPrefects();
            const prefectId = 'P' + Date.now();
            prefects.push({ id: prefectId, ...prefect });
            savePrefects(prefects);
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
            
            // Also delete attendance records for this prefect
            // This would require additional Firestore functionality
            console.log("Prefect deleted. Note: Attendance records may still exist.");
        } else {
            // Fallback to localStorage if Firebase is not available
            console.warn("Firebase not available, using localStorage fallback");
            const prefects = getPrefects();
            const prefectIndex = prefects.findIndex(p => p.id === prefectId);
            
            if (prefectIndex !== -1) {
                prefects.splice(prefectIndex, 1);
                savePrefects(prefects);
                
                // Clean up attendance records
                const attendanceData = getAttendance();
                for (const date in attendanceData) {
                    attendanceData[date] = attendanceData[date].filter(
                        record => record.prefectId !== prefectId
                    );
                }
                saveAttendance(attendanceData);
            }
        }
    } catch (error) {
        console.error("Error deleting prefect:", error);
        throw error;
    }
}
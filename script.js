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

// Prefects data management
function getPrefects() {
    const prefects = localStorage.getItem('prefects');
    return prefects ? JSON.parse(prefects) : [];
}

function savePrefects(prefects) {
    localStorage.setItem('prefects', JSON.stringify(prefects));
}

// Attendance data management
function getAttendance() {
    const attendance = localStorage.getItem('attendance');
    return attendance ? JSON.parse(attendance) : {};
}

function saveAttendance(attendance) {
    localStorage.setItem('attendance', JSON.stringify(attendance));
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
function getAttendanceByDate(date) {
    const attendanceData = getAttendance();
    return attendanceData[date] || [];
}

// Update attendance display based on selected date
function updateAttendanceDisplay() {
    if (typeof loadAttendance === 'function') {
        loadAttendance();
    }
}
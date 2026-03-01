
document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.querySelector('.sidebar');
    
    if (sidebarContainer) {
 
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';

        const sidebarHTML = `
            <h2>UNISCAN</h2>
            <ul>
                <li class="${currentPage === 'index.html' ? 'active' : ''}" onclick="location.href='index.html'"> Dashboard</li>
                <li class="${currentPage === 'livedetection.html' ? 'active' : ''}" onclick="location.href='livedetection.html'"> Live Detection</li>
                <li class="${currentPage === 'capture.html' ? 'active' : ''}" onclick="location.href='capture.html'"> Face Capture</li>
                <li class="${currentPage === 'attendance.html' ? 'active' : ''}" onclick="location.href='attendance.html'"> Attendance History</li>
                <li class="${currentPage === 'students.html' ? 'active' : ''}" onclick="location.href='students.html'"> Students</li>
                <li class="${currentPage === 'records.html' ? 'active' : ''}" onclick="location.href='records.html'"> Student Records</li>
                <li class="${currentPage === 'violations.html' ? 'active' : ''}" onclick="location.href='violations.html'"> Violations</li>
                <li class="${currentPage === 'uniforms.html' ? 'active' : ''}" onclick="location.href='uniforms.html'"> Upload Uniforms</li>
                <li class="${currentPage === 'uploaduniform.html' ? 'active' : ''}" onclick="location.href='uploaduniform.html'"> Saved Uniforms</li>
                  <li class="${currentPage === 'guidance.html' ? 'active' : ''}" onclick="location.href='guidance.html'"> Guidance</li>

                <li class="section-title"> Admin </li>
                <li class="logout" onclick="logout()"> Log Out</li>
            </ul>
        `;
        
        sidebarContainer.innerHTML = sidebarHTML;
    }
});

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        location.href = "login.html";
    }
}
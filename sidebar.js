import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

export function renderSidebar(userRole) {

  const sidebarContainer = document.getElementById("sidebar-container") || document.querySelector(".sidebar");
  if (!sidebarContainer) return;

  const currentPage = window.location.pathname.split("/").pop();

  let menuItemsHTML = "";

  if (userRole === "guidance") {
    menuItemsHTML = `
    <li class="${currentPage === 'guidance.html' ? 'active' : ''}" onclick="location.href='guidance.html'"> Guidance</li>
      <li class="${currentPage === 'violations.html' ? 'active' : ''}" onclick="location.href='violations.html'"> Violations</li>
      
    `;
  } else if (userRole === "admin") {
    menuItemsHTML = `
      <li class="${currentPage === 'index.html' || currentPage === '' ? 'active' : ''}" onclick="location.href='index.html'"> Dashboard</li>
      <li class="${currentPage === 'livedetection.html' ? 'active' : ''}" onclick="location.href='livedetection.html'"> Live Detection</li>
      <li class="${currentPage === 'capture.html' ? 'active' : ''}" onclick="location.href='capture.html'"> Face Capture</li>
       <li class="${currentPage === 'records.html'? 'active' : ''}" onclick="location.href='records.html'"> Student Records</li>
      <li class="${currentPage === 'attendance.html' ? 'active' : ''}" onclick="location.href='attendance.html'"> Attendance History</li>
      <li class="${currentPage === 'students.html' ? 'active' : ''}" onclick="location.href='students.html'"> Students</li>
      <li class="${currentPage === 'washday.html' ? 'active' : ''}" onclick="location.href='washday.html'"> Washday Settings</li>
     
      
  
    `;
  }

  sidebarContainer.innerHTML = `
    <h2>UNISCAN</h2>
    <ul>
      ${menuItemsHTML}
      <li class="logout" onclick="logout()"> Log Out</li>
    </ul>
  `;
}
window.renderSidebar = renderSidebar;
window.logout = async function () {
  try {
    const auth = getAuth();
    await signOut(auth);
    localStorage.clear();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error signing out:", error);
    window.location.href = "login.html";
  }
};
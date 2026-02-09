import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7R5XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef",
  storageBucket: "thesissystem-921ef.appspot.com",
  messagingSenderId: "62118219774",
  appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allRecords = [];

const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
  allRecords = snapshot.docs.map(doc => doc.data());
  applyFilters(); 
});

function applyFilters() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const selectedCourse = document.getElementById("courseFilter").value;
  const selectedYear = document.getElementById("yearFilter").value;
  const selectedDate = document.getElementById("dateFilter").value;

  let filterDateStr = null;
  if (selectedDate) {
    const d = new Date(selectedDate);
    filterDateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  const uniqueMap = new Map();

  allRecords.forEach(record => {
    const key = `${record.studentId}-${record.dateString}`;
    
    const matchesSearch = record.studentName.toLowerCase().includes(searchTerm) || 
                          record.studentId.includes(searchTerm);
    const matchesCourse = selectedCourse ? (record.programLevel || "").includes(selectedCourse) : true;
    const matchesYear = selectedYear ? (record.programLevel || "").includes(selectedYear) : true;
    const matchesDate = filterDateStr ? record.dateString === filterDateStr : true;

    if (matchesSearch && matchesCourse && matchesYear && matchesDate) {
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, record);
      }
    }
  });

  const finalData = Array.from(uniqueMap.values());
  updateStats(filterDateStr, finalData);
  renderTable(finalData);
}

function updateStats(filterDateStr, filteredData) {
  const todayLabel = document.getElementById("statLabel");
  const todayCountElem = document.getElementById("todayCount");
  const filterMatchElem = document.getElementById("filterMatchCount");

  if (filterDateStr) {
    todayLabel.innerHTML = `Presents on ${filterDateStr}`;
  } else {
    todayLabel.innerHTML = `Today's Present`;
  }

  const count = filteredData.length;
  if (todayCountElem) todayCountElem.textContent = count;
  if (filterMatchElem) filterMatchElem.textContent = count;
}

function renderTable(dataArray) {
  const list = document.getElementById("attendance-list");
  list.innerHTML = "";

  if (dataArray.length === 0) {
    list.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 60px; opacity: 0.5;">
          <i class="fas fa-calendar-times" style="font-size: 40px; margin-bottom: 15px; display: block;"></i>
          <p style="font-size: 16px;">No attendance records found for this selection.</p>
        </td>
      </tr>`;
    return;
  }

  dataArray.forEach(data => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div style="font-weight:bold">${data.dateString}</div>
        <div style="font-size:11px; opacity:0.6">${data.timeString}</div>
      </td>
      <td>
        <div style="font-weight:bold">${data.studentName}</div>
        <div style="font-size:12px; opacity:0.5">${data.studentId}</div>
      </td>
      <td>${data.programLevel || "N/A"}</td>
      <td><span class="badge-present">PRESENT</span></td>
    `;
    list.appendChild(row);
  });
}

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("courseFilter").addEventListener("change", applyFilters);
document.getElementById("yearFilter").addEventListener("change", applyFilters);
document.getElementById("dateFilter").addEventListener("change", applyFilters);


document.getElementById("exportBtn").addEventListener("click", () => {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const selectedCourse = document.getElementById("courseFilter").value;
    const selectedYear = document.getElementById("yearFilter").value;
    const selectedDate = document.getElementById("dateFilter").value; 

    let filterDateStr = null;
    let fileNameDate = "All_Dates"; 

    if (selectedDate) {
        const d = new Date(selectedDate);
        filterDateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        fileNameDate = selectedDate; 
    }

    const uniqueMap = new Map();
    allRecords.forEach(record => {
        const key = `${record.studentId}-${record.dateString}`;
        const matchesSearch = record.studentName.toLowerCase().includes(searchTerm) || record.studentId.includes(searchTerm);
        const matchesCourse = selectedCourse ? (record.programLevel || "").includes(selectedCourse) : true;
        const matchesYear = selectedYear ? (record.programLevel || "").includes(selectedYear) : true;
        const matchesDate = filterDateStr ? record.dateString === filterDateStr : true;

        if (matchesSearch && matchesCourse && matchesYear && matchesDate) {
            if (!uniqueMap.has(key)) uniqueMap.set(key, record);
        }
    });

    const exportData = Array.from(uniqueMap.values());

    if (exportData.length === 0) {
        alert("No data available to export based on your current filters.");
        return;
    }

    let csv = "Date,Time,Student ID,Name,Program/Year,Status\n";
    exportData.forEach(r => {
        csv += `${r.dateString},${r.timeString},${r.studentId},"${r.studentName}","${r.programLevel}",Present\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Report_${fileNameDate}.csv`; 
    link.click();
    URL.revokeObjectURL(url); 
});
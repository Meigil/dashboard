import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBmVP7XnvqobdxiRv-LpHswhCCVRggX4",
    authDomain: "thesissystem-921ef.firebaseapp.com",
    projectId: "thesissystem-921ef",
    storageBucket: "thesissystem-921ef.appspot.com",
    messagingSenderId: "62118219774",
    appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allAttendance = [];

const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    allAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateUI();
});

function updateUI() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const selectedCourse = document.getElementById("courseFilter").value;
    const selectedYear = document.getElementById("yearFilter").value;
    const selectedDate = document.getElementById("dateFilter").value;

    let filterDateStr = null;
    if (selectedDate) {
        const d = new Date(selectedDate);

        filterDateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }

    const filteredData = allAttendance.filter(record => {
        const matchesSearch = record.studentName?.toLowerCase().includes(searchTerm) || 
                             record.studentId?.toLowerCase().includes(searchTerm);
        
        const progLevel = record.programLevel || "";
        const matchesCourse = selectedCourse ? progLevel.includes(selectedCourse) : true;
        const matchesYear = selectedYear ? progLevel.includes(selectedYear) : true;
        const matchesDate = filterDateStr ? record.dateString === filterDateStr : true;
 const hasViolation = record.violationType && record.violationType !== "None";
        return matchesSearch && matchesCourse && matchesYear && matchesDate;
    });

renderTable(filteredData);
updateStats(filteredData);
}


function renderTable(data) {
    const tbody = document.getElementById("recordsBody");
    tbody.innerHTML = "";

    data.forEach(record => {

            if (!record.violationType || record.violationType.toLowerCase() === "none") {
        return;
    }
const statusClass =
    record.status === "Complete Uniform"
        ? "ok"
        : "violation";

        const photoHtml = record.capturedImage 
            ? `<img src="${record.capturedImage}" class="img-proof" onclick="window.openModal('${record.capturedImage}', '${record.studentName}')" style="cursor:pointer;">`
            : `<i class="fas fa-image" style="opacity:0.2; font-size:20px; margin-left:12px;"></i>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${photoHtml}</td>
            <td>
                <div style="font-weight:bold">${record.dateString}</div>
                <div style="font-size:11px; opacity:0.6">${record.timeString}</div>
            </td>
            <td>${record.studentId || "---"}</td>
            <td>${record.studentName || "---"}</td>
            <td>${record.programLevel || "---"}</td>
            <td class="${statusClass}">${record.status}</td>
            <td>${record.violationType || "None"}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(filteredData) {
    document.getElementById("filterMatchCount").textContent = filteredData.length;

    const today = new Date();
    const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const todayLogs = allAttendance.filter(r => r.dateString === todayStr).length;
    document.getElementById("todayCount").textContent = todayLogs;

const completeCount = filteredData.filter(
    r => r.status === "Complete Uniform"
).length;
    document.getElementById("completeCount").textContent = completeCount;

    const violationCount = filteredData.filter(r => r.status !== "Complete").length;
    document.getElementById("violationCount").textContent = violationCount;
}

const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const modalCaption = document.getElementById("modalCaption");

window.openModal = function(src, name) {
    imageModal.style.display = "flex"; 
    modalImg.src = src;
    modalCaption.innerHTML = `Proof for: <strong>${name}</strong>`;
};

imageModal.onclick = function(event) {

    if (event.target === imageModal || event.target.tagName === 'DIV' || event.target.id === 'modalCaption') {
        imageModal.style.display = "none";
        modalImg.src = ""; 
    }
};

modalImg.onclick = function(event) {
    event.stopPropagation();
};

["searchInput", "courseFilter", "yearFilter", "dateFilter"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateUI);
});

document.getElementById("exportBtn").onclick = () => {
    if (allAttendance.length === 0) return alert("Walang data na ma-eexport.");

    let csv = "Date,Time,Student ID,Name,Program/Year,Status,Violation\n";
    allAttendance.forEach(r => {
        csv += `${r.dateString},${r.timeString},${r.studentId},"${r.studentName}","${r.programLevel}",${r.status},"${r.violationType}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UNISCAN_Attendance_${new Date().toLocaleDateString()}.csv`;
    a.click();
};
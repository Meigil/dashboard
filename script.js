import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBmVP7XnvqobdxiRv-LpHswhCCVRggX4",
    authDomain: "thesissystem-921ef.firebaseapp.com",
    projectId: "thesissystem-921ef",
    storageBucket: "thesissystem-921ef.firebasestorage.app",
    messagingSenderId: "62118219774",
    appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let attendanceChartInstance;
let complianceChartInstance; 
let violationChartInstance;

function getWeekDates() {
    const curr = new Date();
    const week = [];
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    for (let i = 0; i < 5; i++) {
        const day = new Date(new Date().setDate(first + i));
        week.push(day.toLocaleDateString());
    }
    return week;
}

const attendanceQuery = query(collection(db, "attendance"), orderBy("timestamp", "desc"));

onSnapshot(attendanceQuery, (snapshot) => {
    const allRecords = snapshot.docs.map(doc => doc.data());
    const todayStr = new Date().toLocaleDateString();

    const todayRecords = allRecords.filter(rec => rec.dateString === todayStr && rec.studentName.toLowerCase() !== "unknown");
    const studentStats = {};
    let totalViolationsCount = 0;

    allRecords.forEach(rec => {
        if (rec.studentName && rec.studentName.toLowerCase() !== "unknown") {
            const id = rec.studentId || "N/A";
            if (!studentStats[id]) {
                studentStats[id] = { name: rec.studentName, status: rec.status, count: 0 };
            }
            if (rec.status !== "Complete" && rec.status !== "Proper Uniform" && rec.status !== "Present") {
                studentStats[id].count++;
                totalViolationsCount++;
            }
        }
    });

    if (document.getElementById('totalScanned')) document.getElementById('totalScanned').innerText = todayRecords.length;
    if (document.getElementById('totalViolations')) document.getElementById('totalViolations').innerText = totalViolationsCount;

    if (document.getElementById('complianceRate')) {
        const total = allRecords.length;
        const rate = total > 0 ? Math.round(((total - totalViolationsCount) / total) * 100) : 0;
        document.getElementById('complianceRate').innerText = rate + "%";
    }

    const guidanceCount = Object.values(studentStats).filter(s => s.count >= 3).length;
    if (document.getElementById('guidanceCount')) document.getElementById('guidanceCount').innerText = guidanceCount;

    const latestValidRecord = allRecords.find(rec => rec.studentName && rec.studentName.toLowerCase() !== "unknown");
    if (latestValidRecord) {
        document.getElementById('latestName').innerHTML = `<strong>Student:</strong> ${latestValidRecord.studentName}`;
        document.getElementById('latestId').innerHTML = `<strong>Student ID:</strong> ${latestValidRecord.studentId || '---'}`;
        document.getElementById('latestProgram').innerHTML = `<strong>Program / Year:</strong> ${latestValidRecord.programLevel || '---'}`;
        
        const isProper = (latestValidRecord.status === 'Complete' || latestValidRecord.status === 'Proper Uniform' || latestValidRecord.status === 'Present');
        document.getElementById('latestUniform').innerHTML = `<strong>Uniform Status:</strong> <span style="color: ${isProper ? '#2ecc71' : '#e74c3c'};">${isProper ? 'Proper Uniform' : 'Incomplete'}</span>`;
        document.getElementById('latestViolation').innerHTML = `<strong>Violation:</strong> <span style="color: ${isProper ? '#2ecc71' : '#e74c3c'};">${isProper ? 'None' : latestValidRecord.status}</span>`;
        
        document.getElementById('latestTime').innerText = latestValidRecord.timeString || '--:--';
        document.getElementById('resDate').innerText = latestValidRecord.dateString || '--/--/----';
    }

    updateDashboardCharts(allRecords);
    updateTable(studentStats);
});

function updateTable(studentStats) {
    const tbody = document.querySelector(".records table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    Object.keys(studentStats).forEach(id => {
        const student = studentStats[id];
        const isProper = (student.status === 'Complete' || student.status === 'Proper Uniform' || student.status === 'Present');
        tbody.innerHTML += `
            <tr>
                <td>${student.name}</td>
                <td>${id}</td>
                <td style="color: ${isProper ? '#2ecc71' : '#e74c3c'}; font-weight: bold;">${isProper ? 'Proper Uniform' : student.status}</td>
                <td>${student.count}</td>
                <td class="${student.count >= 3 ? 'guide' : ''}">${student.count >= 3 ? 'Guidance Required' : '-'}</td>
            </tr>`;
    });
}

function updateDashboardCharts(records) {
    const weekDates = getWeekDates();
    const attendanceData = [0, 0, 0, 0, 0];
    const properData = [0, 0, 0, 0, 0];
    const violationData = [0, 0, 0, 0, 0];

    const violationCounts = {
        "Incomplete": 0,
        "No ID": 0,
        "Jacket": 0,
        "Wrong Uniform": 0
    };

    records.forEach(rec => {
        if (rec.studentName && rec.studentName.toLowerCase() !== "unknown") {
            const dateIdx = weekDates.indexOf(rec.dateString);
            const status = rec.status || "";

            if (dateIdx !== -1) {
                attendanceData[dateIdx]++;
                if (status === 'Complete' || status === 'Proper Uniform' || status === 'Present') {
                    properData[dateIdx]++;
                } else {
                    violationData[dateIdx]++;
                }
            }

            if (status !== 'Complete' && status !== 'Proper Uniform' && status !== 'Present') {
                if (status.includes("ID")) violationCounts["No ID"]++;
                else if (status.includes("Jacket") || status.includes("Hoodie")) violationCounts["Jacket"]++;
                else if (status.includes("Wrong")) violationCounts["Wrong Uniform"]++;
                else violationCounts["Incomplete"]++;
            }
        }
    });


    const ctxBar = document.getElementById('attendanceChart');
    if (ctxBar) {
        if (attendanceChartInstance) {

            attendanceChartInstance.data.datasets[0].data = attendanceData; 
            attendanceChartInstance.data.datasets[1].data = violationData;  
            attendanceChartInstance.update();
        } else {
    
            attendanceChartInstance = new Chart(ctxBar, {
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Total Scanned (Attendance)',
                            data: attendanceData,
                            backgroundColor: '#3498db',
                            borderRadius: 5,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Violations',
                            data: violationData,
                            borderColor: '#e74c3c',
                            backgroundColor: '#e74c3c',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: false,
                            order: 1 
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true, position: 'bottom' }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }
    }

    const ctxLine = document.getElementById('complianceChart');
    if (ctxLine) {
        if (complianceChartInstance) {
            complianceChartInstance.data.datasets[0].data = properData;
            complianceChartInstance.data.datasets[1].data = violationData;
            complianceChartInstance.update();
        } else {
            complianceChartInstance = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    datasets: [
                        { label: 'Proper Uniform', data: properData, borderColor: '#2ecc71', tension: 0.4 },
                        { label: 'Violations', data: violationData, borderColor: '#e74c3c', tension: 0.4 }
                    ]
                }
            });
        }
    }

    const ctxViolations = document.getElementById('violationChart');
    if (ctxViolations) {
        const dynamicData = Object.values(violationCounts);
        if (violationChartInstance) {
            violationChartInstance.data.datasets[0].data = dynamicData;
            violationChartInstance.update();
        } else {
            violationChartInstance = new Chart(ctxViolations, {
                type: 'bar',
                data: {
                    labels: Object.keys(violationCounts),
                    datasets: [{ label: 'Violation Count', data: dynamicData, backgroundColor: '#f39c12', borderRadius: 5 }]
                }
            });
        }
    }
}
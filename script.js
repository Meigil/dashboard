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

    const todayRecords = allRecords.filter(record => 
        record.dateString === todayStr && 
        record.studentName.toLowerCase() !== "unknown"
    );

    if (document.getElementById('totalScanned')) {
        document.getElementById('totalScanned').innerText = todayRecords.length;
    }

    const latestValidRecord = allRecords.find(record => 
        record.studentName.toLowerCase() !== "unknown"
    );

    if (latestValidRecord) {
        if(document.getElementById('latestName')) document.getElementById('latestName').innerHTML = `<strong>Student:</strong> ${latestValidRecord.studentName}`;
        if(document.getElementById('latestId')) document.getElementById('latestId').innerHTML = `<strong>Student ID:</strong> ${latestValidRecord.studentId || '---'}`;
        if(document.getElementById('latestProgram')) document.getElementById('latestProgram').innerHTML = `<strong>Program / Year:</strong> ${latestValidRecord.programLevel || '---'}`;
if(document.getElementById('latestUniform')) document.getElementById('latestUniform').innerHTML = `<strong>Uniform Status:</strong> ${ (latestValidRecord.status === 'Present' || latestValidRecord.status === 'Proper Uniform') ? 'Scanning...' : (latestValidRecord.status || 'Scanning...') }`;
        if(document.getElementById('latestTime')) document.getElementById('latestTime').innerText = latestValidRecord.timeString;
    }

    updateDashboardCharts(allRecords);
});

function updateDashboardCharts(records) {
    const weekDates = getWeekDates();
    const attendanceData = [0, 0, 0, 0, 0];

    records.forEach(record => {
        if (record.studentName.toLowerCase() !== "unknown") {
            const dateIdx = weekDates.indexOf(record.dateString);
            if (dateIdx !== -1) {
                attendanceData[dateIdx]++;
            }
        }
    });

    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    if (attendanceChartInstance) {
        attendanceChartInstance.data.datasets[0].data = attendanceData;
        attendanceChartInstance.update();
    } else {
        attendanceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                datasets: [{
                    data: attendanceData,
                    backgroundColor: '#3498db', 
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false } 
                },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
}

new Chart(document.getElementById('complianceChart'), {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      { label: 'Proper Uniform', data: [220, 240, 260, 280, 300], borderWidth: 3, tension: 0.4 },
      { label: 'Violations', data: [45, 38, 30, 25, 20], borderWidth: 3, tension: 0.4 }
    ]
  }
});

new Chart(document.getElementById('violationChart'), {
  type: 'bar',
  data: {
    labels: ['Incomplete Uniform', 'No ID ', 'Jacket / Hoodie', 'Wrong Uniform'],
    datasets: [{ label: 'Number of Violations', data: [60, 35, 25, 17] }]
  }
});
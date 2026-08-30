import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { renderSidebar } from "./sidebar.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7R5XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef",
  storageBucket: "thesissystem-921ef.appspot.com",
  messagingSenderId: "62118219774",
  appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const email = user.email ? user.email.toLowerCase().trim() : "";

  try {
    const userDocRef = doc(db, "users", email);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userRole = userSnap.data().role;

   
      if (userRole !== "admin") {
        alert("Your account role is not authorized.");
        window.location.href = "login.html";
        return; 
      }

      renderSidebar(userRole);

    } else {
      console.error("User record not found.");
      alert("Your account role is not authorized.");
      window.location.href = "login.html";
    }

  } catch (error) {
    console.error("Error fetching user role:", error);
    window.location.href = "login.html";
  }
});

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

    const allRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const todayStr = new Date().toLocaleDateString();

    const validRecords = allRecords.filter(rec =>
        rec.studentName &&
        rec.studentName.toLowerCase() !== "unknown"
    );

    const todayRecords = validRecords.filter(rec =>
        rec.dateString === todayStr
    );
    const isViolation = (rec) => {
        return (
            rec.violationType &&
            rec.violationType.trim() !== "" &&
            rec.violationType.toLowerCase() !== "none"
        );
    };
    const studentStats = {};    validRecords.forEach(rec => {
        const id = rec.studentId || "N/A";
        if (!studentStats[id]) {
            studentStats[id] = {
                name: rec.studentName,
                status: rec.status || "Unknown",
                violations: 0,
                lastRecord: rec};  }
        if (isViolation(rec)) {
            studentStats[id].violations++; }
        const oldDate =studentStats[id].lastRecord?.timestamp?.toMillis?.() || 0;
 const newDate = rec.timestamp?.toMillis?.() || 0;
if (newDate >= oldDate) {
            studentStats[id].lastRecord = rec;
            studentStats[id].status = rec.status || "Unknown";
        }
    });

const totalScanned = todayRecords.length;

const totalViolations = todayRecords.filter(
    rec => isViolation(rec)
).length;

const properRecords = todayRecords.filter(rec =>
    rec.status === "Complete Uniform" ||
    rec.status === "Complete" ||
    rec.status === "Proper Uniform" ||
    rec.status === "Present"
).length;

const complianceRate =
    todayRecords.length > 0
        ? Math.round((properRecords / todayRecords.length) * 100)
        : 0;
const guidanceCount = Object.values(studentStats)
    .filter(student => student.violations >= 3)
    .length;
    const totalScannedEl =
        document.getElementById("totalScanned");

    const totalViolationsEl =
        document.getElementById("totalViolations");

    const complianceRateEl =
        document.getElementById("complianceRate");

    const guidanceCountEl =
        document.getElementById("guidanceCount");

    if (totalScannedEl)
        totalScannedEl.innerText = totalScanned;

    if (totalViolationsEl)
        totalViolationsEl.innerText = totalViolations;

    if (complianceRateEl)
        complianceRateEl.innerText = complianceRate + "%";

    if (guidanceCountEl)
        guidanceCountEl.innerText = guidanceCount;

    const latestValidRecord = validRecords[0];

    if (latestValidRecord) {

        const isProper =
            latestValidRecord.status === "Complete Uniform" ||
            latestValidRecord.status === "Complete" ||
            latestValidRecord.status === "Proper Uniform" ||
            latestValidRecord.status === "Present";

        const violation =
            latestValidRecord.violationType &&
            latestValidRecord.violationType !== "None"
                ? latestValidRecord.violationType
                : "None";

        const studentId = latestValidRecord.studentId || "N/A";

        const studentViolationCount =
            validRecords.filter(rec =>
                rec.studentId === studentId &&
                isViolation(rec)
            ).length;
        const latestName =
            document.getElementById("latestName");

        if (latestName)
            latestName.innerHTML =
                `<strong>Student:</strong> ${latestValidRecord.studentName}`;


        const latestId =
            document.getElementById("latestId");

        if (latestId)
            latestId.innerHTML =
                `<strong>Student ID:</strong> ${latestValidRecord.studentId || "---"}`;

    
        const latestProgram =
            document.getElementById("latestProgram");

        if (latestProgram)
            latestProgram.innerHTML =
                `<strong>Program / Year:</strong> ${latestValidRecord.programLevel || "---"}`;


        const latestUniform =
            document.getElementById("latestUniform");

        if (latestUniform)
            latestUniform.innerHTML =
                `<strong>Uniform Status:</strong>
                <span style="color:${isProper ? "#2ecc71" : "#e74c3c"}">
                    ${latestValidRecord.status || "---"}
                </span>`;

        const latestViolation =
            document.getElementById("latestViolation");

        if (latestViolation)
            latestViolation.innerHTML =
                `<strong>Violation:</strong>
                <span style="color:${isProper ? "#2ecc71" : "#e74c3c"}">
                    ${violation}
                </span>`;
        const latestViolationCount =
            document.getElementById("latestViolationCount");

        if (latestViolationCount)
            latestViolationCount.innerHTML =
                `<strong>Total Violations:</strong> ${studentViolationCount}`;
        const latestOffenseCategory =
            document.getElementById("latestOffenseCategory");

        if (latestOffenseCategory)
            latestOffenseCategory.innerHTML =
                `<strong>Offense Category:</strong> ${getOffenseCategory(studentViolationCount)}`;

        const latestMatch =
            document.getElementById("latestMatch");

        if (latestMatch) {

            const faceMatch =
                latestValidRecord.faceMatch ?? 0;

            latestMatch.innerHTML =
                `<strong>Face Match:</strong> ${faceMatch}%`;
        }
 const latestDate =
            document.getElementById("latestDate");

        if (latestDate) {
            latestDate.innerHTML =
                `<strong>Detection Date:</strong> ${latestValidRecord.dateString || "---"}`;
        }

        const latestTime =
            document.getElementById("latestTime");

        if (latestTime) {
            latestTime.innerHTML =
                `<strong>Detection Time:</strong> ${latestValidRecord.timeString || "---"}`;
        }

        const resDate =
            document.getElementById("resDate");

        if (resDate)
            resDate.innerText =
                latestValidRecord.dateString || "---";
    }

    updateDashboardCharts(validRecords);
    updateTable(studentStats);
});

function getOffenseCategory(count) {

    if (count === 0) {
        return "No Record";
    }

    if (count === 1) {
        return "1st Offense - Verbal Warning (spoken reminder)";
    }

    if (count === 2) {
        return "2nd Offense - Written Reprimand (formal written warning)";
    }

    return "3rd Offense - Written Reprimand / Corrective Action (suspension for at least 3 school days and up to 7 school days)";
}
function updateTable(studentStats) {

    const tbody = document.querySelector(".records table tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    Object.keys(studentStats).forEach(id => {

        const student = studentStats[id];

        const latest = student.lastRecord;

        const isProper =
            latest.status === "Complete Uniform" ||
            latest.status === "Complete" ||
            latest.status === "Proper Uniform" ||
            latest.status === "Present";

        tbody.innerHTML += `
            <tr>

                <td>${student.name}</td>

                <td>${id}</td>

                <td style="
                    color: ${isProper ? "#2ecc71" : "#e74c3c"};
                    font-weight: bold;
                ">
                    ${latest.status || "---"}
                </td>

                <td>
                    ${student.violations}
                </td>

                <td class="${student.violations >= 3 ? "guide" : ""}">
                    ${
                        student.violations >= 3
                            ? "Guidance Required"
                            : "-"
                    }
                </td>

            </tr>
        `;
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
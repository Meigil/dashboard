
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const tableBody = document.getElementById("recordsBody");
const searchBox = document.querySelector(".search-box");

let students = [];

async function loadStudents() {
  const snapshot = await getDocs(collection(db, "students"));
  students = snapshot.docs.map(doc => doc.data());
  renderTable(students);
}

function renderTable(data) {
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="opacity:0.6;">No records found</td>
      </tr>
    `;
    return;
  }

  data.forEach(student => {
    const status = student.uniformStatus || "Unknown";
    const statusClass = status === "Complete Uniform" ? "ok" : "violation";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <img src="${student.imageBase64 || 'https://via.placeholder.com/40'}"
             class="student-photo">
      </td>
      <td>${student.studentId || "---"}</td>
      <td>${student.fullName || "---"}</td>
      <td>${student.program || "---"}</td>
      <td class="${statusClass}">
        ${status}
      </td>
      <td>${student.violationCount || 0}</td>
    `;

    tableBody.appendChild(tr);
  });
}

searchBox.addEventListener("input", () => {
  const keyword = searchBox.value.toLowerCase();

  const filtered = students.filter(s =>
    s.fullName?.toLowerCase().includes(keyword) ||
    s.studentId?.toLowerCase().includes(keyword)
  );

  renderTable(filtered);
});

loadStudents();

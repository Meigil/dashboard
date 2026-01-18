
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7R5XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef",
  storageBucket: "thesissystem-921ef.firebasestorage.app",
  messagingSenderId: "62118219774",
  appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const studentsWrapper = document.getElementById("studentsWrapper");
const noStudentsMsg = document.getElementById("noStudentsMessage");


function getCourseLabel(value) {
  const option = document.querySelector(
    `#programFilter option[value="${value}"]`
  );
  return option ? option.textContent : value;
}


function openModal(imgSrc, name) {
  document.getElementById("imageModal").style.display = "block";
  document.getElementById("imgFull").src = imgSrc;
  document.getElementById("caption").textContent = name;
}

document.querySelector(".close").onclick = () =>
  document.getElementById("imageModal").style.display = "none";


function renderStudents(snapshot) {
  studentsWrapper.innerHTML = "";
  noStudentsMsg.style.display = "none";

  if (snapshot.empty) {
    noStudentsMsg.style.display = "block";
    return;
  }

  const grouped = {}; 

  snapshot.forEach(docSnap => {
    const s = docSnap.data();
    s.docId = docSnap.id;

    if (!grouped[s.course]) grouped[s.course] = {};
    if (!grouped[s.course][s.yearLevel])
      grouped[s.course][s.yearLevel] = [];

    grouped[s.course][s.yearLevel].push(s);
  });

  for (const course in grouped) {
    const fullCourseName = getCourseLabel(course);

    let programTotal = 0;
    for (const y in grouped[course]) {
      programTotal += grouped[course][y].length;
    }

    const h2 = document.createElement("h2");
    h2.className = "program-title";
    h2.dataset.program = course;
    h2.textContent = `${fullCourseName} — Total Enrolled: ${programTotal}`;
    studentsWrapper.appendChild(h2);

    for (const year in grouped[course]) {
      const yearCount = grouped[course][year].length;

      const h3 = document.createElement("h3");
      h3.className = "year-title";
      h3.dataset.program = course;
      h3.dataset.year = year;
      h3.textContent = `${year} — ${yearCount} students`;
      studentsWrapper.appendChild(h3);

      const container = document.createElement("div");
      container.className = "table-container";
      container.dataset.program = course;
      container.dataset.year = year;

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;

      const tbody = container.querySelector("tbody");

      grouped[course][year].forEach(s => {
        const imgSrc = s.imageBase64 || "default.jpg";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <img src="${imgSrc}" width="45" height="45"
              style="border-radius:5px;cursor:pointer;object-fit:cover">
          </td>
          <td>${s.studentId}</td>
          <td>${s.fullName}</td>
          <td>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;

        tr.querySelector("img").onclick = () =>
          openModal(imgSrc, s.fullName);

        tr.querySelector(".delete-btn").onclick = async () => {
          if (confirm(`Delete ${s.fullName}?`)) {
            await deleteDoc(doc(db, "students", s.docId));
          }
        };

        tr.querySelector(".edit-btn").onclick = async () => {
          const newId = prompt("Edit Student ID:", s.studentId);
          const newName = prompt("Edit Full Name:", s.fullName);
          if (!newId || !newName) return;

          await deleteDoc(doc(db, "students", s.docId));
          await setDoc(doc(db, "students", newId), {
            ...s,
            studentId: newId,
            fullName: newName
          });
        };

        tbody.appendChild(tr);
      });

      studentsWrapper.appendChild(container);
    }
  }

  filterByProgram();
  searchStudents();
}

const q = query(collection(db, "students"), orderBy("studentId"));
onSnapshot(q, renderStudents);


function filterByProgram() {
  const program = document.getElementById("programFilter").value;
  const year = document.getElementById("yearFilter").value;

  let visible = 0;

  document
    .querySelectorAll(".program-title, .year-title, .table-container")
    .forEach(el => {
      const p = program === "all" || el.dataset.program === program;
      const y = !el.dataset.year || year === "all" || el.dataset.year === year;

      if (p && y) {
        el.style.display = "";
        if (el.classList.contains("table-container")) visible++;
      } else {
        el.style.display = "none";
      }
    });

  noStudentsMsg.style.display = visible === 0 ? "block" : "none";
}


function searchStudents() {
  const q = document.querySelector(".search-box").value.toLowerCase();
  let found = 0;

  document.querySelectorAll("#studentsWrapper tbody tr").forEach(row => {
    const id = row.cells[1].innerText.toLowerCase();
    const name = row.cells[2].innerText.toLowerCase();

    if (id.includes(q) || name.includes(q)) {
      row.style.display = "";
      found++;
    } else {
      row.style.display = "none";
    }
  });

  noStudentsMsg.style.display = found === 0 ? "block" : "none";
}

window.filterByProgram = filterByProgram;
window.searchStudents = searchStudents;

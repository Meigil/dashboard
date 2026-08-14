import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  setDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { renderSidebar } from "./sidebar.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7R5XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef",
  storageBucket: "thesissystem-921ef.firebasestorage.app",
  messagingSenderId: "62118219774",
  appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const studentsWrapper = document.getElementById("studentsWrapper");
const noStudentsMsg = document.getElementById("noStudentsMessage");
const bulkActionBar = document.getElementById("bulkActionBar");
const selectedCountLabel = document.getElementById("selectedCount");

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

function getCourseLabel(value) {
  const option = document.querySelector(`#programFilter option[value="${value}"]`);
  return option ? option.textContent : value;
}



function updateSelectedCount() {
  const checked = document.querySelectorAll('.student-checkbox:checked');
  selectedCountLabel.textContent = `${checked.length} students selected`;
  bulkActionBar.style.display = checked.length > 0 ? "block" : "none";
}

window.toggleGroup = (type, value, isChecked) => {
  const selector = type === 'program' ? 
    `.table-container[data-program="${value}"] .student-checkbox` : 
    `.table-container[data-year="${value}"] .student-checkbox`;
  
  document.querySelectorAll(selector).forEach(cb => {
    const container = cb.closest('.table-container');
    if (container && container.style.display !== "none") {
      cb.checked = isChecked;
    }
  });
  updateSelectedCount();
};

window.toggleSelectAllVisible = (masterCheckbox) => {
  document.querySelectorAll('.table-container').forEach(container => {
    if (container.style.display !== "none") {
      container.querySelectorAll('.student-checkbox').forEach(cb => {
        cb.checked = masterCheckbox.checked;
      });
    }
  });
  updateSelectedCount();
};



function renderStudents(snapshot) {
  studentsWrapper.innerHTML = "";
  
  if (snapshot.empty) {
    noStudentsMsg.style.display = "block";
    bulkActionBar.style.display = "none";
    return;
  }

  const grouped = {}; 
  snapshot.forEach(docSnap => {
    const s = docSnap.data();
    s.docId = docSnap.id;
    if (!grouped[s.course]) grouped[s.course] = {};
    if (!grouped[s.course][s.yearLevel]) grouped[s.course][s.yearLevel] = [];
    grouped[s.course][s.yearLevel].push(s);
  });

  for (const course in grouped) {
    const fullCourseName = getCourseLabel(course);
    let programTotal = 0;
    for (const y in grouped[course]) { programTotal += grouped[course][y].length; }

    const h2 = document.createElement("h2");
    h2.className = "program-title";
    h2.dataset.program = course;
    h2.style.display = "flex"; h2.style.alignItems = "center"; h2.style.gap = "10px";
    h2.innerHTML = `
      <input type="checkbox" onchange="toggleGroup('program', '${course}', this.checked)">
      <span>${fullCourseName} — Total Enrolled: ${programTotal}</span>
    `;
    studentsWrapper.appendChild(h2);

    for (const year in grouped[course]) {
      const yearCount = grouped[course][year].length;


      const h3 = document.createElement("h3");
      h3.className = "year-title";
      h3.dataset.program = course; h3.dataset.year = year;
      h3.style.display = "flex"; h3.style.alignItems = "center"; h3.style.gap = "10px";
      h3.innerHTML = `
        <input type="checkbox" onchange="toggleGroup('year', '${year}', this.checked)">
        <span>${year} — ${yearCount} students</span>
      `;
      studentsWrapper.appendChild(h3);

      const container = document.createElement("div");
      container.className = "table-container";
      container.dataset.program = course; container.dataset.year = year;
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th style="width:30px"></th>
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
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="checkbox" class="student-checkbox" data-id="${s.docId}" onchange="updateSelectedCount()"></td>
          <td><img src="${s.imageBase64 || 'default.jpg'}" width="40" height="40" style="border-radius:5px; object-fit:cover; cursor:pointer"></td>
          <td>${s.studentId}</td>
       <td>
  ${s.firstName || ""} 
  ${s.middleName || ""} 
  ${s.lastName || ""} 
  ${s.suffix || ""}
</td>
          <td>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;

  
        tr.querySelector("img").onclick = () => {
          document.getElementById("imageModal").style.display = "block";
          document.getElementById("imgFull").src = s.imageBase64 || "default.jpg";
          document.getElementById("caption").textContent = s.fullName;
        };

 
        tr.querySelector(".edit-btn").onclick = async () => {
          const newId = prompt("Edit Student ID:", s.studentId);
          const newName = prompt("Edit Full Name:", s.fullName);
          if (!newId || !newName) return;

          if (newId !== s.docId) {
            await deleteDoc(doc(db, "students", s.docId));
            await setDoc(doc(db, "students", newId), {
              ...s,
              studentId: newId,
              fullName: newName,
              docId: newId
            });
          } else {
            await setDoc(doc(db, "students", s.docId), { ...s, fullName: newName });
          }
        };

        tr.querySelector(".delete-btn").onclick = async () => {
          if (confirm(`Delete ${s.fullName}?`)) await deleteDoc(doc(db, "students", s.docId));
        };

        tbody.appendChild(tr);
      });
      studentsWrapper.appendChild(container);
    }
  }
  filterByProgram();
  searchStudents(); 
}


document.getElementById("bulkPromoteBtn").onclick = async () => {
  const newLevel = document.getElementById("promoteToYear").value;
  if (!newLevel) return alert("Please select a year level.");
  const selected = document.querySelectorAll('.student-checkbox:checked');
  if (confirm(`Update ${selected.length} students to ${newLevel}?`)) {
    const batch = writeBatch(db);
    selected.forEach(cb => { batch.update(doc(db, "students", cb.dataset.id), { yearLevel: newLevel }); });
    await batch.commit();
    alert("Updated successfully!");
  }
};


document.getElementById("bulkShiftBtn").onclick = async () => {

  const newProgram = document.getElementById("shiftToProgram").value;

  if (!newProgram) {
    return alert("Please select a program from the dropdown list.");
  }

  const selected = document.querySelectorAll('.student-checkbox:checked');

  if (selected.length === 0) {
    return alert("Please select at least one student to shift.");
  }

  if (confirm(`Shift ${selected.length} selected students to ${newProgram}?`)) {
    try {
      const batch = writeBatch(db);
      selected.forEach(cb => { 
        batch.update(doc(db, "students", cb.dataset.id), { 
          course: newProgram 
        }); 
      });
      
      await batch.commit();
      alert("Shifted successfully!");
      document.getElementById("shiftToProgram").value = "";
      if(document.getElementById("selectAllCheckbox")) {
        document.getElementById("selectAllCheckbox").checked = false;
      }
    } catch (error) {
      console.error("Error shifting students: ", error);
      alert("An error occurred while shifting students.");
    }
  }
};



document.getElementById("bulkDeleteBtn").onclick = async () => {
  const selected = document.querySelectorAll('.student-checkbox:checked');
  if (confirm(`Delete ${selected.length} selected students?`)) {
    const batch = writeBatch(db);
    selected.forEach(cb => { batch.delete(doc(db, "students", cb.dataset.id)); });
    await batch.commit();
    alert("Deleted successfully!");
  }
};



function filterByProgram() {
  const program = document.getElementById("programFilter").value;
  const year = document.getElementById("yearFilter").value;
  
  document.querySelectorAll(".program-title, .year-title, .table-container").forEach(el => {
    const pMatch = program === "all" || el.dataset.program === program;
    const yMatch = !el.dataset.year || year === "all" || el.dataset.year === year;
    
    if (pMatch && yMatch) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });

  searchStudents();
}

function searchStudents() {
  const queryText = document.querySelector(".search-box").value.toLowerCase();
  const programFilter = document.getElementById("programFilter").value;
  const yearFilter = document.getElementById("yearFilter").value;

  document.querySelectorAll("#studentsWrapper tbody tr").forEach(row => {
    const id = row.cells[2].innerText.toLowerCase();
    const name = row.cells[3].innerText.toLowerCase();
    const container = row.closest('.table-container');
 
    const matchesSearch = id.includes(queryText) || name.includes(queryText);

    const matchesFilter = (programFilter === "all" || container.dataset.program === programFilter) &&
                          (yearFilter === "all" || container.dataset.year === yearFilter);

    if (matchesSearch && matchesFilter) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });

  let totalVisible = 0;

  document.querySelectorAll(".table-container").forEach(container => {
    const visibleRows = container.querySelectorAll("tbody tr:not([style*='display: none'])").length;
    const program = container.dataset.program;
    const year = container.dataset.year;

    if (visibleRows > 0) {
      container.style.display = "";
      document.querySelectorAll(`.year-title[data-program="${program}"][data-year="${year}"]`).forEach(el => el.style.display = "");
      document.querySelectorAll(`.program-title[data-program="${program}"]`).forEach(el => el.style.display = "");
      totalVisible += visibleRows;
    } else {
      container.style.display = "none";

      document.querySelectorAll(`.year-title[data-program="${program}"][data-year="${year}"]`).forEach(el => el.style.display = "none");
    }
  });

  document.querySelectorAll(".program-title").forEach(title => {
    const program = title.dataset.program;
    const hasVisibleYear = Array.from(document.querySelectorAll(`.year-title[data-program="${program}"]`))
                                .some(yearTitle => yearTitle.style.display !== "none");
    
    if (!hasVisibleYear) {
      title.style.display = "none";
    }
  });

  noStudentsMsg.style.display = totalVisible === 0 ? "block" : "none";
}

window.updateSelectedCount = updateSelectedCount;
window.filterByProgram = filterByProgram;
window.searchStudents = searchStudents;
window.toggleSelectAllVisible = toggleSelectAllVisible;

const q = query(collection(db, "students"), orderBy("studentId"));
onSnapshot(q, renderStudents);

document.querySelector(".close").onclick = () => {
  document.getElementById("imageModal").style.display = "none";
};
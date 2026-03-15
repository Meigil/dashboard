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
const bulkActionBar = document.getElementById("bulkActionBar");
const selectedCountLabel = document.getElementById("selectedCount");

// Helper to get labels from the select dropdown
function getCourseLabel(value) {
  const option = document.querySelector(`#programFilter option[value="${value}"]`);
  return option ? option.textContent : value;
}

// --- BULK ACTION LOGIC ---

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

// --- RENDER LOGIC ---

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

    // Program Header
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

      // Year Header
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
          <td>${s.fullName}</td>
          <td>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;

        // Image Modal Open
        tr.querySelector("img").onclick = () => {
          document.getElementById("imageModal").style.display = "block";
          document.getElementById("imgFull").src = s.imageBase64 || "default.jpg";
          document.getElementById("caption").textContent = s.fullName;
        };

        // Individual Edit
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

        // Individual Delete
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

// --- BULK BUTTON ACTIONS ---

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

// --- BULK SHIFT LOGIC (Updated to use Dropdown) ---
document.getElementById("bulkShiftBtn").onclick = async () => {
  // 1. Kunin ang value mula sa dropdown imbes na prompt
  const newProgram = document.getElementById("shiftToProgram").value;
  
  // 2. Validation: Kung walang pinili sa dropdown
  if (!newProgram) {
    return alert("Please select a program from the dropdown list.");
  }

  const selected = document.querySelectorAll('.student-checkbox:checked');
  
  // Check kung may naka-check na students
  if (selected.length === 0) {
    return alert("Please select at least one student to shift.");
  }

  // 3. Confirm at Execute
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
      
      // Reset dropdown after success
      document.getElementById("shiftToProgram").value = "";
      // Uncheck "Select All" if you have one
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

// --- FILTERS & SEARCH ---

// --- FILTERS & SEARCH ---

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
  
  // Re-run search after filtering to maintain consistency
  searchStudents();
}

function searchStudents() {
  const queryText = document.querySelector(".search-box").value.toLowerCase();
  const programFilter = document.getElementById("programFilter").value;
  const yearFilter = document.getElementById("yearFilter").value;

  // 1. Hide/Show Rows based on Search and current Filters
  document.querySelectorAll("#studentsWrapper tbody tr").forEach(row => {
    const id = row.cells[2].innerText.toLowerCase();
    const name = row.cells[3].innerText.toLowerCase();
    const container = row.closest('.table-container');
    
    // Check if row matches search text
    const matchesSearch = id.includes(queryText) || name.includes(queryText);
    
    // Check if row matches current dropdown filters
    const matchesFilter = (programFilter === "all" || container.dataset.program === programFilter) &&
                          (yearFilter === "all" || container.dataset.year === yearFilter);

    if (matchesSearch && matchesFilter) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });

  // 2. Hide Headers/Containers that no longer have visible rows
  let totalVisible = 0;

  document.querySelectorAll(".table-container").forEach(container => {
    const visibleRows = container.querySelectorAll("tbody tr:not([style*='display: none'])").length;
    const program = container.dataset.program;
    const year = container.dataset.year;

    if (visibleRows > 0) {
      container.style.display = "";
      // Show the associated Year and Program titles
      document.querySelectorAll(`.year-title[data-program="${program}"][data-year="${year}"]`).forEach(el => el.style.display = "");
      document.querySelectorAll(`.program-title[data-program="${program}"]`).forEach(el => el.style.display = "");
      totalVisible += visibleRows;
    } else {
      container.style.display = "none";
      // Hide the year title if this specific container is empty
      document.querySelectorAll(`.year-title[data-program="${program}"][data-year="${year}"]`).forEach(el => el.style.display = "none");
    }
  });

  // 3. Cleanup: Hide Program Title if ALL its year levels are hidden
  document.querySelectorAll(".program-title").forEach(title => {
    const program = title.dataset.program;
    const hasVisibleYear = Array.from(document.querySelectorAll(`.year-title[data-program="${program}"]`))
                                .some(yearTitle => yearTitle.style.display !== "none");
    
    if (!hasVisibleYear) {
      title.style.display = "none";
    }
  });

  // Show "No Students" message if everything is hidden
  noStudentsMsg.style.display = totalVisible === 0 ? "block" : "none";
}

// Global exposure for HTML inline events
window.updateSelectedCount = updateSelectedCount;
window.filterByProgram = filterByProgram;
window.searchStudents = searchStudents;
window.toggleSelectAllVisible = toggleSelectAllVisible;

// Real-time listener
const q = query(collection(db, "students"), orderBy("studentId"));
onSnapshot(q, renderStudents);

// Close Modal logic
document.querySelector(".close").onclick = () => {
  document.getElementById("imageModal").style.display = "none";
};
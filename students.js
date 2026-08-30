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
        Swal.fire({
          icon: 'error',
          title: 'Unauthorized',
          text: 'Your account role is not authorized.',
          confirmButtonColor: '#003A8F'
        }).then(() => {
          window.location.href = "login.html";
        });
        return; 
      }

      renderSidebar(userRole);

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Unauthorized',
        text: 'Your account record was not found.',
        confirmButtonColor: '#003A8F'
      }).then(() => {
        window.location.href = "login.html";
      });
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

        // Image View Modal
        tr.querySelector("img").onclick = () => {
          document.getElementById("imageModal").style.display = "block";
          document.getElementById("imgFull").src = s.imageBase64 || "default.jpg";
          document.getElementById("caption").textContent = s.fullName || `${s.firstName} ${s.lastName}`;
        };

        // Open Edit Modal
        tr.querySelector(".edit-btn").onclick = () => {
          openEditModal(s);
        };

        // Single Delete
        tr.querySelector(".delete-btn").onclick = () => {
          Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${s.fullName || s.studentId}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
          }).then(async (result) => {
            if (result.isConfirmed) {
              await deleteDoc(doc(db, "students", s.docId));
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Student has been deleted.',
                timer: 1500,
                showConfirmButton: false
              });
            }
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


function openEditModal(student) {
  document.getElementById("editDocId").value = student.docId;
  document.getElementById("editStudentId").value = student.studentId || "";
  document.getElementById("editFirstName").value = student.firstName || "";
  document.getElementById("editMiddleName").value = student.middleName || "";
  document.getElementById("editLastName").value = student.lastName || "";
  document.getElementById("editSuffix").value = student.suffix || "";
  document.getElementById("editStudentModal").style.display = "flex";
}

window.closeEditModal = () => {
  document.getElementById("editStudentModal").style.display = "none";
};

document.getElementById("saveEditBtn").onclick = async () => {
  const oldDocId = document.getElementById("editDocId").value;
  const newStudentId = document.getElementById("editStudentId").value.trim();
  const firstName = document.getElementById("editFirstName").value.trim();
  const middleName = document.getElementById("editMiddleName").value.trim();
  const lastName = document.getElementById("editLastName").value.trim();
  const suffix = document.getElementById("editSuffix").value.trim();
  const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");

  if (!newStudentId || !firstName || !lastName) {
    Swal.fire({
      icon: 'warning',
      title: 'Incomplete Details',
      text: 'Please fill out Student ID, First Name, and Last Name.',
      confirmButtonColor: '#003A8F'
    });
    return;
  }

  try {
    const oldDocRef = doc(db, "students", oldDocId);
    const oldSnap = await getDoc(oldDocRef);
    const existingData = oldSnap.exists() ? oldSnap.data() : {};

    const updatedPayload = {
      ...existingData,
      studentId: newStudentId,
      firstName,
      middleName,
      lastName,
      suffix,
      fullName
    };

    if (newStudentId !== oldDocId) {
      await deleteDoc(oldDocRef);
      await setDoc(doc(db, "students", newStudentId), updatedPayload);
    } else {
      await setDoc(oldDocRef, updatedPayload);
    }

    closeEditModal();
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'Student profile updated successfully.',
      timer: 1500,
      showConfirmButton: false
    });

  } catch (error) {
    console.error("Error updating student:", error);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: error.message,
      confirmButtonColor: '#003A8F'
    });
  }
};

// BULK ACTIONS
document.getElementById("bulkPromoteBtn").onclick = async () => {
  const newLevel = document.getElementById("promoteToYear").value;
  if (!newLevel) {
    return Swal.fire({
      icon: 'warning',
      title: 'Select Year Level',
      text: 'Please select a year level from the dropdown.',
      confirmButtonColor: '#003A8F'
    });
  }

  const selected = document.querySelectorAll('.student-checkbox:checked');
  if (selected.length === 0) {
    return Swal.fire({
      icon: 'warning',
      title: 'No Selection',
      text: 'Please select at least one student.',
      confirmButtonColor: '#003A8F'
    });
  }

  Swal.fire({
    title: 'Confirm Level Update',
    text: `Update ${selected.length} student(s) to ${newLevel}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#003A8F',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, update!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const batch = writeBatch(db);
      selected.forEach(cb => { batch.update(doc(db, "students", cb.dataset.id), { yearLevel: newLevel }); });
      await batch.commit();
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Students year level updated successfully.',
        confirmButtonColor: '#003A8F'
      });
    }
  });
};

document.getElementById("bulkShiftBtn").onclick = async () => {
  const newProgram = document.getElementById("shiftToProgram").value;

  if (!newProgram) {
    return Swal.fire({
      icon: 'warning',
      title: 'Select Program',
      text: 'Please select a program from the dropdown list.',
      confirmButtonColor: '#003A8F'
    });
  }

  const selected = document.querySelectorAll('.student-checkbox:checked');
  if (selected.length === 0) {
    return Swal.fire({
      icon: 'warning',
      title: 'No Selection',
      text: 'Please select at least one student to shift.',
      confirmButtonColor: '#003A8F'
    });
  }

  Swal.fire({
    title: 'Confirm Program Shift',
    text: `Shift ${selected.length} student(s) to ${newProgram}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#003A8F',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, shift!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const batch = writeBatch(db);
        selected.forEach(cb => { 
          batch.update(doc(db, "students", cb.dataset.id), { course: newProgram }); 
        });
        
        await batch.commit();
        document.getElementById("shiftToProgram").value = "";
        if(document.getElementById("selectAllCheckbox")) {
          document.getElementById("selectAllCheckbox").checked = false;
        }

        Swal.fire({
          icon: 'success',
          title: 'Shifted!',
          text: 'Students shifted program successfully.',
          confirmButtonColor: '#003A8F'
        });
      } catch (error) {
        console.error("Error shifting students: ", error);
        Swal.fire({
          icon: 'error',
          title: 'Shift Failed',
          text: error.message,
          confirmButtonColor: '#003A8F'
        });
      }
    }
  });
};

document.getElementById("bulkDeleteBtn").onclick = async () => {
  const selected = document.querySelectorAll('.student-checkbox:checked');
  if (selected.length === 0) {
    return Swal.fire({
      icon: 'warning',
      title: 'No Selection',
      text: 'Please select at least one student to delete.',
      confirmButtonColor: '#003A8F'
    });
  }

  Swal.fire({
    title: 'Delete Selected Students?',
    text: `Are you sure you want to delete ${selected.length} student(s)? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete all!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const batch = writeBatch(db);
      selected.forEach(cb => { batch.delete(doc(db, "students", cb.dataset.id)); });
      await batch.commit();

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Selected students deleted successfully.',
        confirmButtonColor: '#003A8F'
      });
    }
  });
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
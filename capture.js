import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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


const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("imagePreview");
const uploadInput = document.getElementById("uploadImage");
const saveBtn = document.querySelector(".save-btn");

const csvFileInput = document.getElementById("csvFile");
const imageFolderInput = document.getElementById("imageFolder");
const startBulkBtn = document.getElementById("startBulkBtn");
const bulkStatus = document.getElementById("bulkStatus");
const csvList = document.getElementById("csvList");
const imageList = document.getElementById("imageList");

let currentImages = []; 


navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("Camera error:", err));

window.captureImage = function() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.6);
  imagePreview.innerHTML = `<img src="${imageData}" width="100%" style="border-radius:10px;">`;
};

uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.innerHTML = `<img src="${reader.result}" width="100%" style="border-radius:10px;">`;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

window.saveStudent = async function() {
  const studentId = document.getElementById("studentId").value.trim();
const firstName = document.getElementById("firstName").value.trim();
const middleName = document.getElementById("middleName").value.trim();
const lastName = document.getElementById("lastName").value.trim();
const suffix = document.getElementById("suffix").value.trim();
const fullName = [firstName, middleName, lastName, suffix]
  .filter(Boolean)
  .join(" ");
  const course = document.getElementById("course").value;
  const yearLevel = document.getElementById("yearLevel").value;

  if (!studentId || !fullName || !course || !yearLevel || canvas.width === 0) {
    alert("Please complete all fields and capture/upload an image.");
    return;
  }

  const imageData = canvas.toDataURL("image/jpeg", 0.6);

  try {
    await setDoc(doc(db, "students", studentId), {
      studentId, firstName,
middleName,
lastName,
suffix,
fullName, course, yearLevel,
      imageBase64: imageData,
      createdAt: serverTimestamp()
    });
    alert("Student Profile Saved!");
    location.reload(); 
  } catch (err) {
    alert("Error saving: " + err.message);
  }
};


function formatSize(bytes) {
  if (bytes < 1024) return bytes + " b";
  return (bytes / 1024).toFixed(1) + " kb";
}

csvFileInput.addEventListener("change", renderCSV);
window.removeCSV = () => { csvFileInput.value = ""; csvList.innerHTML = ""; };

function renderCSV() {
  csvList.innerHTML = "";
  if (csvFileInput.files[0]) {
    const file = csvFileInput.files[0];
    csvList.innerHTML = `<div class="file-item"><span> ${file.name}</span><span onclick="removeCSV()">✕</span></div>`;
  }
}

imageFolderInput.addEventListener("change", function() {
  currentImages = Array.from(this.files);
  renderImages();
});

window.removeImage = (index) => {
  currentImages.splice(index, 1);
  renderImages();
};

function renderImages() {
  imageList.innerHTML = "";
  currentImages.slice(0, 3).forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerHTML = `<span>${file.name}</span><span onclick="removeImage(${index})">✕</span>`;
    imageList.appendChild(div);
  });
  bulkStatus.innerText = `${currentImages.length} images selected.`;
}

startBulkBtn.addEventListener("click", () => {
  if (!csvFileInput.files[0] || currentImages.length === 0) return alert("Select CSV and Images!");

  const loadingArea = document.getElementById("bulkLoadingArea");
  const statusText = document.getElementById("bulkStatus");
  const spinner = document.querySelector(".spinner");

  Papa.parse(csvFileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const students = results.data;
      const total = students.length;
      let success = 0;
      loadingArea.style.display = "flex";
      spinner.style.display = "block";
      statusText.innerText = `Preparing upload...`;

      for (const [i, s] of students.entries()) {
        const sId = s.StudentId?.trim();
        const currentNum = i + 1; 
        statusText.innerText = `Uploading: ${currentNum} out of ${total}`;

        if (sId) {
          const photo = currentImages.find(f => f.name.split('.')[0] === sId);
          if (photo) {
            try {
              const base64 = await convertToBase64(photo);
              await setDoc(doc(db, "students", sId), {
                studentId: sId,
               fullName: `${s.firstName || ""} ${s.middleName || ""} ${s.lastName || ""} ${s.suffix || ""}`.trim(),
                course: s.course || "N/A",
                yearLevel: s.yearLevel || "N/A",
                imageBase64: base64,
                createdAt: serverTimestamp()
              });
              success++;
            } catch (err) {
              console.error("Error for " + sId, err);
            }
          }
        }
      }

      spinner.style.display = "none"; 
      statusText.innerText = `Done! Saved ${success} out of ${total} students.`;
      setTimeout(() => {
        loadingArea.style.display = "none";
      }, 5000);
    }
  });
});

function convertToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
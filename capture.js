import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const frame = document.querySelector(".shoulder-frame");
const status = document.getElementById("captureStatus");
let currentImages = []; 

async function startCamera(){
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(
      "https://justadudewhohacks.github.io/face-api.js/models"
    );
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    detectFace();
  } catch(err) {
    console.error("Camera Error:", err);
  }
}

async function detectFace(){
  setInterval(async () => {
    const detection = await faceapi.detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions()
    );
    if(detection){
      const box = detection.box;
      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const ovalWidth = 180;
      const ovalHeight = 230;
      const ovalCenterX = videoWidth / 2;
      const ovalCenterY = videoHeight / 2;
      const insideOval =
        faceCenterX > ovalCenterX - ovalWidth/2 &&
        faceCenterX < ovalCenterX + ovalWidth/2 &&
        faceCenterY > ovalCenterY - ovalHeight/2 &&
        faceCenterY < ovalCenterY + ovalHeight/2;

      if(insideOval){
        frame.classList.remove("face-warning");
        frame.classList.add("face-ready");
        status.innerText = "Face aligned - Ready to capture";
      } else {
        frame.classList.remove("face-ready");
        frame.classList.add("face-warning");
        status.innerText = "Place your face inside the frame";
      }
    } else {
      frame.classList.remove("face-ready");
      frame.classList.add("face-warning");
      status.innerText = "Face not detected";
    }
  }, 500);
}

startCamera();

window.captureImage = function() {
  if(!frame.classList.contains("face-ready")){
    alert("Please position your face inside the frame before capturing.");
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.6);
  imagePreview.innerHTML = `<img src="${imageData}" width="100%" style="border-radius:10px;">`;
  status.innerText = "Image captured successfully";
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
  const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
  const course = document.getElementById("course").value;
  const yearLevel = document.getElementById("yearLevel").value;

  if (!studentId || !fullName || !course || !yearLevel || canvas.width === 0) {
    alert("Please complete all fields and capture/upload an image.");
    return;
  }

  const imageData = canvas.toDataURL("image/jpeg", 0.6);

  try {
    await setDoc(doc(db, "students", studentId), {
      studentId, firstName, middleName, lastName, suffix,
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
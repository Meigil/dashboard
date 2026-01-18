
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
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

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("imagePreview");
const saveBtn = document.querySelector(".save-btn");
const uploadInput = document.getElementById("uploadImage");

saveBtn.disabled = true;

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => {
    console.error("Camera error:", err);
    alert("Camera permission denied");
  });

function captureImage() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.6);
  imagePreview.innerHTML = `<img src="${imageData}" width="100%">`;

  saveBtn.disabled = false;
}


uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];
  if (!file) return;

  saveBtn.disabled = true;

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.innerHTML = `<img src="${reader.result}" width="100%">`;

    const img = new Image();
    img.onload = () => {

      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);

    
      saveBtn.disabled = false;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});


async function saveStudent() {
  const studentId = document.getElementById("studentId").value.trim();
  const fullName = document.getElementById("fullName").value.trim();
  const course = document.getElementById("course").value;
  const yearLevel = document.getElementById("yearLevel").value;


  if (!studentId || !fullName || !course || !yearLevel) {
    alert("Please complete all fields (including Year Level)");
    return;
  }


  if (canvas.width === 0 || canvas.height === 0) {
    alert("Please capture or upload an image first");
    return;
  }


  const imageData = canvas.toDataURL("image/jpeg", 0.6);

  try {
    await setDoc(doc(db, "students", studentId), {
      studentId,
      fullName,
      course,
      yearLevel,
      imageBase64: imageData,
      createdAt: serverTimestamp()
    });

    alert("Student saved to Firestore");


    document.getElementById("studentId").value = "";
    document.getElementById("fullName").value = "";
    document.getElementById("course").value = "";
    document.getElementById("yearLevel").value = "";
    imagePreview.innerHTML = "No image captured";
    saveBtn.disabled = true;

  } catch (err) {
    console.error("Firestore error:", err);
    alert("Failed to save student. Check console for details.");
  }
}

window.captureImage = captureImage;
window.saveStudent = saveStudent;

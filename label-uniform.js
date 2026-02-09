import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const labelCanvas = document.getElementById("labelCanvas");
const labelCtx = labelCanvas.getContext("2d");
const labelSelect = document.getElementById("labelSelect");

let boxes = [];
let drawing = false;
let startX, startY;
let baseImage = new Image();

const imgData = sessionStorage.getItem("uniformImage");
const program = sessionStorage.getItem("uniformProgram");
if (!imgData || !program) {
  alert("No image or program found. Go back to capture page.");
  window.location.href = "uniformcapture.html";
} else {
  baseImage.onload = () => {
    labelCanvas.width = baseImage.width;
    labelCanvas.height = baseImage.height;
    redraw();
  };
  baseImage.src = imgData;
}

labelCanvas.addEventListener("mousedown", e => {
  if (!labelSelect.value) return alert("Select a label first!");
  drawing = true;
  const r = labelCanvas.getBoundingClientRect();
  startX = e.clientX - r.left;
  startY = e.clientY - r.top;
});

labelCanvas.addEventListener("mousemove", e => {
  if (!drawing) return;
  redraw();
  const r = labelCanvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  labelCtx.strokeStyle = "red";
  labelCtx.strokeRect(startX, startY, x - startX, y - startY);
});

labelCanvas.addEventListener("mouseup", e => {
  if (!drawing) return;
  drawing = false;
  const r = labelCanvas.getBoundingClientRect();
  const endX = e.clientX - r.left;
  const endY = e.clientY - r.top;
  boxes.push({ label: labelSelect.value, x: startX, y: startY, w: endX - startX, h: endY - startY });
  redraw();
});

function redraw() {
  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  labelCtx.drawImage(baseImage, 0, 0);
  boxes.forEach(b => {
    labelCtx.strokeStyle = "lime";
    labelCtx.strokeRect(b.x, b.y, b.w, b.h);
    labelCtx.fillStyle = "lime";
    labelCtx.fillText(b.label, b.x + 4, b.y - 4);
  });
}

// Save
window.saveUniform = async function() {
  if (!boxes.length) return alert("Label at least one part!");

  const imageData = labelCanvas.toDataURL("image/jpeg", 0.8);

  await setDoc(doc(db, "uniforms", `${program}-${Date.now()}`), {
    program,
    imageBase64: imageData,
    labels: boxes,
    createdAt: serverTimestamp()
  });

  alert("Uniform labeled & saved!");
  sessionStorage.removeItem("uniformImage");
  sessionStorage.removeItem("uniformProgram");
  window.location.href = "uniformcapture.html"; 
};

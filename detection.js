import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const resName = document.getElementById("resName");
const resId = document.getElementById("resId");
const resProgram = document.getElementById("resProgram"); 
const resMatch = document.getElementById("resMatch");
const resTime = document.getElementById("resTime");
const detectionStatus = document.getElementById("detectionStatus");

let faceMatcher;
const studentInfoMap = {};
const recordedToday = new Set(); 
const recordingNow = new Set();

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("./models")
]).then(async () => {
  console.log("AI Models Loaded");
  faceMatcher = await loadStudentsFromFirestore();
  startCamera();
});

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } })
    .then(stream => video.srcObject = stream)
    .catch(err => {
      console.error("Camera Error:", err);
      detectionStatus.textContent = "Camera Error";
    });
}

async function loadStudentsFromFirestore() {
  const snapshot = await getDocs(collection(db, "students"));
  const labeledDescriptors = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    studentInfoMap[data.fullName] = data;

    try {
      const img = await faceapi.fetchImage(data.imageBase64);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (detection) labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(data.fullName, [detection.descriptor]));
    } catch (error) {
      console.error("Image load error:", data.fullName);
    }
  }
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}

function resetUI() {
  resName.innerHTML = `<strong>Student Name:</strong> Unknown`;
  resId.innerHTML = `<strong>Student ID:</strong> ---`;
  if (resProgram) resProgram.innerHTML = `<strong>Program / Year:</strong> ---`;
  
  resMatch.innerHTML = `Low`;
  resMatch.style.color = "white";

  detectionStatus.textContent = "Scanning...";
  detectionStatus.style.setProperty('color', '#ff4b5c', 'important'); 
}

function updateUI(faceResult) {
  resTime.textContent = new Date().toLocaleTimeString();

  if (faceResult.label !== "unknown") {
    const student = studentInfoMap[faceResult.label];
    resName.innerHTML = `<strong>Student Name:</strong> ${faceResult.label}`;
    resId.innerHTML = `<strong>Student ID:</strong> ${student?.studentId || "---"}`;
    
    const displayProg = `${student?.course || ""} - ${student?.yearLevel || ""}`.trim();
    if (resProgram) resProgram.innerHTML = `<strong>Program / Year:</strong> ${displayProg || "---"}`;

    resMatch.innerHTML = `${Math.round((1 - faceResult.distance) * 100)}%`;
    resMatch.style.color = "#2ecc71"; 

    if (recordedToday.has(faceResult.label)) {
      detectionStatus.textContent = "Already Recorded";
      detectionStatus.style.setProperty('color', '#3498db', 'important'); 
    } else {
      detectionStatus.textContent = "Identified & Recorded";
      detectionStatus.style.setProperty('color', '#2ecc71', 'important'); 
    }
  } else {

    resName.innerHTML = `<strong>Student Name:</strong> Unknown`;
    resId.innerHTML = `<strong>Student ID:</strong> ---`;
    if (resProgram) resProgram.innerHTML = `<strong>Program / Year:</strong> ---`;
    
    resMatch.innerHTML = `Low`;
    resMatch.style.color = "#f1c40f"; 

    detectionStatus.textContent = "Unknown Face";
    detectionStatus.style.setProperty('color', '#f1c40f', 'important'); 
  }
}

async function recordAttendance(name) {
  if (recordedToday.has(name) || recordingNow.has(name)) return;

  recordingNow.add(name); 

  const student = studentInfoMap[name];
  const now = new Date();
  const todayStr = now.toLocaleDateString();

  try {
    const q = query(
      collection(db, "attendance"),
      where("studentName", "==", name),
      where("dateString", "==", todayStr)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      recordedToday.add(name);
      return;
    }

    await addDoc(collection(db, "attendance"), {
      studentName: name,
      studentId: student?.studentId || "N/A",
      programLevel: `${student?.course || "Unknown"} - ${student?.yearLevel || "N/A"}`,
      timestamp: serverTimestamp(),
      dateString: todayStr,
      timeString: now.toLocaleTimeString(),
     status: student?.uniformStatus || "Scanning...",
  violationType: student?.violationType || "---"
    });

    recordedToday.add(name);
  } catch (error) {
    console.error("Error saving attendance:", error);
  } finally {
    recordingNow.delete(name); 
  }
}

video.addEventListener("play", () => {
  const ctx = canvas.getContext("2d");

  function updateCanvasSize() {
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
  }
  updateCanvasSize();
  window.addEventListener("resize", updateCanvasSize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    const resized = faceapi.resizeResults(detections, displaySize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (faceMatcher && resized.length > 0) {
      for (const det of resized) {
        const match = faceMatcher.findBestMatch(det.descriptor);
 
        const color = match.label === "unknown" ? "#f1c40f" : "#2ecc71";

        const drawOptions = {
          label: match.toString(),
          lineWidth: 2,
          boxColor: color
        };

        new faceapi.draw.DrawBox(det.detection.box, drawOptions).draw(canvas);

        updateUI(match);
        if (match.label !== "unknown") recordAttendance(match.label);
      }
    } else {
      resetUI(); 
    }
  }, 500);
});
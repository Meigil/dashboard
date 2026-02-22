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

const ROBOFLOW_API_KEY = "32Js5Nadtxn763aUKKd6"; 
const ROBOFLOW_MODEL = "uniform-detection-3omub/1"; 
const ROBOFLOW_URL = `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}`;

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const resName = document.getElementById("resName");
const resId = document.getElementById("resId");
const resProgram = document.getElementById("resProgram"); 
const resMatch = document.getElementById("resMatch");
const resTime = document.getElementById("resTime");
const detectionStatus = document.getElementById("detectionStatus");
const resStatus = document.getElementById("resStatus");
const resViolation = document.getElementById("resViolation");

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
  return new faceapi.FaceMatcher(labeledDescriptors, 0.3);
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

async function recordAttendance(name, currentUniformStatus, currentViolationType) {
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
      status: currentUniformStatus || "Unknown",
      violationType: currentViolationType || "---"
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
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.clientWidth;
    tempCanvas.height = video.clientHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    const base64Image = tempCanvas.toDataURL("image/jpeg").split(",")[1];

    const [detections, roboflowRes] = await Promise.all([
      faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors(),
      fetch(ROBOFLOW_URL, {
        method: "POST",
        body: base64Image
      }).then(res => res.json()).catch(() => ({ predictions: [] }))
    ]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let currentUniformStatus = "Scanning...";
    let currentViolation = "---";
    const detectedUniformParts = [];
    const CONFIDENCE_THRESHOLD = 0.75; 

    if (roboflowRes.predictions && roboflowRes.predictions.length > 0) {
      roboflowRes.predictions.forEach(pred => {
        if (pred.confidence >= CONFIDENCE_THRESHOLD) {
          detectedUniformParts.push(pred.class);
          const x = pred.x - pred.width / 2;
          const y = pred.y - pred.height / 2;
          ctx.strokeStyle = "#00c6ff"; 
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, pred.width, pred.height);
          ctx.fillStyle = "#00c6ff";
          ctx.fillRect(x, y - 25, pred.width, 25);
          ctx.fillStyle = "#000";
          ctx.font = "bold 16px Arial";
          ctx.fillText(`${pred.class} ${Math.round(pred.confidence * 100)}%`, x + 5, y - 7);
        }
      });
      const requiredParts = ["blouse", "lanyard", "pants", "shoes"];
      const missingParts = requiredParts.filter(part => !detectedUniformParts.includes(part));

      if (detectedUniformParts.length === 0) {
        currentUniformStatus = "No Uniform Detected";
        currentViolation = "Wearing Civilian / No Match";
      } else if (missingParts.length > 0) {
        currentUniformStatus = "Incomplete";
        const formattedMissing = missingParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
        currentViolation = `Missing: ${formattedMissing}`;
      } else {
        currentUniformStatus = "Complete";
        currentViolation = "None";
      }
    } else {
      currentUniformStatus = "Scanning...";
      currentViolation = "No Objects Detected";
    }
    if (resStatus) resStatus.innerHTML = `<strong>Uniform Status:</strong> ${currentUniformStatus}`;
    if (resViolation) resViolation.innerHTML = `<strong>Violation Type:</strong> ${currentViolation}`;
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    const resized = faceapi.resizeResults(detections, displaySize);

    if (faceMatcher && resized.length > 0) {
      for (const det of resized) {
        const match = faceMatcher.findBestMatch(det.descriptor);
        const color = match.label === "unknown" ? "#f1c40f" : "#2ecc71";
        new faceapi.draw.DrawBox(det.detection.box, { label: match.toString(), boxColor: color }).draw(canvas);
        updateUI(match);
        if (match.label !== "unknown") recordAttendance(match.label, currentUniformStatus, currentViolation);
      }
    } else {
      resetUI(); 
    }
  }, 500);
});
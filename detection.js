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

const ROBOFLOW_API_KEY = "piXsPj0mzK5X2dpeK0gq"; 
const ROBOFLOW_MODEL = "uk-f5s8z/1"; 
const ROBOFLOW_URL = `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_API_KEY}`;

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const resName = document.getElementById("resName");
const resId = document.getElementById("resId");
const resProgram = document.getElementById("resProgram"); 
const resStatus = document.getElementById("resStatus");
const resViolation = document.getElementById("resViolation");
const resMatch = document.getElementById("resMatch");
const resTime = document.getElementById("resTime");
const resDate = document.getElementById("resDate");
const detectionStatus = document.getElementById("detectionStatus");
const countdownOverlay = document.getElementById("countdownOverlay");
const confirmSection = document.getElementById("confirmSection");

let faceMatcher;
let uniformDescriptors = [];
let isReviewing = false; 
let timerActive = false;
let countdownInterval = null;
let lastDetectedData = null; 
const studentInfoMap = {};
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const csitUniform = [
    "BSCS and BSIT polo",
    "BSCS and BSIT pants",
    "College STI lanyard",
    "black shoes"
];

const bacommUniform = [
    "BACOMM blazer",
    "BACOMM blouse",
    "BACOMM pants",
    "BACOMM polo",
    "BACOMM skirt",
    "BACOMM tie",
    "black shoes"
];

const SHSUniform = [
    "SHS blazer",
    "SHS blouse",
    "SHS pants",
    "SHS polo",
    "SHS skirt",
    "SHS tie",
    "SHS vest",
    "black shoes"
];

const programUniformMap = {
    "BSCS": csitUniform,
    "BSIT": csitUniform,
    "BACOMM": bacommUniform,
    "BMMA": bacommUniform,
    "ABM": SHSUniform,
    "HUMSS": SHSUniform,
    "IT-MAWD": SHSUniform,
    "CCT": SHSUniform,
    "TOPER": SHSUniform,
    "CULART": SHSUniform

};  

function detectWrongProgram(detectedParts, program) {
    if (program === "BSCS" || program === "BSIT") {
        return detectedParts.some(p => bacommUniform.includes(p));
    }
    if (program === "BACOMM" || program === "BMMA") {
        return detectedParts.some(p => csitUniform.includes(p));
    }
    return false;
}

function evaluateUniform(detectedParts, program) {
    const required = programUniformMap[program] || [];

    if (detectedParts.length === 0) {
        return { status: "No Uniform", violation: "No uniform detected" };
    }

    if (detectWrongProgram(detectedParts, program)) {
        return { status: "Wrong Program Uniform", violation: "Wrong uniform for program" };
    }

    const missing = required.filter(p => !detectedParts.includes(p));

    if (missing.length === 0) {
        return { status: "Complete Uniform", violation: "None" };
    }

    return {
        status: "Incomplete Uniform",
        violation: `Missing: ${missing.join(", ")}`
    };
} 

let washDays = [];

function loadWashdaysFromLocal() {
    const saved = JSON.parse(localStorage.getItem("washdays") || "[]");
    washDays = saved;
}

function isTodayWashday() {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return washDays.includes(today);
}

loadWashdaysFromLocal();
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
    faceapi.nets.ssdMobilenetv1.loadFromUri("./models")
]).then(async () => {
    console.log("AI Models Loaded");
    uniformDescriptors = await loadUniforms();
    faceMatcher = await loadStudentsFromFirestore();
    startCamera();
});

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error("Camera Error:", err));
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
        } catch (e) { console.error("Error loading student:", data.fullName); }
    }
    return new faceapi.FaceMatcher(labeledDescriptors, 0.4);
}

function playBeep(freq = 600, duration = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = freq; osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

function startCountdown(data) {
    if (timerActive || isReviewing) return;
    timerActive = true;
    let count = 1;
    countdownOverlay.style.display = "block";
    countdownOverlay.textContent = count;
    playBeep(600, 0.2);

    countdownInterval = setInterval(() => {
        count--;
        countdownOverlay.textContent = count;
        playBeep(600, 0.1);
        if (count <= 0) {
            clearInterval(countdownInterval);
            countdownOverlay.style.display = "none";
            playBeep(880, 0.5);
            triggerReview(data);
        }
    }, 1000);
}

function triggerReview(data) {
    isReviewing = true;
    video.pause(); 
    lastDetectedData = data;
    confirmSection.style.display = "flex";
    detectionStatus.textContent = "VERIFY DETAILS & CONFIRM";
    detectionStatus.style.color = "#f1c40f";
}

document.getElementById("btnConfirm").onclick = async () => {
    if (lastDetectedData) {
        const success = await recordAttendance(
            lastDetectedData.name, 
            lastDetectedData.status, 
            lastDetectedData.violation
        );

        if (success) {
            alert("Attendance Recorded!");
            resetSystem();
        } else {
            
            resetSystem();
        }
    }
};

document.getElementById("btnRetake").onclick = () => { resetSystem(); };

function resetSystem() {
    isReviewing = false;
    timerActive = false;
    confirmSection.style.display = "none";
    video.play();
    detectionStatus.textContent = "Scanning...";
    resetUI();
}

video.addEventListener("play", () => {
    const ctx = canvas.getContext("2d");
    setInterval(async () => {
        if (isReviewing) return;

        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = video.clientWidth;
        tempCanvas.height = video.clientHeight;
        tempCanvas.getContext("2d").drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const base64Image = tempCanvas.toDataURL("image/jpeg").split(",")[1];

        const [detections, roboflowRes] = await Promise.all([
            faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors(),
            fetch(ROBOFLOW_URL, { method: "POST", body: base64Image }).then(res => res.json()).catch(() => ({ predictions: [] }))
        ]);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

let currentUniformStatus = "No Uniform";
let currentViolation = "---";
const detectedParts = [];

if (roboflowRes.predictions) {
    roboflowRes.predictions.forEach(async (pred) => {

        if (pred.confidence >= 0.30) {

            detectedParts.push(pred.class);

            const x = pred.x - pred.width / 2;
            const y = pred.y - pred.height / 2;

            ctx.strokeStyle = "#00c6ff"; 
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, pred.width, pred.height);

            ctx.fillStyle = "#00c6ff";
            const text = `${pred.class.toUpperCase()} ${Math.round(pred.confidence * 100)}%`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(x - 1.5, y - 25, textWidth + 10, 25); 

            ctx.fillStyle = "#000000"; 
            ctx.font = "bold 14px Inter, Arial";
            ctx.fillText(text, x + 4, y - 7);

            // ===== CROP UNIFORM AREA =====
            const tempUniform = document.createElement("canvas");
            tempUniform.width = pred.width;
            tempUniform.height = pred.height;

            const uctx = tempUniform.getContext("2d");

            uctx.drawImage(
                video,
                x,
                y,
                pred.width,
                pred.height,
                0,
                0,
                pred.width,
                pred.height
            );

            // ===== EXTRACT DESCRIPTOR =====
            const uniformDetection = await faceapi
                .detectSingleFace(tempUniform)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (uniformDetection) {

                const program = compareUniform(uniformDetection.descriptor);

                console.log("Uniform Match Program:", program);

            }
        }
    });


let program = null;

if (faceMatcher && detections.length > 0) {
    const match = faceMatcher.findBestMatch(detections[0].descriptor);
    const student = studentInfoMap[match.label];
    program = student?.course;
}

if (isTodayWashday()) {

    const hasLanyard = detectedParts.includes("College STI lanyard");

    if (hasLanyard) {
        currentUniformStatus = "Washday Allowed";
        currentViolation = "None";
    } else {
        currentUniformStatus = "No Lanyard";
        currentViolation = "Lanyard Required (Washday)";
    }

} else {

    const result = evaluateUniform(detectedParts, program);
    currentUniformStatus = result.status;
    currentViolation = result.violation;

}}

        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        const resized = faceapi.resizeResults(detections, displaySize);

        if (faceMatcher && resized.length > 0) {
            const match = faceMatcher.findBestMatch(resized[0].descriptor);
            const boxColor = match.label === "unknown" ? "#f1c40f" : "#2ecc71";
            new faceapi.draw.DrawBox(resized[0].detection.box, { label: match.toString(), boxColor }).draw(canvas);

            updateUI(match, currentUniformStatus, currentViolation);

            if (match.label !== "unknown") {
                startCountdown({ name: match.label, status: currentUniformStatus, violation: currentViolation });
            } else {
                stopCountdown();
            }
        } else {
            stopCountdown();
            resetUI();
        }
    }, 1000);
});

function stopCountdown() {
    clearInterval(countdownInterval);
    timerActive = false;
    if(countdownOverlay) countdownOverlay.style.display = "none";
}
async function loadUniforms() {

    const snapshot = await getDocs(collection(db, "uniforms"));

    const uniforms = [];

    snapshot.forEach(doc => {

        const data = doc.data();

        uniforms.push({
            program: data.program,
            descriptor: new Float32Array(data.descriptor)
        });

    });

    return uniforms;
}

function compareUniform(desc) {

 let bestMatch = null;
 let bestDistance = 1;

 uniformDescriptors.forEach(u => {

   const distance = faceapi.euclideanDistance(desc, u.descriptor);

   if(distance < bestDistance){
      bestDistance = distance;
      bestMatch = u.program;
   }

 });

 if(bestDistance < 0.45){
    return bestMatch;
 }

 return "Unknown";
}

function updateUI(match, status, violation) {
    const student = studentInfoMap[match.label];
    const now = new Date();

    resName.innerHTML = `<strong>Student Name:</strong> ${match.label}`;
    resId.innerHTML = `<strong>Student ID:</strong> ${student?.studentId || "---"}`;
    

    const progStr = student ? `${student.course} - ${student.yearLevel}` : "---";
    if (resProgram) resProgram.innerHTML = `<strong>Program / Year:</strong> ${progStr}`;

    resStatus.innerHTML = `<strong>Uniform Status:</strong> ${status}`;
    resViolation.innerHTML = `<strong>Violation Type:</strong> ${violation}`;
    resMatch.textContent = `${Math.round((1 - match.distance) * 100)}%`;
    resTime.textContent = now.toLocaleTimeString();
    if (resDate) resDate.textContent = now.toLocaleDateString();
}

function resetUI() {
    resName.innerHTML = `<strong>Student Name:</strong> Unknown`;
    resId.innerHTML = `<strong>Student ID:</strong> ---`;
    if (resProgram) resProgram.innerHTML = `<strong>Program / Year:</strong> ---`;
    resStatus.innerHTML = `<strong>Uniform Status:</strong> Scanning...`;
}

async function recordAttendance(name, status, violation) {
    const student = studentInfoMap[name];
    const now = new Date();
    const dateString = now.toLocaleDateString(); 


    const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", student?.studentId),
        where("dateString", "==", dateString)
    );
    
    const querySnapshot = await getDocs(attendanceQuery);

    if (!querySnapshot.empty) {
        alert("You have already submitted your attendance today.");
        return false; 
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tCtx = tempCanvas.getContext("2d");

    tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    const proofImage = tempCanvas.toDataURL("image/jpeg", 0.5);

    await addDoc(collection(db, "attendance"), {
        studentName: name,
        studentId: student?.studentId || "N/A",
        programLevel: student ? `${student.course} - ${student.yearLevel}` : "Unknown",
        timestamp: serverTimestamp(),
        dateString: dateString,
        timeString: now.toLocaleTimeString(),
        status: status,
        violationType: violation,
        capturedImage: proofImage  
    });
return true;
} 

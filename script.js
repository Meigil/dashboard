import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const video = document.getElementById('video');
let faceMatcher;

const studentInfoMap = {};
let totalStudents = 0;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('./models')
]).then(async () => {
  console.log("AI Models Ready");
  faceMatcher = await loadLabeledImagesFromFirestore();
  startVideo();
});

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error("Camera Error:", err));
}

async function loadLabeledImagesFromFirestore() {
  const querySnapshot = await getDocs(collection(db, "students"));
  const labeledDescriptors = [];

  querySnapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    studentInfoMap[data.fullName] = data;
    totalStudents++;
  });

  document.getElementById('totalScanned').innerText = totalStudents;

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    try {
      const img = await faceapi.fetchImage(data.imageBase64);
      const detection = await faceapi.detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(data.fullName, [detection.descriptor])
        );
      }
    } catch (e) { console.error("Error loading:", data.fullName); }
  }

  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}

video.addEventListener('play', () => {
  const canvas = document.getElementById('overlay');
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resized = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (faceMatcher && resized.length > 0) {
      const results = resized.map(d => faceMatcher.findBestMatch(d.descriptor));

      results.forEach((result, i) => {
        const box = resized[i].detection.box;
        new faceapi.draw.DrawBox(box, { label: result.toString() }).draw(canvas);

        if (result.label !== "unknown") {
          const student = studentInfoMap[result.label];

          document.getElementById('resName').innerHTML = `<strong>Student Name:</strong> ${result.label}`;
          document.getElementById('resId').innerHTML = `<strong>Student ID:</strong> ${student?.studentId || '---'}`;
          document.getElementById('resStatus').innerHTML = `<strong>Uniform Status:</strong> ${student?.uniformStatus || '---'}`;
          document.getElementById('resViolation').innerHTML = `<strong>Violation Type:</strong> ${student?.violationType || '---'}`;
          document.getElementById('resMatch').innerHTML = `<strong>Face Match:</strong> ${Math.round((1-result.distance)*100)}%`;
          document.getElementById('resTime').innerText = new Date().toLocaleTimeString();

          document.getElementById('latestName').innerHTML = `<strong>Student:</strong> ${result.label}`;
          document.getElementById('latestId').innerHTML = `<strong>Student ID:</strong> ${student?.studentId || '---'}`;
          document.getElementById('latestUniform').innerHTML = `<strong>Uniform Status:</strong> ${student?.uniformStatus || '---'}`;
          document.getElementById('latestViolation').innerHTML = `<strong>Violation Type:</strong> ${student?.violationType || '---'}`;
          document.getElementById('latestTime').innerText = new Date().toLocaleTimeString();

          document.getElementById('detectionStatus').innerText = "Identified";
          document.getElementById('detectionStatus').style.color = "#2ecc71";

        } else {
          document.getElementById('resName').innerHTML = `<strong>Student Name:</strong> Unknown`;
          document.getElementById('resId').innerHTML = `<strong>Student ID:</strong> ---`;
          document.getElementById('resStatus').innerHTML = `<strong>Uniform Status:</strong> ---`;
          document.getElementById('resViolation').innerHTML = `<strong>Violation Type:</strong> ---`;
          document.getElementById('resMatch').innerHTML = `<strong>Face Match:</strong> Low`;
          document.getElementById('detectionStatus').innerText = "Unknown Face";
          document.getElementById('detectionStatus').style.color = "#f1c40f";
        }
      });
    } else {
      document.getElementById('detectionStatus').innerText = "Scanning...";
      document.getElementById('detectionStatus').style.color = "#ff4b5c";
    }
  }, 200);
});


new Chart(document.getElementById('complianceChart'), {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Proper Uniform',
        data: [220, 240, 260, 280, 300],
        borderWidth: 3,
        tension: 0.4
      },
      {
        label: 'Violations',
        data: [45, 38, 30, 25, 20],
        borderWidth: 3,
        tension: 0.4
      }
    ]
  }
});


new Chart(document.getElementById('violationChart'), {
  type: 'bar',
  data: {
    labels: [
      'Incomplete Uniform',
      'No ID ',
      'Jacket / Hoodie',
      'Wrong Uniform'
    ],
    datasets: [{
      label: 'Number of Violations',
      data: [60, 35, 25, 17]
    }]
  }
});


new Chart(document.getElementById('attendanceChart'), {
  type: 'bar',
  data: {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    datasets: [
      {
        label: 'Attendance',
        data: [320, 330, 340, 350, 360]
      },
      {
        label: 'Violations',
        data: [45, 38, 30, 25, 20]
      }
    ]
  }
});


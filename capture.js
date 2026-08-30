
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
        Swal.fire({
          icon: "error",
          title: "Unauthorized",
          text: "Your account role is not authorized.",
          confirmButtonColor: "#003A8F"
        }).then(() => {
          window.location.href = "login.html";
        });
        return;
      }

      renderSidebar(userRole);

    } else {
      console.error("User record not found.");

      Swal.fire({
        icon: "error",
        title: "Unauthorized",
        text: "Your account record was not found.",
        confirmButtonColor: "#003A8F"
      }).then(() => {
        window.location.href = "login.html";
      });
    }

  } catch (error) {
    console.error("Error fetching user role:", error);
    window.location.href = "login.html";
  }
});

// DOM Elements
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("imagePreview");
  const uploadInput = document.getElementById("uploadImage");

const csvFileInput = document.getElementById("csvFile");
const imageFolderInput = document.getElementById("imageFolder");
const startBulkBtn = document.getElementById("startBulkBtn");
const bulkStatus = document.getElementById("bulkStatus");
const csvList = document.getElementById("csvList");
const imageList = document.getElementById("imageList");

const frame = document.querySelector(".shoulder-frame");
const status = document.getElementById("captureStatus");

let currentImages = [];


async function startCamera() {
  try {
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });

    video.srcObject = stream;
    detectFace();

  } catch (err) {
    console.error("Camera Error:", err);
  }
}

async function detectFace() {
  setInterval(async () => {
    const detection = await faceapi.detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions()
    );

    if (detection) {
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
        faceCenterX > ovalCenterX - ovalWidth / 2 &&
        faceCenterX < ovalCenterX + ovalWidth / 2 &&
        faceCenterY > ovalCenterY - ovalHeight / 2 &&
        faceCenterY < ovalCenterY + ovalHeight / 2;

      if (insideOval) {
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

window.captureImage = function () {
  if (!frame.classList.contains("face-ready")) {
    Swal.fire({
      icon: "warning",
      title: "Face Alignment Required",
      text: "Please position your face properly inside the frame before capturing.",
      confirmButtonColor: "#003A8F"
    });
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  canvas.getContext("2d").drawImage(video, 0, 0);

  const imageData = canvas.toDataURL("image/jpeg", 0.6);

  imagePreview.innerHTML = `
    <img src="${imageData}" width="100%" style="border-radius:10px;">
  `;

  status.innerText = "Image captured successfully";

  Swal.fire({
    icon: "success",
    title: "Captured!",
    text: "Image captured successfully.",
    timer: 1500,
    showConfirmButton: false
  });
};


uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    imagePreview.innerHTML = `
      <img src="${reader.result}" width="100%" style="border-radius:10px;">
    `;

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

async function checkSimilarFace(imageData) {
  try {
    const img = await faceapi.fetchImage(imageData);

    const detection = await faceapi
      .detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        detected: false,
        matches: []
      };
    }

    const newDescriptor = detection.descriptor;

    const snapshot = await getDocs(collection(db, "students"));
    const matches = [];

    for (const studentDoc of snapshot.docs) {
      const student = studentDoc.data();

      if (!student.imageBase64) continue;

      try {
        const existingImg = await faceapi.fetchImage(
          student.imageBase64
        );

        const existingDetection = await faceapi
          .detectSingleFace(
            existingImg,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!existingDetection) continue;

        const distance = faceapi.euclideanDistance(
          newDescriptor,
          existingDetection.descriptor
        );

        if (distance < 0.40) {
          matches.push({
            studentId: student.studentId,
            fullName: student.fullName || "Unknown Student",
            distance
          });
        }

      } catch (error) {
        console.error(
          `Face comparison failed for ${student.studentId}:`,
          error
        );
      }
    }

    matches.sort((a, b) => a.distance - b.distance);

    return {
      detected: true,
      matches
    };

  } catch (error) {
    console.error("Face similarity check failed:", error);

    return {
      detected: false,
      matches: []
    };
  }
}


window.saveStudent = async function () {
  const studentId = document.getElementById("studentId").value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const middleName = document.getElementById("middleName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const suffix = document.getElementById("suffix").value.trim();

  const fullName = [
    firstName,
    middleName,
    lastName,
    suffix
  ].filter(Boolean).join(" ");

  const course = document.getElementById("course").value;
  const yearLevel = document.getElementById("yearLevel").value;

  if (
    !studentId ||
    !fullName ||
    !course ||
    !yearLevel ||
    canvas.width === 0
  ) {
    Swal.fire({
      icon: "error",
      title: "Incomplete Details",
      text: "Please complete all fields and capture or upload an image.",
      confirmButtonColor: "#003A8F"
    });
    return;
  }

  const imageData = canvas.toDataURL("image/jpeg", 0.6);

  try {

    const studentRef = doc(db, "students", studentId);
    const existingStudent = await getDoc(studentRef);

    if (existingStudent.exists()) {
      Swal.fire({
        icon: "warning",
        title: "Student Already Exists",
        text: `Student ID ${studentId} is already enrolled.`,
        confirmButtonColor: "#003A8F"
      });
      return;
    }
    const faceCheck = await checkSimilarFace(imageData);

if (!faceCheck.detected) {
  Swal.fire({
    icon: "warning",
    title: "Face Not Detected",
    text: "No recognizable face was detected in the image. Please use a clear front-facing photo.",
    confirmButtonColor: "#003A8F"
  });
  return;
}

if (faceCheck.matches.length > 0) {
  const similarStudents = faceCheck.matches
    .slice(0, 5)
    .map(
      student =>
        `<li><b>${student.studentId}</b> — ${student.fullName}</li>`
    )
    .join("");

  const result = await Swal.fire({
    icon: "warning",
    title: "Similar Face Detected",
    html: `
      <p>
        This face appears similar to an existing student.
      </p>

      <div style="
        text-align:left;
        max-height:180px;
        overflow-y:auto;
        background:#f8f9fa;
        padding:12px;
        border-radius:8px;
        margin-top:10px;
      ">
        <b>Possible Match:</b>
        <ul style="padding-left:20px;">
          ${similarStudents}
        </ul>
      </div>

      <p style="margin-top:12px;font-size:13px;color:#666;">
        Please verify the student's identity before continuing.
      </p>
    `,
    showCancelButton: true,
    confirmButtonText: "Continue Enrollment",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#003A8F",
    cancelButtonColor: "#6c757d"
  });

  if (!result.isConfirmed) {
    return;
  }
}


    await setDoc(studentRef, {
      studentId,
      firstName,
      middleName,
      lastName,
      suffix,
      fullName,
      course,
      yearLevel,
      imageBase64: imageData,
      createdAt: serverTimestamp()
    });

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: "Student Profile Saved Successfully!",
      confirmButtonColor: "#003A8F"
    }).then(() => {
      location.reload();
    });

  } catch (err) {
    console.error("Error saving student:", err);

    Swal.fire({
      icon: "error",
      title: "Error Saving",
      text: err.message,
      confirmButtonColor: "#003A8F"
    });
  }
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " b";
  return (bytes / 1024).toFixed(1) + " kb";
}


csvFileInput.addEventListener("change", renderCSV);

window.removeCSV = () => {
  csvFileInput.value = "";
  csvList.innerHTML = "";
};

function renderCSV() {
  csvList.innerHTML = "";

  if (csvFileInput.files[0]) {
    const file = csvFileInput.files[0];

    csvList.innerHTML = `
      <div class="file-item">
        <span>${file.name}</span>
        <span onclick="removeCSV()" style="cursor:pointer;">✕</span>
      </div>
    `;
  }
}

imageFolderInput.addEventListener("change", function () {
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

    div.innerHTML = `
      <span>${file.name}</span>
      <span onclick="removeImage(${index})" style="cursor:pointer;">✕</span>
    `;

    imageList.appendChild(div);
  });

  bulkStatus.innerText = `${currentImages.length} images selected.`;
}


startBulkBtn.addEventListener("click", () => {
  if (!csvFileInput.files[0] || currentImages.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Missing Files",
      text: "Please select both CSV File and Student Photos!",
      confirmButtonColor: "#003A8F"
    });
    return;
  }

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
      let skipped = 0;

      const existingStudents = [];
      const missingPhotos = [];
const similarFaces = [];
const noFaceDetected = [];

      loadingArea.style.display = "flex";
      spinner.style.display = "block";

      statusText.innerText = "Preparing upload...";

      for (const [i, s] of students.entries()) {
        const sId = s.StudentId?.trim();

        const currentNum = i + 1;

        statusText.innerText =
          `Uploading: ${currentNum} out of ${total}`;

        if (!sId) continue;


        const photo = currentImages.find(
          f => f.name.split(".")[0] === sId
        );

        if (!photo) {
          missingPhotos.push(sId);
          continue;
        }

        try {
          const studentRef = doc(db, "students", sId);


          const existingStudent = await getDoc(studentRef);

          if (existingStudent.exists()) {
            skipped++;
            existingStudents.push(sId);
            continue;
          }

          const base64 = await convertToBase64(photo);

const faceCheck = await checkSimilarFace(base64);

if (!faceCheck.detected) {
  noFaceDetected.push(sId);
  continue;
}

if (faceCheck.matches.length > 0) {
  similarFaces.push({
    studentId: sId,
    fullName: `${s.firstName || ""} ${s.middleName || ""} ${s.lastName || ""} ${s.suffix || ""}`.trim(),
    matches: faceCheck.matches.slice(0, 5)
  });
  continue;
}

await setDoc(studentRef, {
  studentId: sId,
  firstName: s.firstName || "",
  middleName: s.middleName || "",
  lastName: s.lastName || "",
  suffix: s.suffix || "",
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

      spinner.style.display = "none";

      statusText.innerText =
        `Done! Saved ${success} | Existing ${skipped}`;

      let existingList = "";

      if (existingStudents.length > 0) {
        existingList = `
          <div style="
            margin-top:15px;
            max-height:180px;
            overflow-y:auto;
            text-align:left;
            background:#f8f9fa;
            padding:12px;
            border-radius:8px;
          ">
            <b>Existing Student IDs:</b>

            <ul style="
              margin-top:8px;
              padding-left:20px;
            ">
              ${existingStudents
                .map(id => `<li>${id}</li>`)
                .join("")}
            </ul>
          </div>
        `;
      }

   
      let missingList = "";

      if (missingPhotos.length > 0) {
        missingList = `
          <div style="
            margin-top:15px;
            max-height:150px;
            overflow-y:auto;
            text-align:left;
            background:#fff8e1;
            padding:12px;
            border-radius:8px;
          ">
            <b>Missing Photos:</b>

            <ul style="
              margin-top:8px;
              padding-left:20px;
            ">
              ${missingPhotos
                .map(id => `<li>${id}</li>`)
                .join("")}
            </ul>
          </div>
        `;
      }
let similarList = "";

if (similarFaces.length > 0) {
  similarList = `
    <div style="
      margin-top:15px;
      max-height:220px;
      overflow-y:auto;
      text-align:left;
      background:#fff3cd;
      padding:12px;
      border-radius:8px;
    ">
      <b>Similar Face Detected:</b>

      <ul style="
        margin-top:8px;
        padding-left:20px;
      ">
        ${similarFaces.map(student => `
          <li style="margin-bottom:10px;">
            <b>${student.studentId}</b> — ${student.fullName}
            <br>
            <span style="font-size:13px;color:#666;">
              Possible match:
              ${student.matches.map(match =>
                `${match.studentId} — ${match.fullName}`
              ).join("<br>")}
            </span>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

let noFaceList = "";

if (noFaceDetected.length > 0) {
  noFaceList = `
    <div style="
      margin-top:15px;
      max-height:150px;
      overflow-y:auto;
      text-align:left;
      background:#f8d7da;
      padding:12px;
      border-radius:8px;
    ">
      <b>Face Not Detected:</b>

      <ul style="
        margin-top:8px;
        padding-left:20px;
      ">
        ${noFaceDetected.map(id => `<li>${id}</li>`).join("")}
      </ul>
    </div>
  `;
}

if (
  existingStudents.length > 0 ||
  missingPhotos.length > 0 ||
  similarFaces.length > 0 ||
  noFaceDetected.length > 0
) {

  Swal.fire({
    icon: "warning",
    title: "Batch Enrollment Complete",

    html: `
      <div style="text-align:left;">

        <p>
          <b>${success}</b> new students enrolled.
        </p>

        <p>
          <b>${skipped}</b> existing students were skipped.
        </p>

        ${existingList}

        ${missingList}

        ${similarList}

        ${noFaceList}

      </div>
    `,

    confirmButtonColor: "#003A8F",
    width: "550px"
  });

}else {


        Swal.fire({
          icon: "success",
          title: "Batch Enrollment Complete!",
          text: `Successfully enrolled ${success} students.`,
          confirmButtonColor: "#003A8F"
        });
      }

      setTimeout(() => {
        loadingArea.style.display = "none";
      }, 5000);
    }
  });
});


function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

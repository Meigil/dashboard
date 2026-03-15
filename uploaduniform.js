import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_KEY",
    authDomain: "thesissystem-921ef.firebaseapp.com",
    projectId: "thesissystem-921ef",
    storageBucket: "thesissystem-921ef.appspot.com",
    messagingSenderId: "62118219774",
    appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const programSelect = document.getElementById('programSelect');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const mainPreview = document.getElementById('mainPreview');
const saveBtn = document.getElementById('saveBtn');
const selectedTitle = document.getElementById('selectedTitle');
const infoBox = document.getElementById('infoBox');

let currentDescriptor = null;

await faceapi.nets.ssdMobilenetv1.loadFromUri("./models");
await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
await faceapi.nets.faceRecognitionNet.loadFromUri("./models");

programSelect.addEventListener('change', async () => {

    const program = programSelect.value;
    selectedTitle.textContent = program || "None";

    if (!program) return;

    const docRef = doc(db, "uniforms", program);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        mainPreview.src = docSnap.data().imageBase64;
    }
});

dropZone.onclick = () => fileInput.click();

fileInput.addEventListener('change', async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {

        const img = new Image();
        img.src = event.target.result;

        img.onload = async () => {

            mainPreview.src = img.src;

            const detection = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                alert("Unable to extract features. Try another image.");
                return;
            }

            currentDescriptor = Array.from(detection.descriptor);

            console.log("Uniform descriptor generated");
        };
    };

    reader.readAsDataURL(file);
});

saveBtn.addEventListener('click', async () => {

    const program = programSelect.value;
    const imageData = mainPreview.src;

    if (!program) {
        alert("Select program");
        return;
    }

    if (!currentDescriptor) {
        alert("Upload uniform image first.");
        return;
    }

    saveBtn.disabled = true;

    await setDoc(doc(db, "uniforms", program), {

        program: program,
        imageBase64: imageData,
        descriptor: currentDescriptor,
        lastUpdated: new Date().toLocaleString()

    });

    infoBox.style.display = "block";

    setTimeout(() => {
        infoBox.style.display = "none";
    }, 3000);

    saveBtn.disabled = false;

});
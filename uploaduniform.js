import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const programSelect = document.getElementById('programSelect');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const mainPreview = document.getElementById('mainPreview');
const saveBtn = document.getElementById('saveBtn');
const selectedTitle = document.getElementById('selectedTitle');
const infoBox = document.getElementById('infoBox');

programSelect.addEventListener('change', async () => {
    const program = programSelect.value;
    selectedTitle.textContent = program || "None";
    
    if (!program) {
        mainPreview.src = "https://via.placeholder.com/1000x800/0f172a/334155?text=No+Photo+Selected";
        return;
    }

    mainPreview.src = "https://via.placeholder.com/1000x800/0f172a/334155?text=Searching+Database...";

    try {
        const docRef = doc(db, "uniforms", program); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            mainPreview.src = docSnap.data().imageBase64;
        } else {
            mainPreview.src = "https://via.placeholder.com/1000x800/0f172a/334155?text=No+Photo+Stored+Yet";
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
});
dropZone.onclick = () => fileInput.click();

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 1000; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                mainPreview.src = dataUrl;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

saveBtn.addEventListener('click', async () => {
    const program = programSelect.value;
    const imageData = mainPreview.src;

    if (!program) return alert("Please select an Academic Program first.");
    if (imageData.includes("placeholder.com") || imageData.includes("Searching")) {
        return alert("Please upload a valid photo before saving.");
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving to Database...";
        await setDoc(doc(db, "uniforms", program), {
            program: program,
            imageBase64: imageData,
            lastUpdated: new Date().toLocaleString()
        });

        infoBox.style.display = 'block';
        setTimeout(() => { infoBox.style.display = 'none'; }, 3000);

    } catch (err) {
        alert("System Error: " + err.message);
        console.error(err);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Photo";
    }
});
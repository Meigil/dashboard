import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const uniformCards = document.getElementById("uniformCards");
const programFilter = document.getElementById("programFilter");


async function loadUniforms() {
  uniformCards.innerHTML = "";
  const snapshot = await getDocs(collection(db, "uniforms"));
  snapshot.forEach(doc => {
    const data = doc.data();
    const program = data.program || "Unknown";

    const card = document.createElement("div");
    card.classList.add("card", "green");
    card.dataset.program = program;

    card.innerHTML = `
      <h3>${program}</h3>
      <img src="${data.imageBase64}" alt="${program} uniform" style="width:100%; border-radius:10px;">
    `;

    uniformCards.appendChild(card);
  });
}

programFilter.addEventListener("change", () => {
  const selected = programFilter.value;
  document.querySelectorAll("#uniformCards .card").forEach(card => {
    if (!selected || card.dataset.program === selected) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
});

loadUniforms();

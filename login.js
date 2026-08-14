import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getAuth, 
  OAuthProvider, 
  signInWithPopup, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmVP7R5XnvqobdxiRv-LpHswhCCVRggX4",
  authDomain: "thesissystem-921ef.firebaseapp.com",
  projectId: "thesissystem-921ef",
  storageBucket: "thesissystem-921ef.firebasestorage.app",
  messagingSenderId: "62118219774",
  appId: "1:62118219774:web:1b58fcbf0f4e4d0f87faaf",

};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function handleMicrosoftLogin() {
  console.log("Starting Microsoft login..."); 
  showError("Connecting to Microsoft...");

  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({
    prompt: 'select_account',
    tenant: 'organizations'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email ? user.email.toLowerCase() : "";

    if (!email.endsWith("@dasmarinas.sti.edu.ph")) {
      await signOut(auth);
      showError("Only STI College Dasmariñas accounts are allowed.");
      return;
    }

    const userDocRef = doc(db, "users", email);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.role === "admin") {
        window.location.href = "index.html";
      } else if (userData.role === "guidance") {
        window.location.href = "guidance.html";
      } else {
        await signOut(auth);
        showError("Your account role is not authorized for UNISCAN.");
      }
    } else {
      await signOut(auth);
      showError("Your account is not registered in the system.");
    }

  } catch (error) {
    console.error("Full Login Error:", error);
    if (error.code) {
      showError(`[${error.code}] ${error.message}`);
    } else {
      showError(`Login error: ${error.message}`);
    }
  }
}

function showError(message) {
  const errElement = document.getElementById("error-msg");
  if (errElement) errElement.textContent = message;
}


document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("btn-microsoft");
  if (loginBtn) {
    loginBtn.addEventListener("click", handleMicrosoftLogin);
  }
});
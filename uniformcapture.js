
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const uploadInput = document.getElementById("uploadImage");
const programSelect = document.getElementById("program");

let baseImage = new Image();

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("Camera error:", err));

window.captureUniform = function() {
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  overlay.getContext("2d").drawImage(video, 0, 0);
  const img = overlay.toDataURL("image/jpeg", 0.8);
  baseImage.src = img;
  alert("Captured! Click 'Next' to label.");
};

window.goToLabel = function() {
  const program = programSelect.value;
  const file = uploadInput.files[0];

  if (!program) return alert("Select a program first!");
  
  if (!file && !baseImage.src) return alert("Capture or upload an image first!");
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("uniformImage", reader.result);
      sessionStorage.setItem("uniformProgram", program);
      window.location.href = "label-uniform.html";
    };
    reader.readAsDataURL(file);
  } else {
    sessionStorage.setItem("uniformImage", baseImage.src);
    sessionStorage.setItem("uniformProgram", program);
    window.location.href = "label-uniform.html";
  }
};

function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const errorMsg = document.getElementById("error-msg");

  
  if (username === "admin" && password === "admin123" && role === "admin") {
    window.location.href = "index.html";
  }
  else if (username === "guidance" && password === "guid123" && role === "guidance") {
    window.location.href = "index.html";
  }
  else {
    errorMsg.textContent = "Invalid login credentials.";
  }
}

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests, base64

app = Flask(__name__)
CORS(app)  

ROBOFLOW_API_KEY = "32Js5Nadtxn763aUKKd6"
PROJECT_ID = "find-shoes-pants-and-shirts"  

@app.route("/upload", methods=["POST"])
def upload():
    try:
        data = request.json
        image_b64 = data["image"].split(",")[1]  
        img_bytes = base64.b64decode(image_b64)
        labels = data.get("labels", [])
        url = f"https://api.roboflow.com/dataset/{PROJECT_ID}/upload"
        files = {"file": ("uniform.jpg", img_bytes)}
        params = {
            "api_key": ROBOFLOW_API_KEY,
            "split": "train",           
            "annotations": str(labels)  
        }

        r = requests.post(url, files=files, params=params)
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)

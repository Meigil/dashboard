from flask import Flask, jsonify, request
import torch
from PIL import Image
import io
app = Flask(__name__)

model = torch.hub.load("ultralytics/yolov5", "custom", path="C:/Users/dcdel/OneDrive/Desktop/yolo/uniforms/runs/detect/train/weights/best.pt")

@app.route("/predict", methods=["POST"])
def predict():
    image_file = request.files["image"]
    img_bytes = image_file.read()
    img = Image.open(io.BytesIO(img_bytes))
    results = model(img)
    predictions = results.pandas().xywh[0].to_dict(orient="records")
    return jsonify(predictions)

if __name__ == "__main__":
    app.run(debug=True)
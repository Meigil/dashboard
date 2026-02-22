import torch
model_path = "C:/Users/dcdel/OneDrive/Desktop/yolo/uniforms/runs/detect/train/weights/best.pt"
try:
    model = torch.hub.load("ultralytics/yolov5", "custom", path=model_path, force_reload=True)
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
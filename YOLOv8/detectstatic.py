from ultralytics import YOLO
import cv2
import sys
import numpy as np
import cloudinary
from cloudinary.uploader import upload

cloudinary.config(
    cloud_name= 'dlogct9ex',
    api_key= '744349133114636',
    api_secret= 'z7dnO2LVYOlEHgAWO6Z3CMubbqk'
)

model = YOLO("runs/detect/train4/weights/best.pt")

def detect_objects():
    image_data = sys.stdin.buffer.read()

    image_np = np.frombuffer(image_data, dtype=np.uint8)
    img = cv2.imdecode(image_np, cv2.IMREAD_COLOR)

    results = model(img)
    num_objects = 0

    for r in results:
        boxes = r.boxes
        num_objects += len(boxes)

        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)  # convert to int values

            cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)

    _, processed_image_data = cv2.imencode('.jpg', img)
    processed_image_bytes = processed_image_data.tobytes()

    result = upload(processed_image_bytes, resource_type="image")
    imageUrl = result['secure_url']

    print(f"Number of detected objects: {num_objects}")
    print(f"Cloudinary Image URL: {imageUrl}")

if __name__ == "__main__":
    detect_objects()

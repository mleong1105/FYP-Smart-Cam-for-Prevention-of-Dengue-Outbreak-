from ultralytics import YOLO
import cv2
import sys
import numpy as np

# model
model = YOLO("runs/detect/train4/weights/best.pt")

def detect_objects():
    # Read the image data from stdin
    image_data = sys.stdin.buffer.read()

    # Convert the image data to a NumPy array
    image_np = np.frombuffer(image_data, dtype=np.uint8)
    img = cv2.imdecode(image_np, cv2.IMREAD_COLOR)

    # Perform object detection on the loaded image
    results = model(img)

    # coordinates
    for r in results:
        boxes = r.boxes

        for box in boxes:
            # bounding box
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)  # convert to int values

            # put box in image
            cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)

    # Convert the processed image back to bytes
    _, processed_image_data = cv2.imencode('.jpg', img)
    processed_image_bytes = processed_image_data.tobytes()

    # Write the processed image data to stdout
    sys.stdout.buffer.write(processed_image_bytes)

if __name__ == "__main__":
    detect_objects()
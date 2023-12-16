from ultralytics import YOLO
import math 
import cv2
import os

# Path to the image file you want to detect objects in
folder_path = "captured_images"

# model
model = YOLO("runs/detect/train4/weights/best.pt")

# object classes
classNames = ["Waste container", "Flowerpot", "Tire"]

for filename in os.listdir(folder_path):
    if filename.endswith(('.jpg', '.jpeg', '.png')):  # Check if the file is an image
        # Path to the image file
        image_path = os.path.join(folder_path, filename)

        # Load the image
        img = cv2.imread(image_path)

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

                # confidence
                confidence = math.ceil((box.conf[0]*100))/100
                print("Confidence --->", confidence)

                # class name
                cls = int(box.cls[0])
                print("Class name -->", classNames[cls])

                # object details
                org = [x1, y1]
                font = cv2.FONT_HERSHEY_SIMPLEX
                fontScale = 1
                color = (255, 0, 0)
                thickness = 2

                cv2.putText(img, f"{classNames[cls]} {confidence}", org, font, fontScale, color, thickness)

        # Save the image with bounding boxes and notations
        output_directory = "captured_images"
        os.makedirs(output_directory, exist_ok=True)

        output_path = os.path.join(output_directory, f"detected_{os.path.basename(image_path)}")
        cv2.imwrite(output_path, img)
        print(f"Image with bounding boxes saved: {output_path}")

# Display the image with bounding boxes and notations
cv2.imshow('Detected Image', img)
cv2.waitKey(0)
cv2.destroyAllWindows()

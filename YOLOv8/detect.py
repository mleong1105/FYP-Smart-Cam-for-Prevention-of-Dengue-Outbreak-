from ultralytics import YOLO
import math 
import cv2
import os

# start webcam
cap = cv2.VideoCapture(0)
cap.set(3, 640)
cap.set(4, 480)

output_directory = "captured_images"
os.makedirs(output_directory, exist_ok=True)

# model
model = YOLO("runs/detect/train4/weights/best.pt")

# object classes
classNames = ["Waste container", "Flowerpot", "Tire"]

while True:
    success, img = cap.read()
    results = model(img, stream=True)

    object_detected = False

    # coordinates
    for r in results:
        boxes = r.boxes

        for box in boxes:
            # bounding box
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2) # convert to int values

            # put box in cam
            cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)

            # confidence
            confidence = math.ceil((box.conf[0]*100))/100
            print("Confidence --->",confidence)

            # class name
            cls = int(box.cls[0])
            print("Class name -->", classNames[cls])

            # object details
            org = [x1, y1]
            font = cv2.FONT_HERSHEY_SIMPLEX
            fontScale = 1
            color = (255, 0, 0)
            thickness = 2

            cv2.putText(img, classNames[cls], org, font, fontScale, color, thickness)

            object_detected = True

    cv2.imshow('Webcam', img)

    key = cv2.waitKey(1)
    if key == ord('c'):
        if object_detected:
            # Save the captured image with bounding box and notation
            filename = os.path.join(output_directory, f"captured_{cls}_{confidence:.2f}.jpg")
            cv2.imwrite(filename, img)
            print(f"Image captured: {filename}")
        else:
            print("No object detected to capture.")

    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
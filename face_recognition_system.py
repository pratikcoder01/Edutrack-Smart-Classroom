import cv2
import face_recognition
import numpy as np
import os
from datetime import datetime
from firebase_config import db, firestore

# ========================================== #
# 2. SESSION CONFIGURATION                   #
# ========================================== #
CLASSROOM_ID = "ROOM_304" # Must match a document in 'live_class_status'
CURRENT_SUBJECT = "Artificial Intelligence"
DATASET_PATH = "dataset"  # Folder containing student images

# In-memory cache to prevent duplicate database writes in one session
# Structure: {"CS2024001": True}
marked_attendance_session = set() 
student_name_cache = {}

# ========================================== #
# 3. HELPER FUNCTIONS                        #
# ========================================== #
def load_known_faces(dataset_path):
    """
    Loads images from the dataset folder.
    Expects filenames to be the roll number (e.g., CS2024001.jpg).
    """
    known_face_encodings = []
    known_face_roll_numbers = []

    if not os.path.exists(dataset_path):
        print(f"❌ Dataset folder '{dataset_path}' not found. Please create it and add images.")
        return known_face_encodings, known_face_roll_numbers

    for filename in os.listdir(dataset_path):
        if filename.endswith((".jpg", ".jpeg", ".png")):
            filepath = os.path.join(dataset_path, filename)
            
            # Extract roll number from filename (e.g., "CS2024001.jpg" -> "CS2024001")
            roll_number = os.path.splitext(filename)[0]
            
            # Load and encode face
            image = face_recognition.load_image_file(filepath)
            
            # Find encodings in the image. We assume there's at least 1 face.
            encodings = face_recognition.face_encodings(image)
            if encodings:
                known_face_encodings.append(encodings[0])
                known_face_roll_numbers.append(roll_number)
                print(f"Loaded: {roll_number}")
            else:
                print(f"⚠️ No face found in {filename}")

    return known_face_encodings, known_face_roll_numbers

def get_student_name(roll_number):
    """
    Fetches the student's name from Firestore and caches it locally.
    """
    if roll_number in student_name_cache:
        return student_name_cache[roll_number]

    # Fetch from Firestore
    doc_ref = db.collection("students").document(roll_number)
    doc = doc_ref.get()
    
    if doc.exists:
        name = doc.to_dict().get("name", "Unknown")
        student_name_cache[roll_number] = name
        return name
    else:
        return "Unknown"

def mark_attendance(roll, name, subject, confidence):
    """
    Executes an atomic write to Firestore exactly as requested:
    1. Creates a new attendance_logs document
    2. Increments students_present in live_class_status
    """
    # 🚀 STEP 6 - Mark Attendance from Face Recognition
    data = {
        "roll_number": roll,
        "name": name,
        "subject": subject,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now(),
        "status": "Present",
        "confidence_score": confidence,
        "device_id": "CAM_NODE_01"
    }

    try:
        db.collection("attendance_logs").add(data)
        print(f"✅ Attendance marked in DB for -> {name} ({roll})")
        
        # 🚀 STEP 7 - Update Live Student Count
        doc_ref = db.collection("live_class_status").document(CLASSROOM_ID)
        doc_ref.update({
            "students_present": firestore.Increment(1)
        })
    except Exception as e:
        print(f"❌ Failed to update Firestore for {roll}: {e}")

# ========================================== #
# 4. MAIN RECOGNITION PIPELINE               #
# ========================================== #
def main():
    print("Loading known face encodings...")
    known_encodings, known_roll_numbers = load_known_faces(DATASET_PATH)
    
    if not known_encodings:
        print("No faces loaded. Exiting...")
        return

    # Initialize Webcam
    video_capture = cv2.VideoCapture(0)
    print("🎥 Webcam Started. Press 'q' to quit.")

    while True:
        # Capture frame-by-frame
        ret, frame = video_capture.read()
        if not ret:
            break

        # Resize frame of video to 1/4 size for faster face recognition processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        
        # Convert the image from BGR color (OpenCV use) to RGB color (face_recognition uses)
        rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])

        # Find all the faces and face encodings in the current frame of video
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # See if the face is a match for the known face(s)
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
            roll_number = "Unknown"
            confidence = 0.0

            # Calculate face distances to find the best match mathematically
            face_distances = face_recognition.face_distance(known_encodings, face_encoding)
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    roll_number = known_roll_numbers[best_match_index]
                    # Convert distance to a confidence percentage (1 - distance)
                    confidence = float(1 - face_distances[best_match_index])

            # If a known student is matched
            if roll_number != "Unknown":
                name = get_student_name(roll_number)
                box_color = (0, 255, 0) # Green for recognized
                label = f"{name} ({confidence*100:.0f}%)"

                # >>> CHECK FOR DUPLICATE ATTENDANCE <<<
                if roll_number not in marked_attendance_session:
                    # Mark in memory immediately so we don't spam triggers
                    marked_attendance_session.add(roll_number)
                    
                    # Fire to Database
                    mark_attendance(roll_number, name, CURRENT_SUBJECT, confidence)
            else:
                box_color = (0, 0, 255) # Red for unknown
                label = "Unknown Face"

            # Scale back up face locations since the frame we detected in was scaled to 1/4 size
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            # Draw a box around the face
            cv2.rectangle(frame, (left, top), (right, bottom), box_color, 2)

            # Draw a label with a name below the face
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), box_color, cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, label, (left + 6, bottom - 6), font, 0.6, (255, 255, 255), 1)

        # Display the resulting image
        cv2.imshow('Smart Classroom AI Attendance', frame)

        # Hit 'q' on the keyboard to quit!
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release handle to the webcam
    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()

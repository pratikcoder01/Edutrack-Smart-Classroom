import os
import signal
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
# Enable CORS so the web dashboard can communicate with the backend
CORS(app)

# ========================================== #
# 1. INITIALIZE FIREBASE                     #
# ========================================== #
CREDENTIALS_PATH = "serviceAccountKey.json"

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully in Flask Backend.")
except Exception as e:
    print(f"[ERROR] Failed to initialize Firebase: {e}")
    print("Please ensure 'serviceAccountKey.json' is in the same directory.")

# Global variable to store the subprocess for the face recognition
face_recognition_process = None

# ========================================== #
# 2. ROUTES: AUTHENTICATION                  #
# ========================================== #
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
         return jsonify({"error": "Email and password required"}), 400

    try:
        # Query the faculty collection by email
        faculty_ref = db.collection('faculty').where('email', '==', email).limit(1)
        docs = list(faculty_ref.stream())

        if docs:
            for doc in docs:
                faculty_data = doc.to_dict()
                # Simulate password checking (In production, use hashed passwords & JWT!)
                if password == faculty_data.get('password', password): # Simple check for now
                    return jsonify({
                         "message": "Login successful",
                         "faculty_id": doc.id,
                         "name": faculty_data.get('name'),
                         "department": faculty_data.get('department')
                    }), 200
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ========================================== #
# 3. ROUTES: DATA RETRIEVAL                  #
# ========================================== #
@app.route('/students', methods=['GET'])
def get_students():
    try:
        students_ref = db.collection('students')
        docs = students_ref.stream()
        students = []
        for doc in docs:
            student_data = doc.to_dict()
            student_data['id'] = doc.id
            students.append(student_data)
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/attendance', methods=['GET'])
def get_attendance():
    try:
        # Get the latest 100 attendance logs
        attendance_ref = db.collection('attendance_logs').order_by('date', direction=firestore.Query.DESCENDING).limit(100)
        docs = attendance_ref.stream()
        logs = []
        for doc in docs:
            log_data = doc.to_dict()
            log_data['id'] = doc.id
            logs.append(log_data)
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analytics', methods=['GET'])
def get_analytics():
    try:
        # Get total students registered
        students_count = len(list(db.collection('students').stream()))
        
        # Get today's total attendance count
        today = datetime.now().strftime("%Y-%m-%d")
        today_attendance = len(list(db.collection('attendance_logs').where('date', '==', today).stream()))
        
        # Get average attendance confidence
        conf_sum = 0
        attendance_docs = list(db.collection('attendance_logs').where('date', '==', today).stream())
        if attendance_docs:
            for doc in attendance_docs:
                conf_sum += doc.to_dict().get("confidence", 0)
            avg_confidence = (conf_sum / len(attendance_docs)) * 100
        else:
            avg_confidence = 0
            
        return jsonify({
            "total_students": students_count,
            "today_attendance": today_attendance,
            "avg_confidence": f"{avg_confidence:.1f}%"
        }), 200
    except Exception as e:
         return jsonify({"error": str(e)}), 500

# ========================================== #
# 4. ROUTES: DEVICE & SESSION MANAGEMENT     #
# ========================================== #
@app.route('/api/live_status/<classroom_id>', methods=['GET'])
def get_live_status(classroom_id):
    """
    Endpoint for ESP32/TFT Displays to fetch live attendance & timetable data.
    """
    try:
        doc_ref = db.collection('live_class_status').document(classroom_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return jsonify({
                "students_present": data.get("students_present", 0),
                "subject": data.get("subject", "N/A"),
                "teacher": data.get("teacher", "N/A"),
                "time": data.get("time", "N/A")
            }), 200
        else:
            # Fallback mock data if the document doesn't exist yet but the endpoint works
            return jsonify({
                "students_present": 0,
                "subject": "System Offline",
                "teacher": "N/A",
                "time": "Waiting..."
            }), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/start_attendance', methods=['POST'])
def start_attendance():
    global face_recognition_process
    
    if face_recognition_process is not None and face_recognition_process.poll() is None:
        return jsonify({"message": "Attendance session is already running."}), 400

    try:
        # Path to your face recognition script
        script_path = os.path.join(os.path.dirname(__file__), "face_recognition_system.py")
        
        # Ensure 'dataset' folder exists so the target script doesn't fail
        dataset_path = os.path.join(os.path.dirname(__file__), "dataset")
        if not os.path.exists(dataset_path):
             os.makedirs(dataset_path)

        # Start the Python process
        face_recognition_process = subprocess.Popen(["python", script_path])
        return jsonify({"message": "Attendance camera module triggered and running."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stop_attendance', methods=['POST'])
def stop_attendance():
    global face_recognition_process
    
    if face_recognition_process is None or face_recognition_process.poll() is not None:
         return jsonify({"message": "No attendance session is currently running."}), 400

    try:
        # Kill the child face-recognition thread cleanly
        if os.name == 'nt': # Windows OS
             subprocess.call(['taskkill', '/F', '/T', '/PID', str(face_recognition_process.pid)])
        else: # MacOS/Linux
             os.kill(face_recognition_process.pid, signal.SIGTERM)
             
        face_recognition_process = None
        return jsonify({"message": "Attendance camera module successfully stopped."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Running securely on Port 5000
    app.run(debug=True, port=5000, host="0.0.0.0")

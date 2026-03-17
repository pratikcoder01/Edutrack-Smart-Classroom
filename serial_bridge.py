import time
import serial
import firebase_admin
from firebase_admin import credentials, firestore

# ========================================== #
# CONFIGURATION                              #
# ========================================== #
# Change this to match your Arduino's COM port (e.g., 'COM3' on Windows, '/dev/ttyUSB0' on Linux/Mac)
SERIAL_PORT = 'COM3' 
BAUD_RATE = 115200

CLASSROOM_ID = 'ROOM_304'
CREDENTIALS_PATH = 'serviceAccountKey.json'

# ========================================== #
# INITIALIZE SERIAL CONNECTION               #
# ========================================== #
try:
    print(f"Opening Serial Connection on {SERIAL_PORT} @ {BAUD_RATE} baud...")
    arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2) # Give Arduino time to auto-reset after opening serial connection
    print("✅ Serial connection established.")
except Exception as e:
    print(f"[ERROR] Failed to connect to Serial Port {SERIAL_PORT}. Error: {e}")
    print("Please check your Arduino connection and COM port in Device Manager/lsusb.")
    exit()

# ========================================== #
# INITIALIZE FIREBASE                        #
# ========================================== #
try:
    cred = credentials.Certificate(CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully.")
except Exception as e:
    print(f"❌ Failed to initialize Firebase: {e}")
    print("Please ensure 'serviceAccountKey.json' is in the same directory.")
    exit()

# ========================================== #
# FIREBASE LISTENER FUNCTION                 #
# ========================================== #
def on_snapshot(col_snapshot, changes, read_time):
    print(f"\n--- Update Received at {read_time} ---")
    for doc in col_snapshot:
        data = doc.to_dict()
        
        # Extract data with fallbacks
        count = data.get('students_present', 0)
        subject = data.get('subject', 'N/A')
        teacher = data.get('teacher', 'N/A')
        cl_time = data.get('time', 'N/A')
        
        # Format the strict string expected by Arduino: DATA,count,subject,teacher,time\n
        # Using a newline \n as the delimiter so Arduino knows when the message ends.
        data_string = f"DATA,{count},{subject},{teacher},{cl_time}\n"
        print(f"Sending to Arduino: {data_string.strip()}")
        
        try:
            # Send over USB Serial encoded as ASCII bytes
            arduino.write(data_string.encode('ascii'))
        except Exception as e:
            print(f"❌ Failed to send data: {e}")

# ========================================== #
# MAIN LOOP                                  #
# ========================================== #
print(f"Listening for real-time changes on 'live_class_status/{CLASSROOM_ID}'...")

# Attach the real-time listener to the specific classroom document
doc_ref = db.collection('live_class_status').document(CLASSROOM_ID)
doc_watch = doc_ref.on_snapshot(on_snapshot)

try:
    # Keep the script running forever so the listener stays active
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nShutting down Serial Bridge...")
    arduino.close()
    print("Serial port closed. Goodbye!")

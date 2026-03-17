#include <Adafruit_GFX.h>    // Core graphics library
#include <MCUFRIEND_kbv.h>  // Hardware-specific library for typical Uno TFT shields

// Please install Adafruit_GFX and MCUFRIEND_kbv libraries via Arduino Library Manager

MCUFRIEND_kbv tft;

// Colors
#define BLACK   0x0000
#define BLUE    0x001F
#define RED     0xF800
#define GREEN   0x07E0
#define CYAN    0x07FF
#define MAGENTA 0xF81F
#define YELLOW  0xFFE0
#define WHITE   0xFFFF

// Variables to store received data
String students_present = "0";
String subject = "Waiting...";
String teacher = "Waiting...";
String class_time = "Waiting...";

void setup() {
  // 115200 must match the BAUD_RATE in serial_bridge.py
  Serial.begin(115200);   
  
  // Initialize the TFT shield
  uint16_t ID = tft.readID();
  Serial.print("TFT ID = 0x");
  Serial.println(ID, HEX);
  
  // If readID fails, force a common ID like 0x9341
  if (ID == 0xD3D3) ID = 0x9486; 
  
  tft.begin(ID);
  tft.setRotation(1); // Landscape view
  
  // Initial draw
  drawUI();
}

void loop() {
  // Check if data is available on the Serial port
  if (Serial.available() > 0) {
    // Read the string until a newline character is received
    String inputString = Serial.readStringUntil('\n');
    
    // Parse the strict structure: DATA,count,subject,teacher,time
    if (inputString.startsWith("DATA,")) {
      parseDataString(inputString);
      // Update display after receiving new data
      drawUI(); 
    }
  }
}

// Function to split the string by commas
void parseDataString(String input) {
  // Remove "DATA,"
  input.remove(0, 5);
  
  // Find first comma
  int commaIndex = input.indexOf(',');
  students_present = input.substring(0, commaIndex);
  input.remove(0, commaIndex + 1);
  
  // Find second comma
  commaIndex = input.indexOf(',');
  subject = input.substring(0, commaIndex);
  input.remove(0, commaIndex + 1);
  
  // Find third comma
  commaIndex = input.indexOf(',');
  teacher = input.substring(0, commaIndex);
  input.remove(0, commaIndex + 1);
  
  // The rest is time
  class_time = input;
}

void drawUI() {
  // Clear the screen
  tft.fillScreen(BLACK);
  
  // 1. Header Box
  tft.fillRect(0, 0, tft.width(), 40, BLUE);
  tft.setTextSize(2);
  tft.setTextColor(WHITE);
  tft.setCursor(10, 10);
  tft.print("SMART CLASSROOM");
  
  // 2. Live Student Count (Large & Green)
  tft.setTextSize(2);
  tft.setTextColor(CYAN);
  tft.setCursor(10, 60);
  tft.print("LIVE ATTENDANCE:");
  
  tft.setTextSize(8);
  tft.setTextColor(GREEN);
  tft.setCursor(10, 90);
  tft.print(students_present);
  
  // 3. Timetable Data (Subject)
  tft.setTextSize(2);
  tft.setTextColor(YELLOW);
  tft.setCursor(10, 180);
  tft.print("Class: ");
  tft.setTextColor(WHITE);
  tft.print(subject);
  
  // 4. Timetable Data (Teacher)
  tft.setTextColor(YELLOW);
  tft.setCursor(10, 210);
  tft.print("Prof:  ");
  tft.setTextColor(WHITE);
  tft.print(teacher);
  
  // 5. Timetable Data (Time)
  tft.setTextColor(YELLOW);
  tft.setCursor(10, 240);
  tft.print("Time:  ");
  tft.setTextColor(WHITE);
  tft.print(class_time);
}

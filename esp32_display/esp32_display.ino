#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// If using a TFT Display, uncomment and configure appropriately
// #include <TFT_eSPI.h> 
// TFT_eSPI tft = TFT_eSPI();

// --- Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IP Address of the computer running the Flask backend (app.py)
// Make sure both the ESP32 and the computer are on the same Wi-Fi network
const char* flask_server_endpoint = "http://192.168.x.x:5000/api/live_status/ROOM_304"; 

// Update interval (in milliseconds)
const unsigned long UPDATE_INTERVAL = 5000; 
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize Display (Uncomment if using TFT)
  // tft.init();
  // tft.setRotation(1);
  // tft.fillScreen(TFT_BLACK);
  // tft.setTextColor(TFT_WHITE, TFT_BLACK);

  // Connect to Wi-Fi
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if ((millis() - lastUpdate) > UPDATE_INTERVAL) {
    fetchLiveClassData();
    lastUpdate = millis();
  }
}

void fetchLiveClassData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(flask_server_endpoint);
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      Serial.print("HTTP GET Response Code: ");
      Serial.println(httpResponseCode);
      
      String payload = http.getString();
      Serial.println("Received Payload: " + payload);
      
      // Parse JSON
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        http.end();
        return;
      }

      int students_present = doc["students_present"];
      const char* subject = doc["subject"];
      const char* teacher = doc["teacher"];
      const char* time = doc["time"];

      // Output to Serial Monitor
      Serial.println("--- LIVE CLASS STATUS ---");
      Serial.print("Students Present: ");
      Serial.println(students_present);
      Serial.print("Subject: ");
      Serial.println(subject);
      Serial.print("Teacher: ");
      Serial.println(teacher);
      Serial.print("Time: ");
      Serial.println(time);
      Serial.println("-------------------------");

      // Output to TFT Display (Uncomment and customize for your TFT)
      /*
      tft.fillScreen(TFT_BLACK);
      
      // Draw Header
      tft.setTextSize(2);
      tft.setTextColor(TFT_CYAN);
      tft.setCursor(10, 10);
      tft.println("SMART CLASSROOM");
      
      // Draw Live Count
      tft.setTextSize(6);
      tft.setTextColor(TFT_GREEN);
      tft.setCursor(10, 50);
      tft.print(students_present);
      tft.setTextSize(2);
      tft.setTextColor(TFT_WHITE);
      tft.println(" Present");
      
      // Draw Timetable Data
      tft.setCursor(10, 120);
      tft.print("Sub: "); tft.println(subject);
      tft.setCursor(10, 150);
      tft.print("Prof: "); tft.println(teacher);
      tft.setCursor(10, 180);
      tft.print("Time: "); tft.println(time);
      */

    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

#include "Config.h"
#include "Sensors.h"
#include "CloudNet.h"
#include "Display.h"
#include <WiFi.h>

unsigned long lastFirebaseTime = 0;
unsigned long lastDisplayTime = 0;

void setup() {
    Serial.begin(115200);
    
    initDisplay();
    initSensors();
    
    // 1. Clear the old hotspot cache before attempting a new connection
    WiFi.disconnect(true);
    delay(1000);
    
    // 2. Initialize Wi-Fi (which uses credentials from CloudNet/Config)
    initWiFi(); 
    
    // 3. Wait for connection with Serial Monitor feedback so it doesn't fail silently
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected!");
    
    initFirebase();
}

void loop() {
    unsigned long currentMillis = millis();

    maintainNetwork();
    updateSensors();

    if (currentMillis - lastDisplayTime >= DISPLAY_REFRESH_MS) {
        lastDisplayTime = currentMillis;
        refreshDisplay();
    }

    if (currentMillis - lastFirebaseTime >= FIREBASE_INTERVAL_MS) {
        lastFirebaseTime = currentMillis;
        pushToFirebase();
    }
}
#include "CloudNet.h"
#include "Config.h"
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "Sensors.h"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool lastFirebaseSuccess = false;

void initWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(1000);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void initFirebase() {
    config.api_key = FIREBASE_API_KEY;
    config.database_url = FIREBASE_URL;
    
    // Bypass authentication 
    config.signer.test_mode = true; 
    
    // ---------------------------------------------------------
    // CRITICAL MEMORY FIX FOR OLED + SSL COLLISION
    // ---------------------------------------------------------
    // Shrink the BearSSL Rx/Tx buffers to fit in remaining RAM
    fbdo.setBSSLBufferSize(2048, 1024); 
    
    // Limit the size of the HTTP response payload
    fbdo.setResponseSize(1024);
    // ---------------------------------------------------------
    
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
}



void maintainNetwork() {
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.disconnect();
        WiFi.reconnect();
    }
}

bool pushToFirebase() {
    if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) {
        lastFirebaseSuccess = false;
        return false;
    }

    FirebaseJson json;
    
    json.set("node_id", NODE_ID);
    json.set("building", NODE_BLDG);
    json.set("room", NODE_ROOM);
    json.set("status", currentData.status);
    json.set("last_updated", "{.sv: \"timestamp\"}");

    json.set("temperature", round(currentData.temperature * 10) / 10.0);
    json.set("humidity", round(currentData.humidity * 10) / 10.0);
    json.set("gas", currentData.gas);
    json.set("flame", currentData.flame);

#if defined(BUILD_NODE_A1)
    json.set("current", round(currentData.current * 100) / 100.0);
    json.set("distance", currentData.distance);
#elif defined(BUILD_NODE_B1)
    json.set("motion", currentData.motion);
    json.set("panic_button", currentData.button);
#endif

    String path = String("/nodes/") + NODE_ID;
    
    // CHANGED: Using setJSONAsync so it operates in the background
    // and does NOT block your OLED display refresh loop!
    if (Firebase.RTDB.setJSONAsync(&fbdo, path.c_str(), &json)) {
        lastFirebaseSuccess = true;
    } else {
        lastFirebaseSuccess = false;
    }
    
    return lastFirebaseSuccess;
}
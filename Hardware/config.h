#pragma once

// ==============================================================================
// 1. COMPILE-TIME TARGET
// ==============================================================================
#define BUILD_NODE_A1
// #define BUILD_NODE_B1

// ==============================================================================
// 2. NETWORK & CLOUD CONFIGURATION
// ==============================================================================
// Include secrets from .env (formatted as C macros)
#include ".env"
#define FIREBASE_URL    "synapse-d120d-default-rtdb.asia-southeast1.firebasedatabase.app"

#define FIREBASE_INTERVAL_MS 5000
#define SENSOR_READ_MS       500
#define DISPLAY_REFRESH_MS   500

// ==============================================================================
// 3. HARDWARE PIN MAPPINGS
// ==============================================================================
// SHARED PINS
#define PIN_I2C_SDA     21
#define PIN_I2C_SCL     22
#define PIN_DHT         4
#define DHT_TYPE        DHT22
#define PIN_MQ2         34
#define PIN_FLAME       26
#define PIN_LED_RED     25
#define PIN_BUZZER      23

#if defined(BUILD_NODE_A1)
    #define NODE_ID         "A1"
    #define NODE_BLDG       "Academic Block"
    #define NODE_ROOM       "Electrical Lab"
    #define PIN_ACS712      36
    #define PIN_HCSR_TRIG   18
    #define PIN_HCSR_ECHO   19

#elif defined(BUILD_NODE_B1)
    #define NODE_ID         "B1"
    #define NODE_BLDG       "Research Block"
    #define NODE_ROOM       "Chemistry Lab"
    #define PIN_PIR         27
    #define PIN_BUTTON      13
#endif

// ==============================================================================
// 4. DATA STRUCTURE
// ==============================================================================
struct SensorData {
    float temperature = 0.0;
    float humidity = 0.0;
    int gas = 0;
    bool flame = false;
    float current = 0.0;
    int distance = -1;
    bool motion = false;
    bool button = false;
    char status[16] = "NORMAL";
};

extern SensorData currentData;
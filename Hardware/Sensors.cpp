#include "Sensors.h"
#include "Config.h"
#include <DHT.h>

DHT dht(PIN_DHT, DHT_TYPE);
SensorData currentData;
unsigned long lastSensorRead = 0;

void initSensors() {
    dht.begin();
    pinMode(PIN_MQ2, INPUT);
    pinMode(PIN_FLAME, INPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_BUZZER, LOW);

#if defined(BUILD_NODE_A1)
    pinMode(PIN_ACS712, INPUT);
    pinMode(PIN_HCSR_TRIG, OUTPUT);
    pinMode(PIN_HCSR_ECHO, INPUT);
#elif defined(BUILD_NODE_B1)
    pinMode(PIN_PIR, INPUT);
    pinMode(PIN_BUTTON, INPUT_PULLUP);
#endif
}

void updateSensors() {
    if (millis() - lastSensorRead < SENSOR_READ_MS) return;
    lastSensorRead = millis();

    // Core Environment
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentData.temperature = t;
    if (!isnan(h)) currentData.humidity = h;

    currentData.gas = analogRead(PIN_MQ2);
    currentData.flame = !digitalRead(PIN_FLAME); // Active LOW

#if defined(BUILD_NODE_A1)
    // Non-blocking current sampling
    long sum = 0;
    for(int i = 0; i < 50; i++) sum += analogRead(PIN_ACS712);
    float avgADC = sum / 50.0;
    float calculatedCurrent = abs((((avgADC / 4095.0) * 3.3) - 1.65) / 0.066); 
    currentData.current = (calculatedCurrent < 0.15) ? 0.0 : calculatedCurrent;

    // Fast ultrasonic trigger
    digitalWrite(PIN_HCSR_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_HCSR_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_HCSR_TRIG, LOW);
    // Timeout at 20000us max to prevent freezing loop
    long duration = pulseIn(PIN_HCSR_ECHO, HIGH, 20000); 
    currentData.distance = (duration == 0) ? -1 : duration * 0.034 / 2;

#elif defined(BUILD_NODE_B1)
    currentData.motion = digitalRead(PIN_PIR);
    currentData.button = digitalRead(PIN_BUTTON); // Pulled UP, Active LOW
#endif

    evaluateStatus();
}

void evaluateStatus() {
    bool triggerEmergency = false;
    bool triggerWarning = false;

    // Standard Hardware Thresholds
    if (currentData.flame || currentData.gas > 2500 || currentData.temperature > 50.0) {
        triggerEmergency = true;
    } else if (currentData.gas > 1200 || currentData.temperature > 40.0) {
        triggerWarning = true;
    }

#if defined(BUILD_NODE_A1)
    if (currentData.current > 20.0) triggerWarning = true;
#elif defined(BUILD_NODE_B1)
    // Manual Panic Button Override
    if (currentData.button) triggerEmergency = true;
#endif

    if (triggerEmergency) {
        strcpy(currentData.status, "EMERGENCY");
        digitalWrite(PIN_LED_RED, HIGH);
        digitalWrite(PIN_BUZZER, HIGH);
    } else if (triggerWarning) {
        strcpy(currentData.status, "WARNING");
        digitalWrite(PIN_LED_RED, (millis() % 1000) < 500); // Blink
        digitalWrite(PIN_BUZZER, LOW);
    } else {
        strcpy(currentData.status, "NORMAL");
        digitalWrite(PIN_LED_RED, LOW);
        digitalWrite(PIN_BUZZER, LOW);
    }
}
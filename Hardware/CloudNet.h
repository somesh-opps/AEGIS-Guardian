#pragma once
#include <Arduino.h>

void initWiFi();
void initFirebase();
void maintainNetwork();
bool pushToFirebase();

extern bool lastFirebaseSuccess;
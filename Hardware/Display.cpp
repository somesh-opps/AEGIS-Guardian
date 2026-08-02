#include "Display.h"
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "Config.h"
#include "Sensors.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void initDisplay() {
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        for(;;);
    }
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("SYNAPSE OS");
    display.print("Booting ");
    display.println(NODE_ID);
    
    display.display();
}

void refreshDisplay() {
    // BRUTE-FORCE REBOOT: Re-initialize the I2C bus and OLED charge pump every frame
    // This ensures that if the screen lost power, it is fully rebooted before drawing.
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    
    display.clearDisplay();
    display.setCursor(0,0);
    
    display.print("NODE ");
    display.print(NODE_ID);
    display.println(WiFi.status() == WL_CONNECTED ? " | WiFi OK" : " | NO WiFi");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
    
    display.setCursor(0, 14);
    display.printf("T:%.1f H:%.0f%%\n", currentData.temperature, currentData.humidity);
    
#if defined(BUILD_NODE_A1)
    display.printf("Gas:%d F:%s\n", currentData.gas, currentData.flame ? "Y" : "N");
    display.printf("Cur:%.1f Dist:%d\n", currentData.current, currentData.distance);
#elif defined(BUILD_NODE_B1)
    display.printf("Gas:%d F:%s\n", currentData.gas, currentData.flame ? "Y" : "N");
    display.printf("Mot:%s Btn:%s\n", currentData.motion ? "Y" : "N", currentData.button ? "Y" : "N");
#endif

    display.drawLine(0, 42, 128, 42, SSD1306_WHITE);
    display.setCursor(0, 46);
    display.printf("ST: %s\n", currentData.status);
    
    display.display();
}
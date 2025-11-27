# -*- coding: utf-8 -*-

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_offline_mode(driver):
    driver.get("http://localhost:8000/index.html") 
    print("\n⏳ Oczekiwanie na aktywację Service Workera...")
    
    sw_ready = False
    for i in range(10): 
        state = driver.execute_script("""
            return navigator.serviceWorker.controller !== null 
            && navigator.serviceWorker.controller.state === 'activated';
        """)
        if state:
            sw_ready = True
            break
        time.sleep(1)
        
    if not sw_ready:
        driver.refresh()
        time.sleep(3)

    is_controlled = driver.execute_script("return navigator.serviceWorker.controller !== null")
    
    if not is_controlled:
        print("⚠️ Ostrzeżenie: Service Worker nie przejął kontroli. Test może się nie udać.")
    else:
        print("✅ Service Worker jest aktywny i kontroluje stronę.")

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "logo"))
    )

    print("🔌 Odłączam internet...")
    driver.set_network_conditions(
        offline=True,
        latency=5,
        throughput=0
    )

    try:
        driver.refresh()
        print("🔄 Strona odświeżona w trybie offline.")
    except:
        pass
    try:
        logo = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CLASS_NAME, "logo"))
        )
    
        assert "Kursy" in driver.title or "Walut" in driver.title

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert "No internet" not in body_text, "Wykryto ekran błędu Chrome"
        assert "ERR_INTERNET_DISCONNECTED" not in body_text, "Wykryto kod błędu rozłączenia"
        
        print("✅ SUKCES: Aplikacja działa offline!")
        
    except Exception as e:
        print(f"❌ BŁĄD: {str(e)}")
        driver.save_screenshot("offline_error.png")
        raise e

    finally:
        driver.set_network_conditions(
            offline=False,
            latency=0,
            throughput=500 * 1024
        )
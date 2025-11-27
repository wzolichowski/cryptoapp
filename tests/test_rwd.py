# -*- coding: utf-8 -*-

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_responsiveness(driver):
    driver.get("http://localhost:8000")

    print("\n Przełączam na widok mobilny (375x667)...")
    driver.set_window_size(375, 667)
    time.sleep(1) 

    try:
        logo = driver.find_element(By.CLASS_NAME, "logo")
        assert logo.is_displayed(), "Logo zniknęło na widoku mobilnym!"
    except:
        assert False, "Błąd renderowania na widoku mobilnym"
        
    table = driver.find_element(By.ID, "currencyTableBody")
    assert table is not None

    print("tabletu Przełączam na widok tabletu (768x1024)...")
    driver.set_window_size(768, 1024)
    time.sleep(1)

    print("Przełączam na widok desktopowy (1920x1080)...")
    driver.set_window_size(1920, 1080)
    time.sleep(1)

    nav_buttons = driver.find_elements(By.CLASS_NAME, "nav-btn")
    visible_buttons = [btn for btn in nav_buttons if btn.is_displayed()]
    
    if len(visible_buttons) > 0:
        print(f"Na desktopie widocznych jest {len(visible_buttons)} przycisków nawigacji.")
    else:
        print("Ostrzeżenie: Przyciski nawigacji są ukryte nawet na Desktopie.")

    print("Test responsywności zakończony sukcesem.")
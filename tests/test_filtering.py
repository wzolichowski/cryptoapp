# tests/test_filtering.py
# -*- coding: utf-8 -*-

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_search_filter(driver):
    driver.get("http://localhost:8000")

    SEARCH_INPUT_SELECTOR = "#searchInput"
    USD_ROW_SELECTOR = "tr[data-currency='USD']"
    EUR_ROW_SELECTOR = "tr[data-currency='EUR']"

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, USD_ROW_SELECTOR))
        )
    except:
        assert False, "Tabela walut (wiersz USD) nie załadowała się w ciągu 10 sekund."

    search_input = driver.find_element(By.CSS_SELECTOR, SEARCH_INPUT_SELECTOR)


    search_input.send_keys("Euro")
    time.sleep(0.5) 

    try:
        WebDriverWait(driver, 5).until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, USD_ROW_SELECTOR))
        )
    except:
        assert False, "Wiersz USD nie został ukryty po filtrowaniu."

    eur_row = driver.find_element(By.CSS_SELECTOR, EUR_ROW_SELECTOR)
    assert eur_row.is_displayed(), "Wiersz EUR nie jest widoczny po filtrowaniu."

    search_input.clear()

    search_input.send_keys(" ")
    search_input.clear() 
    time.sleep(0.5)

    try:
        WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, USD_ROW_SELECTOR))
        )
    except:
        assert False, "Wiersz USD nie pojawił się ponownie po wyczyszczeniu filtra."
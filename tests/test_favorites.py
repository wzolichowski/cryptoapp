# tests/test_favorites.py
# -*- coding: utf-8 -*-

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_favorites_workflow(driver):
    driver.get("http://localhost:8000")

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "tr[data-currency='EUR']"))
        )
    except:
        assert False, "Tabela walut (wiersz EUR) nie załadowała się w ciągu 10 sekund."

    EUR_STAR_SELECTOR = "tr[data-currency='EUR'] button.icon-btn"
    FAVORITES_GRID_SELECTOR = "#favoritesGrid"
    
    eur_star_button = driver.find_element(By.CSS_SELECTOR, EUR_STAR_SELECTOR)

    assert "favorite-active" not in eur_star_button.get_attribute("class"), \
        "Błąd: Gwiazdka EUR jest aktywna przed kliknięciem."

    favorites_grid = driver.find_element(By.CSS_SELECTOR, FAVORITES_GRID_SELECTOR)
    assert "EUR/PLN" not in favorites_grid.text, "Błąd: Karta EUR jest w ulubionych przed dodaniem."

    eur_star_button.click()

    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, EUR_STAR_SELECTOR + ".favorite-active"))
    )

    WebDriverWait(driver, 5).until(
        EC.text_to_be_present_in_element((By.CSS_SELECTOR, FAVORITES_GRID_SELECTOR), "EUR/PLN")
    )

    driver.refresh()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, EUR_STAR_SELECTOR + ".favorite-active"))
    )

    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.CSS_SELECTOR, FAVORITES_GRID_SELECTOR), "EUR/PLN")
    )

    driver.find_element(By.CSS_SELECTOR, EUR_STAR_SELECTOR).click()

    WebDriverWait(driver, 5).until_not(
        EC.presence_of_element_located((By.CSS_SELECTOR, EUR_STAR_SELECTOR + ".favorite-active"))
    )

    WebDriverWait(driver, 5).until_not(
        EC.text_to_be_present_in_element((By.CSS_SELECTOR, FAVORITES_GRID_SELECTOR), "EUR/PLN")
    )
   
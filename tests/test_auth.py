# -*- coding: utf-8 -*-
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time 

def test_successful_mock_login(driver):
    driver.get("http://localhost:8000")
    profile_button = driver.find_element(By.CSS_SELECTOR, "[data-view='profile']")
    profile_button.click()

    time.sleep(0.5) 

    login_form_button = driver.find_element(By.CSS_SELECTOR, "button[onclick='showLoginForm()']")
    login_form_button.click()

    email_field = WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.ID, "loginEmail"))
    )
    email_field.send_keys("test@mock.pl")
    
    password_field = driver.find_element(By.ID, "loginPassword")
    password_field.send_keys("cokolwiek123")

    submit_button = driver.find_element(By.CSS_SELECTOR, "#authFormContainer form button[type='submit']")
    submit_button.click()

    try:
        logout_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "button[onclick='logout()']"))
        )
    except:
        logout_button = None

    assert logout_button is not None, "Logowanie na mocku nie powiodło się. Nie znaleziono przycisku 'Wyloguj'."

    try:
            WebDriverWait(driver, 5).until(
                EC.text_to_be_present_in_element(
                    (By.ID, "toast"), 
                    "Zalogowano pomyślnie!"
                )
            )
    except:
        assert False, "Nie znaleziono toastu z tekstem 'Zalogowano pomyślnie!' w ciągu 5 sekund."
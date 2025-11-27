# -*- coding: utf-8 -*-

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'downloads'))

def test_csv_export(driver):
    driver.get("http://localhost:8000") 

    try:
        export_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "exportBtn"))
        )
    except:
        assert False, "Przycisk eksportu (exportBtn) nie załadował się w ciągu 10 sekund."

    assert len(os.listdir(DOWNLOAD_DIR)) == 0, "Folder 'downloads' nie jest pusty przed testem!"

    export_button.click()
    time.sleep(5) 

    files = os.listdir(DOWNLOAD_DIR)
    assert len(files) > 0, "Folder 'downloads' jest pusty po teście (plik się nie pobrał)."

    assert files[0].endswith(".csv"), "Pobrany plik nie ma rozszerzenia .csv"

    assert files[0].startswith("kursy_walut_"), "Nazwa pliku nie zaczyna się od 'kursy_walut_'"
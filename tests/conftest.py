# -*- coding: utf-8 -*-

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import os

DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'downloads'))

@pytest.fixture
def driver():
    chrome_options = webdriver.ChromeOptions()
    prefs = {
        "download.default_directory": DOWNLOAD_DIR, 
        "download.prompt_for_download": False, 
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True
    }
    chrome_options.add_experimental_option("prefs", prefs)

    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR) 
        
    for f in os.listdir(DOWNLOAD_DIR):
        os.remove(os.path.join(DOWNLOAD_DIR, f))

    service = Service(ChromeDriverManager().install())
    web_driver = webdriver.Chrome(service=service, options=chrome_options)
    
    web_driver.implicitly_wait(5)

    yield web_driver

    web_driver.quit()
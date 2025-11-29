# Plan Testów - Aplikacja Kursy Walut PWA

## 1. Statystyki
* **Liczba testów automatycznych:** 6
* **Technologia:** Python, Selenium, Pytest
* **Raportowanie:** Pytest-HTML

## 2. Scenariusze Testowe

| ID | Nazwa Scenariusza | Typ Testu | Status Automatyzacji | Uwagi |
|:---|:---|:---|:---|:---|
| F1 | Wyświetlanie kursów | Manualny | ❌ Nie | Weryfikacja wizualna poprawności danych |
| F2 | Filtrowanie walut | Automatyczny | ✅ Tak | Plik: `test_filtering.py` |
| F3 | Rejestracja i Logowanie | Automatyczny | ✅ Tak | Plik: `test_auth.py` |
| F4 | Autoryzacja (Dostęp) | Automatyczny | ✅ Tak | Sprawdzane w `test_auth.py` |
| F5 | Ulubione Waluty | Automatyczny | ✅ Tak | Plik: `test_favorites.py` |
| F6 | Eksport do CSV | Automatyczny | ✅ Tak | Plik: `test_export.py` |
| F7 | Responsywność (RWD) | Automatyczny | ✅ Tak | Plik: `test_rwd.py` |
| F8 | Tryb Offline (PWA) | Automatyczny | ✅ Tak | Plik: `test_pwa_offline.py` |
| UI | Estetyka wykresów | Manualny | ❌ Nie | Ocena czytelności Chart.js |

## 3. Jak uruchomić testy automatyczne?

1. Aktywuj środowisko wirtualne.
2. Zainstaluj zależności: `pip install -r requirements.txt`
3. Uruchom serwer lokalny aplikacji.
4. Wpisz komendę: `pytest --html=raport.html`
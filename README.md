TODO : 
- favicony - generacja - podmiana nazwy na uzyte w index, wrzucenie do assets/favicons




# 💱 Kursy Walut – Aplikacja PWA

Interaktywna aplikacja **Progressive Web App (PWA)** umożliwiająca przeglądanie **aktualnych i historycznych kursów walut oraz kryptowalut** w przyjaznym, responsywnym interfejsie.  
Projekt został zrealizowany w ramach zespołowego projektu studenckiego.

---

## 🎯 Cel projektu

Celem aplikacji jest stworzenie **intuicyjnego narzędzia do śledzenia kursów walut FIAT i kryptowalut**, które:
- zapewnia szybki dostęp do aktualnych i historycznych danych,
- umożliwia filtrowanie wyników po przedziale czasowym i walucie,
- prezentuje trendy kursowe w formie wykresu,
- pozwala eksportować dane do pliku CSV
- wspiera logowanie, autoryzację
- działa w trybie offline jako aplikacja PWA.

---

## ⚙️ Zakres projektu

### 🧩 Wersja MVP
- ✅ **Frontend** – HTML, CSS, JavaScript 
- ✅ **Backend** – Firebase   
- ✅ **Baza danych** – Firestore NoSQL 
- ✅ **API NBP** – pobieranie danych o kursach walut FIAT
- ✅ **COINGECKO API** - pobieranie danych o krypto 
- ✅ **Logowanie i rejestracja** użytkowników  
- ✅ **Autoryzacja** i obsługa sesji  
- ✅ **Filtrowanie danych** po walucie i zakresie dat  
- ✅ **Tabela + wykres liniowy** trendów kursów
- ✅ **Panel analityczny walut**  
- ✅ **Ulubione waluty** (dodawanie/usuwanie)  
- ✅ **Eksport danych** do CSV
- ✅ **Tryb jasny/ciemny**  
- ✅ **Obsługa PWA**  
- ✅ **Responsywny interfejs (RWD)**

---

## 👥 Zespół projektowy

| Imię i nazwisko       | Rola / Zakres                                                                 |
|------------------------|-------------------------------------------------------------------------------|
| **Aleksandra Zbierańska** | Koncepcja pierwotnej aplikacji, integracja z API NBP, dokumentacja |
| **Oliwia Charyk**        | Project Manager – koordynacja, raportowanie, komunikacja |
| **Karolina Sosińska**    | Tester QA – testy manualne, automatyczne (pytest, Selenium), PWA |
| **Tomasz Wojtuń**        | Backend Developer – Flask, logowanie, baza danych, CoinGecko |
| **Wojciech Zolichowski** | Frontend Developer, konfiguracja API, Azure 

---

## 🧠 Architektura systemu

Trójwarstwowa architektura aplikacji:
1. **Frontend** –  HTML/CSS/JS
2. **Backend** – Firebase 
3. **Baza danych + API zewnętrzne** – Firestore NoSql  + API NBP & CoinGecko  
4. **Autoryzacja użytkowników** – Firebase  
5. **Środowisko wdrożeniowe** – Azure Static Web Apps



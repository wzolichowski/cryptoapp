TODO : ( jak pomysly macie )
- assets, ikonki
- zmiana avatara ?  czy wywalamy? 
- wiecej opcji w profilu 
- wykresy - bo sa brzydki - warto żeby jakiś prosty był
- Po dodaniu API cen ustawic odswieezanie live ( lub chociaz co minute ) - aktualnie jest co 5 minut 
- tryb jasny/ciemny? mamy w założeniach, u mnie lepiej odbieram apkę, która ma opcję trybu ciemnego - jak sie wyrobimy to pierdola 
- drop down z 4 walutami na głównej stronie - do czego służy? 
- musimy rozpisać proste user stories aplikacji to uprości wybranie i okrojenie funkcjonalności

BUGI : ( zglaszajcie jak sa )


BACKLOGI: ( nowa funkcjonalnosc - ktora uwazacie ze powinna sie znalezc w aplikacji )






# 💱 Kursy Walut – Aplikacja PWA

Interaktywna aplikacja **Progressive Web App (PWA)** umożliwiająca przeglądanie **aktualnych i historycznych kursów walut oraz kryptowalut** w przyjaznym, responsywnym interfejsie.  
Projekt został zrealizowany w ramach zespołowego projektu studenckiego.

---

## 🎯 Cel projektu

Celem aplikacji jest stworzenie **intuicyjnego narzędzia do śledzenia kursów walut FIAT i kryptowalut**, które:
- zapewnia szybki dostęp do aktualnych i historycznych danych,
- umożliwia filtrowanie wyników po dacie i walucie,
- prezentuje trendy kursowe w formie wykresów,
- pozwala eksportować dane do plików CSV/XLSX, < ---- nie pamietam tego 
- wspiera logowanie, autoryzację i personalizację danych,
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
- ✅ **Ulubione waluty** (dodawanie/usuwanie)  
- ✅ **Eksport danych** do CSV/XLSX  
- ✅ **Tryb jasny/ciemny**  
- ✅ **Obsługa PWA**  
- ✅ **Responsywny interfejs (RWD)**  

### 🚧 Wersja docelowa
- 💰 Integracja z API kryptowalut (CoinGecko)  
- 📈 Dashboard analityczny (wskaźniki: średni, min, max, zmiana %)  
- 🔔 Powiadomienia push / alerty walutowe  
- 🧠 Udoskonalony UX/UI i testy automatyczne  ( czy przy html css js mozna nazwac udoskonalonym? )

---

## 👥 Zespół projektowy

| Imię i nazwisko       | Rola / Zakres                                                                 |
|------------------------|-------------------------------------------------------------------------------|
| **Aleksandra Zbierańska** | Architekt rozwiązania – MVP, integracja z API NBP, dokumentacja |
| **Oliwia Charyk**        | Project Manager – koordynacja, raportowanie, komunikacja |
| **Karolina Sosińska**    | Tester QA – testy manualne, automatyczne (pytest, Selenium), PWA |
| **Tomasz Wojtuń**        | Backend Developer – Flask, logowanie, baza danych, CoinGecko |
| **Wojciech Zolichowski** | Frontend Developer, konfiguracja API, Azure 

---

## 🧠 Architektura systemu

Trójwarstwowa architektura aplikacji:
1. **Frontend** – prezentacja danych (HTML/CSS/JS)
2. **Backend** – Firebase 
3. **Baza danych + API zewnętrzne** – Firestore NoSql  + API NBP / CoinGecko  
4. **Autoryzacja użytkowników** – Firebase  
5. **Środowisko wdrożeniowe** – AZURE



# Konfiguracja Firebase Secrets w GitHub Actions

## Przegląd

Projekt używa GitHub Secrets do bezpiecznego przechowywania konfiguracji Firebase. Podczas deployment, GitHub Actions automatycznie generuje plik `firebase-config.js` z wartości secrets.

## Dane Firebase do dodania

Musisz dodać następujące dane konfiguracyjne Firebase jako GitHub Secrets:

```
FIREBASE_API_KEY=AIzaSyDcyf2rY050dlVSS6HjTbCjFGraZatPGRY
FIREBASE_AUTH_DOMAIN=financial-crypto-dashboard.firebaseapp.com
FIREBASE_PROJECT_ID=financial-crypto-dashboard
FIREBASE_STORAGE_BUCKET=financial-crypto-dashboard.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=501318964054
FIREBASE_APP_ID=1:501318964054:web:8a193984a849e242c13cf7
FIREBASE_MEASUREMENT_ID=G-J10MWNK82T
```

## Jak dodać GitHub Secrets

### Opcja 1: Przez interfejs GitHub (Recommanded)

1. Przejdź do repozytorium na GitHub
2. Kliknij **Settings** (Ustawienia)
3. W menu bocznym wybierz **Secrets and variables** → **Actions**
4. Kliknij **New repository secret**
5. Dodaj każdy secret osobno:
   - **Name**: nazwa zmiennej (np. `FIREBASE_API_KEY`)
   - **Value**: wartość zmiennej (np. `AIzaSyDcyf2rY050dlVSS6HjTbCjFGraZatPGRY`)
6. Kliknij **Add secret**
7. Powtórz dla wszystkich 7 zmiennych

### Opcja 2: Przez GitHub CLI

Jeśli masz zainstalowane GitHub CLI (`gh`), możesz użyć następujących komend:

```bash
gh secret set FIREBASE_API_KEY -b "AIzaSyDcyf2rY050dlVSS6HjTbCjFGraZatPGRY"
gh secret set FIREBASE_AUTH_DOMAIN -b "financial-crypto-dashboard.firebaseapp.com"
gh secret set FIREBASE_PROJECT_ID -b "financial-crypto-dashboard"
gh secret set FIREBASE_STORAGE_BUCKET -b "financial-crypto-dashboard.firebasestorage.app"
gh secret set FIREBASE_MESSAGING_SENDER_ID -b "501318964054"
gh secret set FIREBASE_APP_ID -b "1:501318964054:web:8a193984a849e242c13cf7"
gh secret set FIREBASE_MEASUREMENT_ID -b "G-J10MWNK82T"
```

## Weryfikacja

Po dodaniu secrets:

1. Przejdź do **Settings** → **Secrets and variables** → **Actions**
2. Powinieneś zobaczyć wszystkie 7 secrets na liście
3. Przy następnym push do `main`, workflow automatycznie wygeneruje `firebase-config.js`

## Jak to działa?

1. **Template**: Plik `firebase-config.template.js` zawiera placeholdery (np. `__FIREBASE_API_KEY__`)
2. **GitHub Actions**: Podczas deployment, workflow używa `sed` do zastąpienia placeholderów wartościami z secrets
3. **Generacja**: Powstaje plik `firebase-config.js` z prawdziwą konfiguracją
4. **Deploy**: Plik jest deployowany razem z resztą aplikacji do Azure Static Web Apps

## Bezpieczeństwo

✅ **Dobre praktyki:**
- Secrets są przechowywane bezpiecznie w GitHub
- Nie są widoczne w logach GitHub Actions
- Plik `firebase-config.js` jest w `.gitignore` i nigdy nie jest commitowany do repozytorium
- Tylko template (`firebase-config.template.js`) jest w repozytorium

⚠️ **Uwagi:**
- API Key Firebase dla aplikacji webowych jest publiczny i to jest OK (Firebase ma zabezpieczenia po stronie serwera)
- Pamiętaj jednak o skonfigurowaniu reguł bezpieczeństwa w Firebase Console
- Dodaj ograniczenia API Key w Google Cloud Console (opcjonalne, ale zalecane)

## Development lokalny

Jeśli chcesz testować lokalnie:

1. Skopiuj plik template:
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```

2. Zamień placeholdery na prawdziwe wartości ręcznie w `firebase-config.js`

3. **NIE COMMITUJ** pliku `firebase-config.js` - jest w `.gitignore`

## Dla Azure Static Web Apps

Jeśli chcesz również dodać te zmienne do Azure Static Web Apps (opcjonalne):

1. Przejdź do Azure Portal
2. Otwórz swoją Static Web App
3. W menu wybierz **Configuration**
4. Dodaj te same zmienne jako Application Settings

Jednak dla tego projektu wystarczy konfiguracja przez GitHub Actions, ponieważ plik jest generowany podczas build.

## Troubleshooting

### Problem: Aplikacja nie działa po deployment

Sprawdź w konsoli przeglądarki czy widzisz błąd:
```
Firebase configuration not loaded! Make sure firebase-config.js is properly deployed.
```

**Rozwiązanie:**
- Upewnij się, że wszystkie 7 secrets są dodane w GitHub
- Sprawdź logi GitHub Actions czy krok "Generate Firebase Config" zakończył się sukcesem
- Zweryfikuj nazwy secrets - muszą być dokładnie takie jak w workflow

### Problem: Secrets nie działają

1. Sprawdź czy nazwy secrets są dokładnie takie jak w pliku workflow
2. Upewnij się, że wartości nie mają dodatkowych spacji na początku/końcu
3. Sprawdź czy workflow ma uprawnienia do odczytu secrets

## Kontakt

W razie problemów skontaktuj się z zespołem deweloperskim.

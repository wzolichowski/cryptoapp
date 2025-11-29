// App state i konfiguracja
const AppState = {
    currentView: 'dashboard',
    baseCurrency: 'PLN',
    currencies: [],
    cryptos: [],
    user: null,
    lastUpdate: null,
    favorites: []
};

const FIREBASE_API_URL =
  "https://us-central1-financial-crypto-dashboard.cloudfunctions.net/getLatestRates";

const API_CONFIG = {
    exchangeRate: 'https://api.exchangerate-api.com/v4/latest/',
    crypto: 'https://api.coingecko.com/api/v3/simple/price',
    nbp: 'https://api.nbp.pl/api/exchangerates/tables/A/?format=json'
};

const POPULAR_CURRENCIES = [
    { code: 'USD', name: 'Dolar amerykański', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'Funt brytyjski', symbol: '£', flag: '🇬🇧' },
    { code: 'CHF', name: 'Frank szwajcarski', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'JPY', name: 'Jen japoński', symbol: '¥', flag: '🇯🇵' },
    { code: 'CAD', name: 'Dolar kanadyjski', symbol: 'C$', flag: '🇨🇦' },
    { code: 'AUD', name: 'Dolar australijski', symbol: 'A$', flag: '🇦🇺' },
    { code: 'NOK', name: 'Korona norweska', symbol: 'kr', flag: '🇳🇴' },
    { code: 'SEK', name: 'Korona szwedzka', symbol: 'kr', flag: '🇸🇪' },
    { code: 'DKK', name: 'Korona duńska', symbol: 'kr', flag: '🇩🇰' },
    { code: 'CZK', name: 'Korona czeska', symbol: 'Kč', flag: '🇨🇿' },
    { code: 'HUF', name: 'Forint węgierski', symbol: 'Ft', flag: '🇭🇺' }
];

const POPULAR_CRYPTOS = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
    { id: 'binancecoin', name: 'Binance Coin', symbol: 'BNB', icon: 'BNB' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: 'ADA' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', icon: 'SOL' },
    { id: 'ripple', name: 'Ripple', symbol: 'XRP', icon: 'XRP' }
];

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

function formatCurrency(num, currency = 'PLN') {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: currency
    }).format(num);
}

function calculateChange(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
}

function getRandomChange() {
    return (Math.random() * 4 - 2).toFixed(2);
}

function loadFavoritesFromStorage() {
    const saved = localStorage.getItem('favorites');
    if (saved) {
        AppState.favorites = JSON.parse(saved);
    }
}

function saveFavoritesToStorage() {
    localStorage.setItem('favorites', JSON.stringify(AppState.favorites));
}

function isFavorite(code, type) {
    return AppState.favorites.some(f => f.code === code && f.type === type);
}

function toggleFavorite(code, type) {
    const index = AppState.favorites.findIndex(f => f.code === code && f.type === type);
    
    if (index >= 0) {
        AppState.favorites.splice(index, 1);
        const name = type === 'crypto' ? 
            AppState.cryptos.find(c => c.id === code)?.name : 
            AppState.currencies.find(c => c.code === code)?.name;
        showToast(`${name || code} usunięto z ulubionych`, 'info');
    } else {
        AppState.favorites.unshift({ code, type });
        const name = type === 'crypto' ? 
            AppState.cryptos.find(c => c.id === code)?.name : 
            AppState.currencies.find(c => c.code === code)?.name;
        showToast(`${name || code} dodano do ulubionych`, 'success');
    }
    
    saveFavoritesToStorage();
    updateCurrencyTable();
    updateCryptoTable();
    renderFavoritesCards();
}

function renderFavoritesCards() {
    const favoritesSection = document.getElementById('favoritesSection');
    const favoritesGrid = document.getElementById('favoritesGrid');
    
    if (AppState.favorites.length === 0) {
        favoritesSection.style.display = 'none';
        return;
    }
    
    favoritesSection.style.display = 'block';
    
    const cards = AppState.favorites.map((fav, index) => {
        if (fav.type === 'currency') {
            const currency = AppState.currencies.find(c => c.code === fav.code);
            if (!currency) return '';
            
            const change = parseFloat(currency.change);
            const colors = ['blue', 'yellow', 'green', 'purple'];
            const color = colors[index % colors.length];
            
            return `
                <div class="stat-card" onclick="showDetails('${currency.code}')" style="cursor: pointer;">
                    <div class="stat-icon stat-icon-${color}">
                        ${currency.flag}
                    </div>
                    <div class="stat-content">
                        <h3>${currency.code}/PLN</h3>
                        <p class="stat-value">${formatNumber(currency.rate, 4)}</p>
                        <span class="stat-change ${change >= 0 ? 'positive' : 'negative'}">
                            ${change > 0 ? '+' : ''}${change}%
                        </span>
                    </div>
                </div>
            `;
        } else {
            const crypto = AppState.cryptos.find(c => c.id === fav.code);
            if (!crypto) return '';
            
            const change = parseFloat(crypto.change24h);
            const colors = ['blue', 'yellow', 'green', 'purple'];
            const color = colors[index % colors.length];
            
            return `
                <div class="stat-card" onclick="showCryptoDetails('${crypto.id}')" style="cursor: pointer;">
                    <div class="stat-icon stat-icon-${color}">
                        ${crypto.symbol}
                    </div>
                    <div class="stat-content">
                        <h3>${crypto.symbol}</h3>
                        <p class="stat-value">${formatCurrency(crypto.pricePLN)}</p>
                        <span class="stat-change ${change >= 0 ? 'positive' : 'negative'}">
                            ${change > 0 ? '+' : ''}${change}%
                        </span>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    favoritesGrid.innerHTML = cards;
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.dataset.view;
            if (!viewName) return;
            
            switchView(viewName);
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    const logoBtn = document.querySelector('.logo');
    if (logoBtn) {
        logoBtn.style.cursor = 'pointer';
        logoBtn.addEventListener('click', () => {
            switchView('dashboard');
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-view="dashboard"]')?.classList.add('active');
        });
    }
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const selectedView = document.getElementById(viewName);
    if (selectedView) {
        selectedView.classList.add('active');
        AppState.currentView = viewName;
        
        if (viewName === 'crypto') {
            loadCryptoData();
        } else if (viewName === 'profile') {
            renderProfile();
        }
    }
}

async function fetchExchangeRates(base = 'PLN') {
    try {
        const response = await fetch(FIREBASE_API_URL);
        if (!response.ok) {
            throw new Error("Błąd komunikacji z backendem (NBP)");
        }

        const data = await response.json();
        const rawRates = data?.nbp?.raw?.[0]?.rates;

        if (!Array.isArray(rawRates)) {
            console.error("NBP: brak poprawnej tablicy rates w odpowiedzi", data);
            return null;
        }

        const ratesByCode = {};
        for (const rate of rawRates) {
            if (rate.code && typeof rate.mid === "number") {
                ratesByCode[rate.code] = rate.mid;
            }
        }

        return ratesByCode;
    } catch (e) {
        console.error("NBP fetch error:", e);
        showToast("Błąd pobierania kursów NBP (backend)", "error");
        return null;
    }
}

async function fetchCryptoRates() {
   try {
        const response = await fetch(FIREBASE_API_URL);
        if (!response.ok) {
            throw new Error("Błąd komunikacji z backendem");
        }

        const data = await response.json();
        const prices = data?.coingecko?.prices;

        if (!prices) {
            throw new Error("Brak danych krypto w odpowiedzi serwera");
        }

        return prices;
    } catch (error) {
        console.error("Error fetching crypto rates from backend:", error);
        showToast("Błąd pobierania kursów krypto (backend)", "error");
        return null;
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch(FIREBASE_API_URL);
        if (!response.ok) {
            throw new Error("Błąd komunikacji z backendem");
        }

        const data = await response.json();

        const rawRates = data?.nbp?.raw?.[0]?.rates;
        if (!Array.isArray(rawRates)) {
            console.error("NBP: niepoprawna struktura danych", data);
        }

        const ratesByCode = {};
        if (Array.isArray(rawRates)) {
            for (const rate of rawRates) {
                if (rate.code && typeof rate.mid === "number") {
                    ratesByCode[rate.code] = rate.mid;
                }
            }
        }

        AppState.currencies = POPULAR_CURRENCIES.map(curr => ({
            ...curr,
            rate: ratesByCode[curr.code] ?? 0,
            change: 0
        }));

        const prices = data?.coingecko?.prices || {};

        AppState.cryptos = POPULAR_CRYPTOS.map(crypto => {
            const p = prices[crypto.id] || {};
            const pln = typeof p.pln === "number" ? p.pln : 0;
            const usd = typeof p.usd === "number" ? p.usd : 0;

            let change24h = null;
            if (typeof p.pln_24h_change === "number") {
                change24h = Number(p.pln_24h_change.toFixed(2));
            } else if (typeof p.usd_24h_change === "number") {
                change24h = Number(p.usd_24h_change.toFixed(2));
            } else {
                change24h = 0;
            }

            return {
                ...crypto,
                pricePLN: pln,
                priceUSD: usd,
                change24h
            };
        });

        AppState.lastUpdate = new Date().toLocaleString("pl-PL");

        updateCurrencyTable();
        updateCryptoTable();
        renderFavoritesCards();
        updateLastUpdateTime();

    } catch (error) {
        console.error("Błąd w loadDashboardData:", error);
        showToast("Błąd ładowania danych z backendu", "error");
    }
}

function updateCurrencyTable() {
    const tbody = document.getElementById('currencyTableBody');
    
    if (AppState.currencies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    <p>Brak danych do wyświetlenia</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedCurrencies = [...AppState.currencies].sort((a, b) => {
        const aIsFav = isFavorite(a.code, 'currency');
        const bIsFav = isFavorite(b.code, 'currency');
        
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return 0;
    });
    
    tbody.innerHTML = sortedCurrencies.map(currency => {
        const change = parseFloat(currency.change);
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeIcon = change >= 0 ? '↑' : '↓';
        const isFav = isFavorite(currency.code, 'currency');
        
        return `
            <tr data-currency="${currency.code}" onclick="showDetails('${currency.code}')" style="cursor: pointer;">
                <td>
                    <div class="currency-name">
                        <span style="font-size: 1.5rem;">${currency.flag}</span>
                        <span>${currency.name}</span>
                    </div>
                </td>
                <td>
                    <span class="currency-code">${currency.code}</span>
                </td>
                <td>
                    <span class="rate-value">${formatNumber(currency.rate, 4)}</span>
                </td>
                <td>
                    <span class="change-badge ${changeClass}">
                        ${changeIcon} ${Math.abs(change)}%
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn ${isFav ? 'favorite-active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${currency.code}', 'currency')" title="${isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}">
                            <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateCryptoTable() {
    const tbody = document.getElementById('cryptoTableBody');
    
    if (AppState.cryptos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    <p>Brak danych do wyświetlenia</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedCryptos = [...AppState.cryptos].sort((a, b) => {
        const aIsFav = isFavorite(a.id, 'crypto');
        const bIsFav = isFavorite(b.id, 'crypto');
        
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return 0;
    });
    
    tbody.innerHTML = sortedCryptos.map(crypto => {
        const change = parseFloat(crypto.change24h);
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeIcon = change >= 0 ? '↑' : '↓';
        const isFav = isFavorite(crypto.id, 'crypto');
        
        return `
            <tr data-crypto="${crypto.id}" onclick="showCryptoDetails('${crypto.id}')" style="cursor: pointer;">
                <td>
                    <div class="currency-name">
                        <span style="font-size: 1.5rem;">${crypto.icon}</span>
                        <span>${crypto.name}</span>
                    </div>
                </td>
                <td>
                    <span class="currency-code">${crypto.symbol}</span>
                </td>
                <td>
                    <span class="rate-value">${formatCurrency(crypto.pricePLN)}</span>
                </td>
                <td>
                    <span class="change-badge ${changeClass}">
                        ${changeIcon} ${Math.abs(change)}%
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn ${isFav ? 'favorite-active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${crypto.id}', 'crypto')" title="${isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}">
                            <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateLastUpdateTime() {
    const updateElement = document.getElementById('lastUpdate');
    if (updateElement && AppState.lastUpdate) {
        updateElement.textContent = AppState.lastUpdate;
    }
}

async function loadCryptoData() {
    const cryptoGrid = document.getElementById('cryptoGrid');
    cryptoGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Ładowanie...</p></div>';
    
    const rates = await fetchCryptoRates();
    
    if (!rates) {
        cryptoGrid.innerHTML = '<div class="loading"><p>Błąd ładowania danych</p></div>';
        return;
    }
    
    AppState.cryptos = POPULAR_CRYPTOS.map(crypto => ({
        ...crypto,
        pricePLN: rates[crypto.id]?.pln || 0,
        priceUSD: rates[crypto.id]?.usd || 0,
        change24h: typeof rates[crypto.id]?.pln_24h_change !== 'undefined'
            ? Number(rates[crypto.id].pln_24h_change.toFixed(2))
            : (typeof rates[crypto.id]?.usd_24h_change !== 'undefined'
                ? Number(rates[crypto.id].usd_24h_change.toFixed(2))
                : getRandomChange())
    }));
    
    renderCryptoGrid();
}

function renderCryptoGrid() {
    const cryptoGrid = document.getElementById('cryptoGrid');
    
    cryptoGrid.innerHTML = AppState.cryptos.map(crypto => {
        const change = parseFloat(crypto.change24h);
        const changeClass = change >= 0 ? 'positive' : 'negative';
        
        return `
            <div class="crypto-card" onclick="showCryptoDetails('${crypto.id}')">
                <div class="crypto-header">
                    <div class="crypto-icon">${crypto.icon}</div>
                    <div class="crypto-info">
                        <h3>${crypto.name}</h3>
                        <span class="crypto-code">${crypto.symbol}</span>
                    </div>
                </div>
                <div class="crypto-price">
                    ${formatCurrency(crypto.pricePLN)}
                </div>
                <div class="stat-change ${changeClass}">
                    ${change > 0 ? '+' : ''}${change}% (24h)
                </div>
            </div>
        `;
    }).join('');
}

function renderProfile() {
    const profileContent = document.getElementById('profileContent');
    updateLogoutButton();
    
    if (AppState.user) {
        profileContent.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar">
                    ${AppState.user.photoURL ? 
                        `<img src="${AppState.user.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <h2>${AppState.user.name}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${AppState.user.email}</p>
                <p style="color: var(--text-light); font-size: 0.875rem;">
                    <i class="fas fa-info-circle"></i>
                    Użyj przycisku "Wyloguj" w górnym menu, aby się wylogować
                </p>
            </div>
        `;
    } else {
        profileContent.innerHTML = `
            <div class="auth-container">
                <div class="auth-welcome">
                    <div class="auth-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h2>Witaj w Kursy Walut</h2>
                    <p>Zaloguj się, aby śledzić swoje ulubione waluty i kryptowaluty</p>
                </div>
                
                <div class="auth-buttons" id="authButtons">
                    <button class="btn btn-google" onclick="handleGoogleLogin()">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Kontynuuj z Google
                    </button>
                    
                    <div class="auth-divider">
                        <span>lub</span>
                    </div>
                    
                    <button class="btn btn-primary btn-large" onclick="showLoginForm()">
                        <i class="fas fa-envelope"></i>
                        Zaloguj się przez e-mail
                    </button>
                    
                    <button class="btn btn-outline btn-large" onclick="showRegisterForm()">
                        <i class="fas fa-user-plus"></i>
                        Utwórz nowe konto
                    </button>
                </div>
                <div id="authFormContainer"></div>
            </div>
        `;
    }
}

function updateLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = AppState.user ? 'flex' : 'none';
    }
}

function handleGoogleLogin() {
    // TODO: Zastąpić Firebase Auth signInWithPopup()
    showToast('Logowanie przez Google będzie dostępne wkrótce', 'info');
}

function showLoginForm() {
    const container = document.getElementById('authFormContainer');
    const buttons = document.getElementById('authButtons');
    
    buttons.style.display = 'none';
    
    container.innerHTML = `
        <div class="login-form">
            <div class="form-header">
                <h2>Zaloguj się</h2>
                <p>Wprowadź swoje dane logowania</p>
            </div>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label for="loginEmail">
                        <i class="fas fa-envelope"></i>
                        Email
                    </label>
                    <input type="email" id="loginEmail" required placeholder="">
                </div>
                <div class="form-group">
                    <label for="loginPassword">
                        <i class="fas fa-lock"></i>
                        Hasło
                    </label>
                    <input type="password" id="loginPassword" required placeholder="Wprowadź hasło">
                </div>
                <div class="form-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="rememberMe">
                        <span>Zapamiętaj mnie</span>
                    </label>
                    <a href="#" class="forgot-link" onclick="event.preventDefault(); showForgotPasswordForm()">Zapomniałeś hasła?</a>
                </div>
                <button type="submit" class="btn btn-primary btn-full">
                    <i class="fas fa-sign-in-alt"></i>
                    Zaloguj się
                </button>
            </form>
            <div class="form-footer">
                <p>Nie masz konta? <a href="#" onclick="event.preventDefault(); showRegisterForm()">Zarejestruj się</a></p>
            </div>
            <button class="btn btn-text" onclick="renderProfile()">
                <i class="fas fa-arrow-left"></i>
                Powrót do opcji logowania
            </button>
        </div>
    `;
}

function showRegisterForm() {
    const container = document.getElementById('authFormContainer');
    const buttons = document.getElementById('authButtons');
    
    buttons.style.display = 'none';
    
    container.innerHTML = `
        <div class="login-form">
            <div class="form-header">
                <h2>Utwórz konto</h2>
                <p>Wypełnij formularz, aby się zarejestrować</p>
            </div>
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label for="registerName">
                        <i class="fas fa-user"></i>
                        Imię i nazwisko
                    </label>
                    <input type="text" id="registerName" required placeholder="Jan Kowalski">
                </div>
                <div class="form-group">
                    <label for="registerEmail">
                        <i class="fas fa-envelope"></i>
                        Email
                    </label>
                    <input type="email" id="registerEmail" required placeholder="twoj@email.com">
                </div>
                <div class="form-group">
                    <label for="registerPassword">
                        <i class="fas fa-lock"></i>
                        Hasło
                    </label>
                    <input type="password" id="registerPassword" required placeholder="Minimum 6 znaków" minlength="6">
                </div>
                <div class="form-group">
                    <label for="registerPasswordConfirm">
                        <i class="fas fa-lock"></i>
                        Potwierdź hasło
                    </label>
                    <input type="password" id="registerPasswordConfirm" required placeholder="Powtórz hasło" minlength="6">
                </div>
                <div class="form-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="acceptTerms" required>
                        <span>Akceptuję <a href="#" onclick="event.preventDefault(); showToast('Regulamin będzie dostępny wkrótce', 'info')">regulamin</a> i <a href="#" onclick="event.preventDefault(); showToast('Polityka prywatności będzie dostępna wkrótce', 'info')">politykę prywatności</a></span>
                    </label>
                </div>
                <button type="submit" class="btn btn-primary btn-full">
                    <i class="fas fa-user-plus"></i>
                    Zarejestruj się
                </button>
            </form>
            <div class="form-footer">
                <p>Masz już konto? <a href="#" onclick="event.preventDefault(); showLoginForm()">Zaloguj się</a></p>
            </div>
            <button class="btn btn-text" onclick="renderProfile()">
                <i class="fas fa-arrow-left"></i>
                Powrót do opcji logowania
            </button>
        </div>
    `;
}

function showForgotPasswordForm() {
    const container = document.getElementById('authFormContainer');
    const buttons = document.getElementById('authButtons');
    
    buttons.style.display = 'none';
    
    container.innerHTML = `
        <div class="login-form">
            <div class="form-header">
                <h2>Resetowanie hasła</h2>
                <p>Podaj swój adres e-mail, a wyślemy Ci link do zresetowania hasła</p>
            </div>
            <form onsubmit="handleForgotPassword(event)">
                <div class="form-group">
                    <label for="resetEmail">
                        <i class="fas fa-envelope"></i>
                        Email
                    </label>
                    <input type="email" id="resetEmail" required placeholder="twoj@email.com">
                </div>
                <button type="submit" class="btn btn-primary btn-full">
                    <i class="fas fa-paper-plane"></i>
                    Wyślij link resetujący
                </button>
            </form>
            <div class="form-footer">
                <p>Pamiętasz hasło? <a href="#" onclick="event.preventDefault(); showLoginForm()">Zaloguj się</a></p>
            </div>
            <button class="btn btn-text" onclick="renderProfile()">
                <i class="fas fa-arrow-left"></i>
                Powrót do opcji logowania
            </button>
        </div>
    `;
}

function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    // TODO: Zastąpić Firebase Auth sendPasswordResetEmail()
    if (email) {
        showToast('Link do resetowania hasła został wysłany na ' + email, 'success');
        
        setTimeout(() => {
            showLoginForm();
        }, 2000);
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // TODO: Zastąpić Firebase Auth
    if (email && password) {
        AppState.user = {
            name: email.split('@')[0],
            email: email
        };
        
        showToast('Zalogowano pomyślnie!', 'success');
        renderProfile();
        updateLogoutButton();
        localStorage.setItem('user', JSON.stringify(AppState.user));
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('Hasła nie są identyczne!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Hasło musi mieć minimum 6 znaków!', 'error');
        return;
    }
    
    // TODO: Zastąpić Firebase Auth
    if (name && email && password) {
        AppState.user = {
            name: name,
            email: email
        };
        
        showToast('Konto utworzone! Witaj ' + name + '! 🎉', 'success');
        renderProfile();
        updateLogoutButton();
        localStorage.setItem('user', JSON.stringify(AppState.user));
    }
}

function logout() {
    AppState.user = null;
    localStorage.removeItem('user');
    showToast('Wylogowano', 'info');
    updateLogoutButton();
    
    setTimeout(() => {
        location.reload();
    }, 500);
}

function showDetails(code) {
    const currency = AppState.currencies.find(c => c.code === code);
    if (!currency) return;
    
    document.getElementById('modalItemName').textContent = currency.name;
    document.getElementById('modalItemIcon').textContent = currency.flag;
    
    const change = parseFloat(currency.change);
    const detailInfo = `
        <div class="detail-row">
            <span class="detail-label">Kod:</span>
            <span class="detail-value">${currency.code}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Symbol:</span>
            <span class="detail-value">${currency.symbol}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Kurs (${AppState.baseCurrency}):</span>
            <span class="detail-value">${formatNumber(currency.rate, 4)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Zmiana 24h:</span>
            <span class="detail-value stat-change ${change >= 0 ? 'positive' : 'negative'}">${change > 0 ? '+' : ''}${change}%</span>
        </div>
    `;
    
    document.getElementById('modalDetailInfo').innerHTML = detailInfo;
    document.getElementById('detailModal').style.display = 'flex';
}

function showCryptoDetails(id) {
    const crypto = AppState.cryptos.find(c => c.id === id);
    if (!crypto) return;
    
    document.getElementById('modalItemName').textContent = crypto.name;
    document.getElementById('modalItemIcon').textContent = crypto.symbol;
    
    const change = parseFloat(crypto.change24h);
    const detailInfo = `
        <div class="detail-row">
            <span class="detail-label">Symbol:</span>
            <span class="detail-value">${crypto.symbol}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Cena (PLN):</span>
            <span class="detail-value">${formatCurrency(crypto.pricePLN)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Cena (USD):</span>
            <span class="detail-value">$${formatNumber(crypto.priceUSD, 2)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Zmiana 24h:</span>
            <span class="detail-value stat-change ${change >= 0 ? 'positive' : 'negative'}">${change > 0 ? '+' : ''}${change}%</span>
        </div>
    `;
    
    document.getElementById('modalDetailInfo').innerHTML = detailInfo;
    document.getElementById('detailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('detailModal');
    if (e.target === modal) {
        closeDetailModal();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('detailModal');
        if (modal.style.display === 'flex') {
            closeDetailModal();
        }
    }
});

function initSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const baseCurrencySelect = document.getElementById('baseCurrency');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    searchInput?.addEventListener('input', (e) => {
        filterCurrencies(e.target.value);
    });
    
    baseCurrencySelect?.addEventListener('change', (e) => {
        AppState.baseCurrency = e.target.value;
        loadDashboardData();
    });
    
    refreshBtn?.addEventListener('click', () => {
        showToast('Odświeżanie danych...', 'info');
        loadDashboardData();
    });
    
    exportBtn?.addEventListener('click', exportData);
}

function filterCurrencies(searchTerm) {
    const rows = document.querySelectorAll('#currencyTableBody tr');
    const term = (searchTerm || '').toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function exportData() {
    const csvContent = [
        ['Waluta', 'Kod', 'Kurs', 'Zmiana 24h'],
        ...AppState.currencies.map(c => [c.name, c.code, c.rate, c.change])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kursy_walut_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    showToast('Dane wyeksportowane!', 'success');
}

function checkOnlineStatus() {
    const statusElement = document.getElementById('installStatus');
    
    function updateStatus() {
        if (navigator.onLine) {
            statusElement.textContent = 'Status: Online';
            statusElement.style.color = '#10b981';
        } else {
            statusElement.textContent = 'Status: Offline';
            statusElement.style.color = '#ef4444';
        }
    }
    
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
}

function loadUserFromStorage() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initiation');
    
    loadUserFromStorage();
    loadFavoritesFromStorage();
    initNavigation();
    initSearchAndFilter();
    checkOnlineStatus();
    loadDashboardData();
    updateLogoutButton();
    
    setInterval(() => {
        if (AppState.currentView === 'dashboard') {
            loadDashboardData();
        }
    }, 5 * 60 * 1000);
    
    console.log('All set!')
});
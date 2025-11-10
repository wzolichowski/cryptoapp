// App state i konfiguracja
const AppState = {
    currentView: 'dashboard',
    baseCurrency: 'PLN',
    currencies: [],
    cryptos: [],
    user: null,
    lastUpdate: null,
    favorites: [] // { type: 'currency' | 'crypto', code: 'USD' | 'bitcoin' }
};

const API_CONFIG = {
    exchangeRate: 'https://api.exchangerate-api.com/v4/latest/',
    crypto: 'https://api.coingecko.com/api/v3/simple/price',
    nbp: 'https://api.nbp.pl/api/exchangerates/tables/A/?format=json'
};

// Lista glownych walut ktore wswietlamy = mysle ze chyba trzeba dodac tu krypto - co sadzicie ?
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

// Małe helpery formatowanie toast i liczb
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
    // DEMO: losowa zmiana 24h, używamy tylko jako fallback
    // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - podmianka na API 
    return (Math.random() * 4 - 2).toFixed(2);
}

// system ulubionych
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
        // usun z ulubionych
        AppState.favorites.splice(index, 1);
        const name = type === 'crypto' ? 
            AppState.cryptos.find(c => c.id === code)?.name : 
            AppState.currencies.find(c => c.code === code)?.name;
        showToast(`${name || code} usunięto z ulubionych`, 'info');
    } else {
        // dodaj do ulubionych (bez limitu)
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
// header button
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.dataset.view;
            switchView(viewName);
            
            // zaznacz aktywny przycisk
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // logo jako button do dashboardu
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

// Przełączanie widoków 
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const selectedView = document.getElementById(viewName);
    if (selectedView) {
        selectedView.classList.add('active');
        AppState.currentView = viewName;
        
        // ładujemy dane 
        if (viewName === 'crypto' && AppState.cryptos.length === 0) {
            loadCryptoData();
        } else if (viewName === 'charts') {
            loadChartData();
        } else if (viewName === 'profile') {
            renderProfile();
        }
    }
}

// Fetch kursów walut (publiczne API)
async function fetchExchangeRates(base = 'PLN') {
    try {
        const response = await fetch(`${API_CONFIG.exchangeRate}${base}`);
        if (!response.ok) throw new Error('Błąd pobierania danych');
        
        const data = await response.json();
        return data.rates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        showToast('Błąd pobierania kursów walut', 'error');
        return null;
    }
}

// Fetch cen krypto z CoinGecko
async function fetchCryptoRates() {
    try {
        const ids = POPULAR_CRYPTOS.map(c => c.id).join(',');
        const response = await fetch(
            `${API_CONFIG.crypto}?ids=${ids}&vs_currencies=pln,usd&include_24hr_change=true`
        );
        
        if (!response.ok) throw new Error('Błąd pobierania danych krypto');
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching crypto rates:', error);
        showToast('Błąd pobierania kursów kryptowalut', 'error');
        return null;
    }
}

// Ładowanie danych do dashboardu
async function loadDashboardData() {
    const rates = await fetchExchangeRates(AppState.baseCurrency);
    
    if (!rates) return;
    
    AppState.currencies = POPULAR_CURRENCIES.map(curr => ({
        ...curr,
        rate: rates[curr.code] || 0,
        change: getRandomChange() // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - zastąpić realnym 24h change
    }));
    
    AppState.lastUpdate = new Date().toLocaleString('pl-PL');
    
    updateCurrencyTable();
    updateLastUpdateTime();
    
    // ładujemy też krypto do dashboardu
    loadDashboardCrypto();
}

// Render tabeli walut 
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
    
    // sortowanie - ulubione najpierw
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

// Ładowanie krypto do dashboardu
async function loadDashboardCrypto() {
    const cryptoTableBody = document.getElementById('cryptoTableBody');
    cryptoTableBody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner"></div><p>Ładowanie...</p></td></tr>';
    
    const rates = await fetchCryptoRates();
    
    if (!rates) {
        cryptoTableBody.innerHTML = '<tr><td colspan="5" class="loading"><p>Błąd ładowania danych</p></td></tr>';
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
                : getRandomChange()) // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - fallback
    }));
    
    updateCryptoTable();
    renderFavoritesCards();
}

// Render tabeli krypto na dashboardzie
// Render tabeli krypto na dashboardzie
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
    
    // sortowanie - ulubione najpierw
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

// Aktualizacja czasu ostatniego odświeżenia
function updateLastUpdateTime() {
    const updateElement = document.getElementById('lastUpdate');
    if (updateElement && AppState.lastUpdate) {
        updateElement.textContent = AppState.lastUpdate;
    }
}

// Ładowanie krypto
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
                : getRandomChange()) // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - fallback
    }));
    
    renderCryptoGrid();
}

// Render siatki krypto
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

// Wykresy (mockowane dane demo)
function loadChartData() {
    const canvas = document.getElementById('currencyChart');
    const ctx = canvas.getContext('2d');
    
    // Clear previous chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate mock historical data
    // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - podmienić na rzeczywiste dane z API 
    const days = 7;
    const labels = [];
    const data = [];
    const baseRate = 4.0;
    
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }));
        data.push(baseRate + (Math.random() * 0.2 - 0.1));
    }
    
    drawChart(ctx, canvas, labels, data);
    
    // Reaktywacja kkontrolek konfiguracyjnych
    document.getElementById('chartCurrency')?.addEventListener('change', loadChartData);
    document.getElementById('chartPeriod')?.addEventListener('change', loadChartData);
}

// canvas tworzenie wykresu
function drawChart(ctx, canvas, labels, data) {
    const padding = 40;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;
    
    // rozmiar canvas ( wiekszy ) 
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1; // guard przed 0 
    
    // Oś i siatka graph
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Linia wartości grafu
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = padding + (width / (data.length - 1)) * index;
        const y = canvas.height - padding - ((value - minValue) / range) * height;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Punkty na grafie 
    ctx.fillStyle = '#1e40af';
    data.forEach((value, index) => {
        const x = padding + (width / (data.length - 1)) * index;
        const y = canvas.height - padding - ((value - minValue) / range) * height;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Opisy osi grafu
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    labels.forEach((label, index) => {
        const x = padding + (width / (data.length - 1)) * index;
        ctx.fillText(label, x, canvas.height - padding + 20);
    });
    
    // Wartości po lewej osi
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = minValue + (range / 5) * (5 - i);
        const y = padding + (height / 5) * i;
        ctx.fillText(formatNumber(value, 2), padding - 10, y + 5);
    }
}

// Profil użytkownika i autoryzacja (demo lokalne)
function renderProfile() {
    const profileContent = document.getElementById('profileContent');
    
    if (AppState.user) {
        // Dane usera bez dodatkowego sanityzowania.
        // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - zamienić na bezpieczne renderowanie z backendu/session
        profileContent.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <h2>${AppState.user.name}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">${AppState.user.email}</p>
                <button class="btn btn-secondary" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Wyloguj
                </button>
            </div>
        `;
    } else {
        profileContent.innerHTML = `
            <div class="auth-container">
                <div class="auth-buttons" id="authButtons">
                    <button class="btn btn-primary btn-large" onclick="showLoginForm()">
                        <i class="fas fa-sign-in-alt"></i>
                        Zaloguj się
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="showRegisterForm()">
                        <i class="fas fa-user-plus"></i>
                        Zarejestruj się
                    </button>
                </div>
                <div id="authFormContainer"></div>
            </div>
        `;
    }
}

function showLoginForm() {
    const container = document.getElementById('authFormContainer');
    const buttons = document.getElementById('authButtons');
    
    buttons.style.display = 'none';
    
    container.innerHTML = `
        <div class="login-form">
            <h2 style="text-align: center; margin-bottom: 2rem;">
                <i class="fas fa-sign-in-alt"></i>
                Zaloguj się
            </h2>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" required placeholder="twoj@email.com">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Hasło</label>
                    <input type="password" id="loginPassword" required placeholder="">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                    <i class="fas fa-sign-in-alt"></i>
                    Zaloguj
                </button>
            </form>
            <button class="btn btn-secondary" onclick="renderProfile()" style="width: 100%;">
                <i class="fas fa-arrow-left"></i>
                Powrót
            </button>
            <p style="text-align: center; margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
                💡 DEMO: login lokalny — DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE
            </p>
        </div>
    `;
}

function showRegisterForm() {
    const container = document.getElementById('authFormContainer');
    const buttons = document.getElementById('authButtons');
    
    buttons.style.display = 'none';
    
    container.innerHTML = `
        <div class="login-form">
            <h2 style="text-align: center; margin-bottom: 2rem;">
                <i class="fas fa-user-plus"></i>
                Rejestracja
            </h2>
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label for="registerName">Imię i nazwisko</label>
                    <input type="text" id="registerName" required placeholder="Jan Kowalski">
                </div>
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" required placeholder="twoj@email.com">
                </div>
                <div class="form-group">
                    <label for="registerPassword">Hasło</label>
                    <input type="password" id="registerPassword" required placeholder="" minlength="6">
                </div>
                <div class="form-group">
                    <label for="registerPasswordConfirm">Potwierdź hasło</label>
                    <input type="password" id="registerPasswordConfirm" required placeholder="" minlength="6">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                    <i class="fas fa-user-plus"></i>
                    Zarejestruj się
                </button>
            </form>
            <button class="btn btn-secondary" onclick="renderProfile()" style="width: 100%;">
                <i class="fas fa-arrow-left"></i>
                Powrót
            </button>
            <p style="text-align: center; margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
                💡 DEMO: rejestracja lokalna — DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE
            </p>
        </div>
    `;
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // DEMO login lokalny — DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE (backend auth)
    if (email && password) {
        AppState.user = {
            name: email.split('@')[0],
            email: email
        };
        
        showToast('Zalogowano pomyślnie!', 'success');
        renderProfile();
        localStorage.setItem('user', JSON.stringify(AppState.user)); // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE nie trzymać sesji w localStorage w produkcji 
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
    
    // DEMO: lokalna rejestracja — DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE
    if (name && email && password) {
        AppState.user = {
            name: name,
            email: email
        };
        
        showToast('Konto utworzone! Witaj ' + name + '! 🎉', 'success');
        renderProfile();
        localStorage.setItem('user', JSON.stringify(AppState.user)); // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE
    }
}

function logout() {
    AppState.user = null;
    localStorage.removeItem('user'); // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE backend -> logout
    showToast('Wylogowano', 'info');
    renderProfile();
}

function showDetails(code) {
    const currency = AppState.currencies.find(c => c.code === code);
    if (!currency) return;
    
    // wypełniamy modal danymi waluty
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
    
    // pokazujemy modal
    document.getElementById('detailModal').style.display = 'flex';
}

function showCryptoDetails(id) {
    const crypto = AppState.cryptos.find(c => c.id === id);
    if (!crypto) return;
    
    // wypełniamy modal danymi krypto
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
    
    // pokazujemy modal
    document.getElementById('detailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// zamknij modal po kliknieciu poza nim
window.addEventListener('click', (e) => {
    const modal = document.getElementById('detailModal');
    if (e.target === modal) {
        closeDetailModal();
    }
});

// zamknij modal po wciśnięciu ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('detailModal');
        if (modal.style.display === 'flex') {
            closeDetailModal();
        }
    }
});

// Search i filtr
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

// Eksport CSV 
function exportData() {
    // TODO: poprawić escapowanie CSV przed produkcją (obsługa przecinków/cudzysłowów)
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

// Sprawdzanie statusu online/offline
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

// Wczytaj usera z localStorage (demo)
function loadUserFromStorage() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser); // DO USUNIĘCIA JAK JUŻ BĘDZIE ONLINE - api backend
    }
}

// Start aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicjalizacja aplikacji Kursy Walut...');
    
    loadUserFromStorage();
    loadFavoritesFromStorage();
    initNavigation();
    initSearchAndFilter();
    checkOnlineStatus();
    loadDashboardData();
    
    // Auto refresh co 5 minut
    setInterval(() => {
        if (AppState.currentView === 'dashboard') {
            loadDashboardData();
        }
    }, 5 * 60 * 1000);
    
    console.log('✅ Aplikacja gotowa!');
});
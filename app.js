// App state i konfiguracja
const AppState = {
    currentView: 'dashboard',
    baseCurrency: 'PLN',
    currencies: [],
    cryptos: [],
    user: null,
    lastUpdate: null,
    favorites: [],
    previousCurrencyRates: {},
    currentChart: null,  // Aktualny wykres Chart.js
    currentChartData: { type: null, code: null } // Type: 'currency' | 'crypto', code: waluta/crypto ID
};


// === Firebase config & init ===
const firebaseConfig = {
  apiKey: "AIzaSyDcyf2rY050dlVSS6HjTbCjFGraZatPGRY",
  authDomain: "financial-crypto-dashboard.firebaseapp.com",
  projectId: "financial-crypto-dashboard",
  storageBucket: "financial-crypto-dashboard.firebasestorage.app",
  messagingSenderId: "501318964054",
  appId: "1:501318964054:web:8a193984a849e242c13cf7",
  measurementId: "G-J10MWNK82T"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const db = firebase.firestore();

function firebaseLoginEmailPassword(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

function firebaseRegisterEmailPassword(name, email, password) {
    return auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            return cred.user.updateProfile({ displayName: name }).then(() => cred.user);
        });
}

function firebaseLoginWithGoogle() {
    return auth.signInWithPopup(googleProvider);
}

function firebaseSendPasswordResetEmail(email) {
    return auth.sendPasswordResetEmail(email);
}

function firebaseLogout() {
    return auth.signOut();
}

function loadFavoritesFromFirebase() {
    if (!AppState.user || !AppState.user.uid) {
        AppState.favorites = [];
        renderFavoritesCards();
        updateCurrencyTable();
        updateCryptoTable();
        return;
    }

    db.collection('favorites').doc(AppState.user.uid).get()
        .then(async (doc) => {
            if (doc.exists) {
                const data = doc.data();
                AppState.favorites = Array.isArray(data.items) ? data.items : [];
            } else {
                AppState.favorites = [];
            }

            await syncFavoriteCryptosWithPrices();
            renderFavoritesCards();
            updateCurrencyTable();
            updateCryptoTable();
        })
        .catch((error) => {
            console.error('Error loading favorites from Firestore:', error);
            showToast('Nie udało się wczytać ulubionych z chmury', 'error');
        });
}


function saveFavoritesToFirebase() {
    if (!AppState.user || !AppState.user.uid) {
        return;
    }

    db.collection('favorites').doc(AppState.user.uid).set({
        items: AppState.favorites
    }, { merge: true })
    .catch((error) => {
        console.error('Error saving favorites to Firestore:', error);
        showToast('Nie udało się zapisać ulubionych w chmurze', 'error');
    });
}

const FIREBASE_API_URL =
  "https://us-central1-financial-crypto-dashboard.cloudfunctions.net/getLatestRates";

const API_CONFIG = {
    exchangeRate: 'https://api.exchangerate-api.com/v4/latest/',
    crypto: 'https://api.coingecko.com/api/v3/simple/price',
    nbp: 'https://api.nbp.pl/api/exchangerates/tables/A/?format=json'
};

const COINGECKO_SEARCH_URL = 'https://api.coingecko.com/api/v3/search?query=';
const COINGECKO_SIMPLE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets';


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

function isFavorite(code, type) {
    return AppState.favorites.some(f => f.code === code && f.type === type);
}

function toggleFavorite(code, type) {
    const index = AppState.favorites.findIndex(f => f.code === code && f.type === type);
    
    if (index >= 0) {
        AppState.favorites.splice(index, 1);
        const cryptoData = AppState.cryptos.find(c => c.id === code);
        const currencyData = AppState.currencies.find(c => c.code === code);
        const name = type === 'crypto'
            ? cryptoData?.name
            : currencyData?.name;
        showToast(`${name || code} usunięto z ulubionych`, 'info');
    } else {
        AppState.favorites.unshift({ code, type });
        const cryptoData = AppState.cryptos.find(c => c.id === code);
        const currencyData = AppState.currencies.find(c => c.code === code);
        const name = type === 'crypto'
            ? cryptoData?.name
            : currencyData?.name;
        showToast(`${name || code} dodano do ulubionych`, 'success');

        if (type === 'crypto' && cryptoData) {
            const exists = AppState.cryptos.some(c => c.id === cryptoData.id);
            if (!exists) {
                AppState.cryptos.push(cryptoData);
            }
        }
    }
    
    saveFavoritesToFirebase();
    updateCurrencyTable();
    updateCryptoTable();
    renderFavoritesCards();
}





function renderFavoritesCards() {
    const currencySection = document.getElementById('favoritesSection');
    const currencyGrid = document.getElementById('favoritesGrid');
    const cryptoSection = document.getElementById('cryptoFavoritesSection');
    const cryptoGrid = document.getElementById('cryptoFavoritesGrid');

    const currencyFavs = AppState.favorites.filter(f => f.type === 'currency');
    const cryptoFavs = AppState.favorites.filter(f => f.type === 'crypto');

    if (currencySection && currencyGrid) {
        if (currencyFavs.length === 0) {
            currencySection.style.display = 'none';
        } else {
            currencySection.style.display = 'block';

            const cards = currencyFavs.map((fav, index) => {
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
            }).join('');

            currencyGrid.innerHTML = cards;
        }
    }

    if (cryptoSection && cryptoGrid) {
        if (cryptoFavs.length === 0) {
            cryptoSection.style.display = 'none';
        } else {
            cryptoSection.style.display = 'block';

            const cards = cryptoFavs.map((fav, index) => {
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
            }).join('');

            cryptoGrid.innerHTML = cards;
        }
    }
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
        
        if (viewName === 'profile') {
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

async function searchAnyCrypto(term) {
    const query = (term || '').trim();

    // za krótki tekst → czyścimy wynik i wracamy do listy bazowej
    if (query.length < 2) {
        AppState.cryptoSearchResults = [];
        renderCryptoAutocomplete([]);
        updateCryptoTable();
        return;
    }

    try {
        const res = await fetch(COINGECKO_SEARCH_URL + encodeURIComponent(query));
        if (!res.ok) {
            throw new Error('Search request failed: ' + res.status);
        }

        const data = await res.json();
        const coins = (data.coins || []).slice(0, 20);

        if (!coins.length) {
            AppState.cryptoSearchResults = [];
            renderCryptoAutocomplete([]);
            updateCryptoTable();

            return;
        }

        const ids = coins.map(c => c.id).join(',');
        const priceRes = await fetch(
            `${COINGECKO_SIMPLE_PRICE_URL}?ids=${ids}&vs_currencies=pln,usd&include_24hr_change=true`
        );
        if (!priceRes.ok) {
            throw new Error('Price request failed: ' + priceRes.status);
        }

        const priceData = await priceRes.json();

        const list = coins.map(c => {
            const p = priceData[c.id] || {};
            const pln = typeof p.pln === 'number' ? p.pln : 0;
            const usd = typeof p.usd === 'number' ? p.usd : 0;

            let change24h = 0;
            if (typeof p.pln_24h_change === 'number') {
                change24h = Number(p.pln_24h_change.toFixed(2));
            } else if (typeof p.usd_24h_change === 'number') {
                change24h = Number(p.usd_24h_change.toFixed(2));
            }

            return {
                id: c.id,
                name: c.name,
                symbol: c.symbol.toUpperCase().substring(0, 3),
                icon: c.symbol.toUpperCase().substring(0, 3),
                pricePLN: pln,
                priceUSD: usd,
                change24h
            };
        });

        AppState.cryptoSearchResults = list;
        renderCryptoAutocomplete(list);
        updateCryptoTable();
    } catch (err) {
        console.error('searchAnyCrypto error:', err);

        AppState.cryptoSearchResults = [];
        renderCryptoAutocomplete([]);
        updateCryptoTable();

        showToast('Błąd wyszukiwania kryptowalut. Spróbuj ponownie za chwilę.', 'error');
    }
}


async function syncFavoriteCryptosWithPrices() {
    const favIds = AppState.favorites
        .filter(f => f.type === 'crypto')
        .map(f => f.code);

    if (!favIds.length) return;

    const existingIds = AppState.cryptos.map(c => c.id);
    const extraIds = favIds.filter(id => !existingIds.includes(id));

    if (!extraIds.length) {
        renderFavoritesCards();
        updateCryptoTable();
        return;
    }

    try {
        const url = COINGECKO_MARKETS_URL
            + '?vs_currency=pln'
            + '&ids=' + extraIds.join(',')
            + '&price_change_percentage=24h';

        const res = await fetch(url);
        if (!res.ok) throw new Error('Coingecko markets failed');

        const data = await res.json();

        const extraCryptos = data.map(c => {
            let change24h = 0;
            if (typeof c.price_change_percentage_24h === 'number') {
                change24h = Number(c.price_change_percentage_24h.toFixed(2));
            }
            return {
                id: c.id,
                name: c.name,
                symbol: c.symbol.toUpperCase().substring(0, 3),
                icon: c.symbol.toUpperCase().substring(0, 3),
                pricePLN: c.current_price,
                priceUSD: 0,
                change24h
            };
        });

        AppState.cryptos = [...AppState.cryptos, ...extraCryptos];

        updateCryptoTable();
        renderFavoritesCards();
    } catch (err) {
        console.error('syncFavoriteCryptosWithPrices error:', err);
    }
}


async function loadDashboardData() {
    try {
        const response = await fetch(FIREBASE_API_URL);
        if (!response.ok) {
            throw new Error("Błąd komunikacji z backendem");
        }

        const data = await response.json();
        console.log('Backend data:', data);

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

        // Sprawdź czy backend zwraca dane z poprzedniego dnia
        const previousDayRates = data?.nbp?.raw?.[1]?.rates;
        let hasPreviousDayData = Array.isArray(previousDayRates);

        console.log('Has previous day data from backend:', hasPreviousDayData);

        let previousRatesByCode = {};
        if (hasPreviousDayData) {
            for (const rate of previousDayRates) {
                if (rate.code && typeof rate.mid === "number") {
                    previousRatesByCode[rate.code] = rate.mid;
                }
            }
        } else {
            // Jeśli backend nie zwraca danych z poprzedniego dnia, pobierz z NBP API
            // Używamy /last/2 aby dostać ostatnie 2 PUBLIKACJE (pomija weekendy automatycznie)
            try {
                console.log('Fallback: pobieranie /last/2 z NBP...');
                const nbpResponse = await fetch('https://api.nbp.pl/api/exchangerates/tables/A/last/2/?format=json');
                if (nbpResponse.ok) {
                    const nbpData = await nbpResponse.json();

                    // nbpData to tablica z 2 publikacjami: [najnowsza, poprzednia]
                    if (Array.isArray(nbpData) && nbpData.length >= 2) {
                        console.log(`NBP zwrócił 2 publikacje: ${nbpData[0].effectiveDate} i ${nbpData[1].effectiveDate}`);

                        // Aktualizuj current z najnowszej publikacji
                        if (nbpData[0] && Array.isArray(nbpData[0].rates)) {
                            console.log(`Aktualizacja current z NBP: ${nbpData[0].effectiveDate}`);
                            for (const rate of nbpData[0].rates) {
                                if (rate.code && typeof rate.mid === "number") {
                                    ratesByCode[rate.code] = rate.mid;
                                }
                            }
                        }

                        // Użyj poprzedniej publikacji jako prev
                        if (nbpData[1] && Array.isArray(nbpData[1].rates)) {
                            console.log(`Użycie previous z NBP: ${nbpData[1].effectiveDate}`);
                            for (const rate of nbpData[1].rates) {
                                if (rate.code && typeof rate.mid === "number") {
                                    previousRatesByCode[rate.code] = rate.mid;
                                }
                            }
                            hasPreviousDayData = true;
                        }
                    }
                } else {
                    console.error('NBP /last/2 failed:', nbpResponse.status);
                }
            } catch (error) {
                console.error('Błąd pobierania danych historycznych z NBP:', error);
            }
        }

        AppState.currencies = POPULAR_CURRENCIES.map(curr => {
            const currentRate = ratesByCode[curr.code] ?? 0;
            let change = 0;

            if (hasPreviousDayData && previousRatesByCode[curr.code]) {
                const prevRate = previousRatesByCode[curr.code];
                if (prevRate && currentRate > 0) {
                    change = Number((((currentRate - prevRate) / prevRate) * 100).toFixed(2));
                }
                console.log(`${curr.code}: current=${currentRate}, prev=${prevRate}, change=${change}%`);
            } else {
                console.log(`${curr.code}: brak danych poprzednich`);
            }

            return {
                ...curr,
                rate: currentRate,
                change: change
            };
        });

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
                symbol: crypto.symbol.substring(0, 3),
                icon: crypto.symbol.substring(0, 3),
                pricePLN: pln,
                priceUSD: usd,
                change24h
            };
        });

        AppState.lastUpdate = new Date().toLocaleString("pl-PL");

        await syncFavoriteCryptosWithPrices();

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

    const source = AppState.cryptos;
    
    if (source.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    <p>Brak danych do wyświetlenia</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedCryptos = [...source].sort((a, b) => {
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
    const cryptoUpdateElement = document.getElementById('cryptoLastUpdate');

    if (updateElement && AppState.lastUpdate) {
        updateElement.textContent = AppState.lastUpdate;
    }

    if (cryptoUpdateElement && AppState.lastUpdate) {
        cryptoUpdateElement.textContent = AppState.lastUpdate;
    }
}



function renderCryptoAutocomplete(list) {
    const box = document.getElementById('cryptoAutocomplete');
    if (!list || list.length === 0) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    box.style.display = 'block';
    box.innerHTML = list.map(c => `
        <div class="autocomplete-item" onclick="selectCryptoAutocomplete('${c.id}')">
            <span>${c.name}</span>
            <span>${c.symbol.toUpperCase()}</span>
        </div>
    `).join('');
}

function selectCryptoAutocomplete(id) {
    const crypto =
        AppState.cryptoSearchResults.find(c => c.id === id) ||
        AppState.cryptos.find(c => c.id === id);

    if (!crypto) return;

    const box = document.getElementById('cryptoAutocomplete');
    if (box) {
        box.style.display = 'none';
        box.innerHTML = '';
    }

    const input = document.getElementById('cryptoSearchInput');
    if (input) {
        input.value = `${crypto.name} (${crypto.symbol})`;
    }

    const row = document.querySelector(`tr[data-crypto="${crypto.id}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('highlight-row');
        setTimeout(() => row.classList.remove('highlight-row'), 1500);
    }
}


function renderProfile() {
    const profileContent = document.getElementById('profileContent');
    updateLogoutButton();

    if (AppState.user) {
        profileContent.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar" style="position: relative;">
                    ${AppState.user.photoURL ?
                        `<img src="${AppState.user.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                        `<i class="fas fa-user"></i>`
                    }
                    <button class="avatar-edit-btn" onclick="changeProfilePhoto()" title="Zmień zdjęcie">
                        <i class="fas fa-camera"></i>
                    </button>
                </div>
                <h2>${AppState.user.name}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">${AppState.user.email}</p>

                <!-- Zarządzanie kontem -->
                <div class="profile-settings">
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary);">
                        <i class="fas fa-cog"></i> Ustawienia konta
                    </h3>
                    <div class="settings-list">
                        <button class="setting-item" onclick="showChangeEmailForm()">
                            <div class="setting-icon">
                                <i class="fas fa-envelope"></i>
                            </div>
                            <div class="setting-content">
                                <div class="setting-title">Zmień email</div>
                                <div class="setting-desc">Zaktualizuj swój adres email</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </button>

                        <button class="setting-item" onclick="showChangePasswordForm()">
                            <div class="setting-icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <div class="setting-content">
                                <div class="setting-title">Zmień hasło</div>
                                <div class="setting-desc">Zaktualizuj swoje hasło</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </button>

                        <button class="setting-item danger" onclick="confirmDeleteAccount()">
                            <div class="setting-icon">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <div class="setting-content">
                                <div class="setting-title">Usuń konto</div>
                                <div class="setting-desc">Trwale usuń swoje konto i dane</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
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
    firebaseLoginWithGoogle()
        .then((result) => {
            const user = result.user;
            showToast('Zalogowano przez Google jako ' + (user.displayName || user.email), 'success');
        })
        .catch((error) => {
            console.error('Google login error:', error);
            showToast('Błąd logowania Google: ' + (error.message || 'spróbuj ponownie'), 'error');
        });
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
    
    if (!email) {
        showToast('Podaj adres e-mail', 'error');
        return;
    }

    auth
        .sendPasswordResetEmail(email)
        .then(() => {
            showToast('Link do resetowania hasła został wysłany na ' + email, 'success');
            setTimeout(() => {
                showLoginForm();
            }, 2000);
        })
        .catch((error) => {
            console.error('Reset password error:', error);
            showToast('Błąd resetowania hasła: ' + (error.message || 'spróbuj ponownie'), 'error');
        });
}



function handleLogin(event) {
    event.preventDefault();
    
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((cred) => {
            const user = cred.user;
            AppState.user = {
                name: user.displayName || (user.email ? user.email.split('@')[0] : 'Użytkownik'),
                email: user.email,
                uid: user.uid,
                photoURL: user.photoURL || null,
            };
            
            showToast('Zalogowano pomyślnie!', 'success');
            renderProfile();
            updateLogoutButton();
            loadFavoritesFromFirebase();
        })
        .catch((error) => {
            console.error('Firebase login error:', error);
            showToast('Błąd logowania: ' + (error.message || 'spróbuj ponownie'), 'error');
        });
}


function handleRegister(event) {
    event.preventDefault();
    
    const name             = document.getElementById('registerName').value;
    const email            = document.getElementById('registerEmail').value;
    const password         = document.getElementById('registerPassword').value;
    const passwordConfirm  = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('Hasła nie są identyczne!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Hasło musi mieć minimum 6 znaków!', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            const user = cred.user;
            return user.updateProfile({ displayName: name }).then(() => user);
        })
        .then((user) => {
            AppState.user = {
                name: user.displayName || name,
                email: user.email,
                uid: user.uid,
                photoURL: user.photoURL || null,
            };
            
            showToast('Konto utworzone! Witaj ' + AppState.user.name + '! 🎉', 'success');
            renderProfile();
            updateLogoutButton();

           
            return db.collection('favorites').doc(user.uid).set({
                items: []
            }, { merge: true });
        })
        .catch((error) => {
            console.error('Firebase register error:', error);
            showToast('Błąd rejestracji: ' + (error.message || 'spróbuj ponownie'), 'error');
        });
}


function logout() {
    auth.signOut()
        .then(() => {
            AppState.user = null;
            AppState.favorites = [];
            showToast('Wylogowano', 'info');
            updateLogoutButton();
            renderProfile();
            renderFavoritesCards();
            updateCurrencyTable();
            updateCryptoTable();
        })
        .catch((error) => {
            console.error('Logout error:', error);
            showToast('Błąd wylogowania: ' + (error.message || 'spróbuj ponownie'), 'error');
        });
}

// ===========================
// ZARZĄDZANIE KONTEM
// ===========================

// Zmiana zdjęcia profilowego
function changeProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Sprawdź rozmiar (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Plik jest za duży! Maksymalny rozmiar to 2MB', 'error');
            return;
        }

        // Konwertuj do base64 i zapisz w Firebase Storage lub jako URL
        const reader = new FileReader();
        reader.onload = async (event) => {
            const photoURL = event.target.result;

            try {
                const user = auth.currentUser;
                await user.updateProfile({ photoURL: photoURL });

                AppState.user.photoURL = photoURL;
                showToast('Zdjęcie profilowe zaktualizowane!', 'success');
                renderProfile();
            } catch (error) {
                console.error('Error updating photo:', error);
                showToast('Błąd aktualizacji zdjęcia: ' + error.message, 'error');
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// Zmiana email
function showChangeEmailForm() {
    const modal = document.getElementById('detailModal');
    const modalName = document.getElementById('modalItemName');
    const modalBody = document.querySelector('.modal-body');

    // Wyłącz grid layout dla formularzy
    modalBody.style.display = 'block';
    modalBody.style.gridTemplateColumns = 'none';

    modalName.textContent = 'Zmień adres email';
    modalBody.innerHTML = `
        <div style="width: 100%; max-width: 400px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
                    <i class="fas fa-envelope"></i>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.95rem;">Wprowadź nowy adres email i potwierdź zmianę swoim aktualnym hasłem</p>
            </div>
            <form onsubmit="handleChangeEmail(event)">
                <div class="form-group">
                    <label for="newEmail">
                        <i class="fas fa-envelope"></i>
                        Nowy adres email
                    </label>
                    <input type="email" id="newEmail" required placeholder="nowy@email.com" autofocus>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">
                        <i class="fas fa-lock"></i>
                        Aktualne hasło
                    </label>
                    <input type="password" id="confirmPassword" required placeholder="Wprowadź hasło">
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1.5rem;">
                    <i class="fas fa-check"></i>
                    Zmień email
                </button>
                <button type="button" class="btn btn-secondary btn-full" onclick="closeDetailModal()" style="margin-top: 0.75rem;">
                    Anuluj
                </button>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

async function handleChangeEmail(event) {
    event.preventDefault();

    const newEmail = document.getElementById('newEmail').value;
    const password = document.getElementById('confirmPassword').value;
    const user = auth.currentUser;

    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);

        // Update email
        await user.updateEmail(newEmail);

        AppState.user.email = newEmail;
        showToast('Email zaktualizowany pomyślnie!', 'success');
        closeDetailModal();
        renderProfile();
    } catch (error) {
        console.error('Error changing email:', error);
        let errorMsg = 'Błąd zmiany email';
        if (error.code === 'auth/wrong-password') {
            errorMsg = 'Nieprawidłowe hasło';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg = 'Ten email jest już używany';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'Nieprawidłowy format email';
        }
        showToast(errorMsg, 'error');
    }
}

// Zmiana hasła
function showChangePasswordForm() {
    const modal = document.getElementById('detailModal');
    const modalName = document.getElementById('modalItemName');
    const modalBody = document.querySelector('.modal-body');

    // Wyłącz grid layout dla formularzy
    modalBody.style.display = 'block';
    modalBody.style.gridTemplateColumns = 'none';

    modalName.textContent = 'Zmień hasło';
    modalBody.innerHTML = `
        <div style="width: 100%; max-width: 400px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
                    <i class="fas fa-key"></i>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.95rem;">Zabezpiecz swoje konto nowym hasłem. Minimum 6 znaków.</p>
            </div>
            <form onsubmit="handleChangePassword(event)">
                <div class="form-group">
                    <label for="currentPassword">
                        <i class="fas fa-lock"></i>
                        Aktualne hasło
                    </label>
                    <input type="password" id="currentPassword" required placeholder="Twoje obecne hasło" autofocus>
                </div>
                <div class="form-group">
                    <label for="newPassword">
                        <i class="fas fa-key"></i>
                        Nowe hasło
                    </label>
                    <input type="password" id="newPassword" required placeholder="Minimum 6 znaków" minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirmNewPassword">
                        <i class="fas fa-check"></i>
                        Potwierdź nowe hasło
                    </label>
                    <input type="password" id="confirmNewPassword" required placeholder="Powtórz nowe hasło">
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1.5rem;">
                    <i class="fas fa-check"></i>
                    Zmień hasło
                </button>
                <button type="button" class="btn btn-secondary btn-full" onclick="closeDetailModal()" style="margin-top: 0.75rem;">
                    Anuluj
                </button>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const user = auth.currentUser;

    // Sprawdź czy nowe hasła się zgadzają
    if (newPassword !== confirmNewPassword) {
        showToast('Nowe hasła nie są identyczne!', 'error');
        return;
    }

    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        showToast('Hasło zaktualizowane pomyślnie!', 'success');
        closeDetailModal();
    } catch (error) {
        console.error('Error changing password:', error);
        let errorMsg = 'Błąd zmiany hasła';
        if (error.code === 'auth/wrong-password') {
            errorMsg = 'Nieprawidłowe aktualne hasło';
        } else if (error.code === 'auth/weak-password') {
            errorMsg = 'Hasło jest za słabe';
        }
        showToast(errorMsg, 'error');
    }
}

// Usuwanie konta
function confirmDeleteAccount() {
    const modal = document.getElementById('detailModal');
    const modalName = document.getElementById('modalItemName');
    const modalBody = document.querySelector('.modal-body');

    // Wyłącz grid layout dla formularzy
    modalBody.style.display = 'block';
    modalBody.style.gridTemplateColumns = 'none';

    modalName.textContent = 'Usuń konto';
    modalBody.innerHTML = `
        <div style="width: 100%; max-width: 400px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1rem; background: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: var(--danger); margin-bottom: 1rem; font-size: 1.5rem;">Czy na pewno?</h3>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">
                    Ta operacja jest <strong>nieodwracalna</strong>. Twoje konto i wszystkie dane zostaną trwale usunięte.
                </p>
            </div>
            <form onsubmit="handleDeleteAccount(event)">
                <div class="form-group">
                    <label for="deletePassword">
                        <i class="fas fa-lock"></i>
                        Potwierdź hasłem
                    </label>
                    <input type="password" id="deletePassword" required placeholder="Wprowadź swoje hasło" autofocus>
                </div>
                <button type="submit" class="btn btn-full" style="margin-top: 1.5rem; background: var(--danger); color: white;">
                    <i class="fas fa-trash-alt"></i>
                    Usuń moje konto
                </button>
                <button type="button" class="btn btn-secondary btn-full" onclick="closeDetailModal()" style="margin-top: 0.75rem;">
                    Anuluj
                </button>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

async function handleDeleteAccount(event) {
    event.preventDefault();

    const password = document.getElementById('deletePassword').value;
    const user = auth.currentUser;

    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);

        // Usuń ulubione z Firestore
        if (AppState.user && AppState.user.uid) {
            await db.collection('favorites').doc(AppState.user.uid).delete();
        }

        // Delete account
        await user.delete();

        AppState.user = null;
        AppState.favorites = [];
        showToast('Konto zostało usunięte', 'info');
        closeDetailModal();
        renderProfile();
        updateLogoutButton();
        renderFavoritesCards();
        updateCurrencyTable();
        updateCryptoTable();
    } catch (error) {
        console.error('Error deleting account:', error);
        let errorMsg = 'Błąd usuwania konta';
        if (error.code === 'auth/wrong-password') {
            errorMsg = 'Nieprawidłowe hasło';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMsg = 'Zaloguj się ponownie i spróbuj jeszcze raz';
        }
        showToast(errorMsg, 'error');
    }
}

// ===========================
// WYKRESY - Funkcje pomocnicze
// ===========================

async function fetchCryptoHistoricalData(cryptoId, days) {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=pln&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('CoinGecko API error');

        const data = await response.json();
        // data.prices to tablica [[timestamp, cena], [timestamp, cena], ...]
        return data.prices.map(([timestamp, price]) => ({
            date: new Date(timestamp),
            price: price
        }));
    } catch (error) {
        console.error('Błąd pobierania danych historycznych krypto:', error);
        return null;
    }
}

async function fetchCurrencyHistoricalData(currencyCode, days) {
    try {
        // NBP API ma limit 255 dni dla /last/{n}
        // Dla 24h (days=1) pobieramy ostatnie 7 dni, żeby mieć wystarczająco punktów
        const nbpDays = days === 1 ? 7 : Math.min(days, 255);
        const url = `https://api.nbp.pl/api/exchangerates/rates/A/${currencyCode}/last/${nbpDays}/?format=json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('NBP API error');

        const data = await response.json();
        // data.rates to tablica obiektów z effectiveDate i mid
        return data.rates.map(rate => ({
            date: new Date(rate.effectiveDate),
            price: rate.mid
        }));
    } catch (error) {
        console.error('Błąd pobierania danych historycznych waluty:', error);
        return null;
    }
}

function renderChart(chartData, label) {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    // Zniszcz poprzedni wykres jeśli istnieje
    if (AppState.currentChart) {
        AppState.currentChart.destroy();
    }

    const labels = chartData.map(d => d.date.toLocaleDateString('pl-PL'));
    const prices = chartData.map(d => d.price);

    AppState.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: prices,
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#1e40af',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Cena: ${context.parsed.y.toFixed(4)} PLN`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 8
                    }
                }
            }
        }
    });
}

async function loadAndRenderChart(type, code, days) {
    const chartContainer = document.getElementById('chartContainer');
    const chartButtons = document.getElementById('chartPeriodButtons');

    if (!chartContainer || !chartButtons) return;

    // Pokaż kontener i przyciski
    chartContainer.style.display = 'block';
    chartButtons.style.display = 'flex';

    // Pokaż loading
    chartContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Ładowanie wykresu...</p></div>';

    let chartData;
    let label;

    if (type === 'crypto') {
        chartData = await fetchCryptoHistoricalData(code, days);
        const crypto = AppState.cryptos.find(c => c.id === code);
        label = crypto ? `${crypto.name} (PLN)` : 'Kryptowaluta (PLN)';
    } else if (type === 'currency') {
        chartData = await fetchCurrencyHistoricalData(code, days);
        const currency = AppState.currencies.find(c => c.code === code);
        label = currency ? `${currency.name} (PLN)` : 'Waluta (PLN)';
    }

    if (!chartData || chartData.length === 0) {
        chartContainer.innerHTML = '<div class="loading"><p>Brak danych historycznych</p></div>';
        return;
    }

    // Przywróć canvas
    chartContainer.innerHTML = '<canvas id="priceChart"></canvas>';
    renderChart(chartData, label);
}

function initChartPeriodButtons() {
    const buttons = document.querySelectorAll('.period-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Usuń active ze wszystkich
            buttons.forEach(b => b.classList.remove('active'));
            // Dodaj active do klikniętego
            btn.classList.add('active');

            // Pobierz okres
            const days = parseInt(btn.dataset.period);
            const { type, code } = AppState.currentChartData;

            if (type && code) {
                loadAndRenderChart(type, code, days);
            }
        });
    });
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

    // Załaduj wykres dla waluty
    AppState.currentChartData = { type: 'currency', code: currency.code };
    loadAndRenderChart('currency', currency.code, 1); // Domyślnie 24h
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

    // Załaduj wykres dla krypto
    AppState.currentChartData = { type: 'crypto', code: crypto.id };
    loadAndRenderChart('crypto', crypto.id, 1); // Domyślnie 24h
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

    const cryptoSearchInput = document.getElementById('cryptoSearchInput');
    const cryptoRefreshBtn = document.getElementById('cryptoRefreshBtn');
    const cryptoExportBtn = document.getElementById('cryptoExportBtn');

    searchInput?.addEventListener('input', (e) => {
        filterCurrencies(e.target.value);
    });

    cryptoSearchInput?.addEventListener('input', (e) => {
        filterCryptos(e.target.value);
    });

    baseCurrencySelect?.addEventListener('change', (e) => {
        AppState.baseCurrency = e.target.value;
        loadDashboardData();
    });

    refreshBtn?.addEventListener('click', () => {
        showToast('Odświeżanie danych...', 'info');
        loadDashboardData();
    });

    cryptoRefreshBtn?.addEventListener('click', () => {
        showToast('Odświeżanie kryptowalut...', 'info');
        loadDashboardData();
    });

    exportBtn?.addEventListener('click', exportData);
    cryptoExportBtn?.addEventListener('click', exportCryptoData);
}





function filterCurrencies(searchTerm) {
    const rows = document.querySelectorAll('#currencyTableBody tr');
    const term = (searchTerm || '').toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function filterCryptos(searchTerm) {
    const rows = document.querySelectorAll('#cryptoTableBody tr');
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

function exportCryptoData() {
    const csvContent = [
        ['Kryptowaluta', 'Symbol', 'Cena PLN', 'Cena USD', 'Zmiana 24h'],
        ...AppState.cryptos.map(c => [c.name, c.symbol, c.pricePLN, c.priceUSD, c.change24h])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kryptowaluty_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    showToast('Kryptowaluty wyeksportowane!', 'success');
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

document.addEventListener('click', (e) => {
    const box = document.getElementById('cryptoAutocomplete');
    const input = document.getElementById('cryptoSearchInput');
    if (!box || !input) return;
    if (!box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
    }
});

// =====================
// Dark Mode
// =====================
function toggleDarkMode() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');

    body.classList.toggle('dark-mode');

    // Zmień ikonę
    if (body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('darkMode', 'disabled');
    }
}

function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('i');

    if (darkMode === 'enabled') {
        body.classList.add('dark-mode');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initiation');

    auth.onAuthStateChanged((user) => {
    if (user) {
        AppState.user = {
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Użytkownik'),
            email: user.email || '',
            photoURL: user.photoURL || null,
            uid: user.uid
        };
        loadFavoritesFromFirebase();
    } else {
        AppState.user = null;
        AppState.favorites = [];
        renderFavoritesCards();
    }

    updateLogoutButton();

    if (AppState.currentView === 'profile') {
        renderProfile();
    }
});

    initNavigation();
    initSearchAndFilter();
    initChartPeriodButtons();
    initDarkMode();
    checkOnlineStatus();
    loadDashboardData();
    
    setInterval(() => {
        if (AppState.currentView === 'dashboard') {
            loadDashboardData();
        }
    }, 5 * 60 * 1000);
    
    console.log('All set!');
});

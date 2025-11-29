const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

/**
 * HTTP endpoint:
 *  - pobiera aktualne dane z NBP i CoinGecko
 *  - zapisuje snapshot do Firestore
 *  - oblicza 24h change dla NBP na podstawie historycznych danych
 *  - zwraca JSON do frontendu
 */
exports.getLatestRates = functions.https.onRequest(async (req, res) => {
  // CORS – na potrzeby frontu hostowanego gdziekolwiek
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  try {
    // 1) NBP - pobierz aktualne kursy
    const nbpUrl = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json";
    const nbpRes = await axios.get(nbpUrl);
    const nbpData = nbpRes.data;

    // 2) CoinGecko - z parametrem include_24hr_change
    const cgUrl =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,ethereum,binancecoin,cardano,solana,ripple" +
      "&vs_currencies=pln,usd&include_24hr_change=true";
    const cgRes = await axios.get(cgUrl);
    const cgData = cgRes.data;

    // 3) Pobierz dane NBP sprzed ~24h z Firestore aby obliczyć zmianę
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let nbpChanges = {};

    try {
      const historicalSnapshot = await db
        .collection("rates_nbp")
        .where("createdAt", ">=", oneDayAgo)
        .orderBy("createdAt", "asc")
        .limit(1)
        .get();

      if (!historicalSnapshot.empty) {
        const historicalData = historicalSnapshot.docs[0].data();
        const historicalRates = historicalData?.raw?.[0]?.rates || [];
        const currentRates = nbpData?.[0]?.rates || [];

        // Oblicz zmiany procentowe dla każdej waluty
        const historicalMap = {};
        historicalRates.forEach((rate) => {
          historicalMap[rate.code] = rate.mid;
        });

        currentRates.forEach((rate) => {
          const oldRate = historicalMap[rate.code];
          if (oldRate && rate.mid) {
            const change = ((rate.mid - oldRate) / oldRate) * 100;
            nbpChanges[rate.code] = parseFloat(change.toFixed(2));
          }
        });

        console.log("NBP 24h changes calculated:", nbpChanges);
      } else {
        console.log("No historical NBP data found for 24h change calculation");
      }
    } catch (histErr) {
      console.error("Error calculating NBP 24h changes:", histErr);
      // Kontynuuj bez zmian - nie blokuj całego requesta
    }

    // 4) Zapis aktualnych danych do Firestore
    const now = admin.firestore.FieldValue.serverTimestamp();
    await Promise.all([
      db.collection("rates_nbp").add({
        createdAt: now,
        raw: nbpData,
      }),
      db.collection("rates_coingecko").add({
        createdAt: now,
        prices: cgData,
      }),
    ]);

    // 5) Odpowiedź dla frontu z obliczonymi zmianami
    res.status(200).json({
      nbp: {
        raw: nbpData,
        changes: nbpChanges, // Dodajemy obliczone zmiany 24h
      },
      coingecko: {
        prices: cgData,
      },
    });
  } catch (err) {
    console.error("Error in getLatestRates:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

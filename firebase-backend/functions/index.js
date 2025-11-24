const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

/**
 * HTTP endpoint:
 *  - pobiera aktualne dane z NBP i CoinGecko
 *  - zapisuje snapshot do Firestore
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
    // 1) NBP
    const nbpUrl = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json";
    const nbpRes = await axios.get(nbpUrl);
    const nbpData = nbpRes.data;

    // 2) CoinGecko
    const cgUrl =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,ethereum,binancecoin,cardano,solana,ripple" +
      "&vs_currencies=pln,usd&include_24hr_change=true";
    const cgRes = await axios.get(cgUrl);
    const cgData = cgRes.data;

    // 3) zapis do Firestore
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

    // 4) odpowiedź dla frontu
    res.status(200).json({
      nbp: {
        raw: nbpData,
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

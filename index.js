const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mysql = require('mysql');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const port = 3000;

// Middleware to serve static files
app.use(express.static(__dirname + '/public'));

const pool = mysql.createPool({
    user: 'root',
    host: 'localhost',
    database: 'crypto_data',
    password: '',
    port: 3306,
});

app.use(express.json());

app.get("/fetchAndStoreData", async (req, res) => {
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const tickers = response.data;
    const tickerEntries = Object.entries(tickers).slice(0, 10);
    
    if (tickerEntries.length > 0) {
        for (const [pairKey, ticker] of tickerEntries) {
            const insertQuery = `
                INSERT INTO crypto_prices (name, last, buy, sell, volume, base_unit)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                last = VALUES(last), buy = VALUES(buy), sell = VALUES(sell), volume = VALUES(volume), base_unit = VALUES(base_unit)
            `;
            const values = [
                ticker.name,
                parseFloat(ticker.last),
                parseFloat(ticker.buy),
                parseFloat(ticker.sell),
                parseFloat(ticker.volume),
                ticker.base_unit
            ];
            pool.query(insertQuery, values, function (error, results, fields) {
                if (error) throw error;
            });
        }
        res.send("<a href='http://localhost:3000/'>GO BACK</a>");
    } else {
        res.send("<h1>Hold On</h1>");
    }
});


app.get("/", async (req, res) => {
    let data = await getTickersData();
    const selectQuery = "SELECT * FROM crypto_prices";
    pool.query(selectQuery, function (error, results, fields) {
        if (error) {
            throw error;
        }
        res.render('testing.ejs', { list: data, list_1: results });
    });
});  // Missing parenthesis here

// Function to fetch and process ticker data
const getTickersData = async () => {
    try {
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
        const tickers = response.data;
        return Object.entries(tickers).slice(0, 10);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return [];
    }
};

// Schedule the task to run every 60 seconds
cron.schedule('*/60 * * * * *', async () => {
    const tickersData = await getTickersData();
    // You can use this data as needed or store it globally
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

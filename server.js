const express = require('express');
const axios = require('axios');
const app = express();

// Конфигурация (для одного API ключа)
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_USERNAME: process.env.CHANNEL_USERNAME,
    LAVA_SECRET_KEY: process.env.LAVA_SECRET_KEY,
    LAVA_SHOP_ID: process.env.LAVA_SHOP_ID || '1743476453' // можно задать по умолчанию
};

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <h1>✅ Сервер работает</h1>
        <p>Lava Shop ID: ${CONFIG.LAVA_SHOP_ID}</p>
        <p><strong>Webhook URL для Lava:</strong><br>
        https://ваш-проект.onrender.com/lava-webhook</p>
    `);
});

// Webhook для Lava
app.post('/lava-webhook', (req, res) => {
    console.log('💰 Платеж:', req.body);
    res.json({ status: 'success' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 Сервер запущен');
});

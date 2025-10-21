const express = require('express');
const axios = require('axios');
const app = express();

// Конфигурация (заполните позже)
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || '8133681784:AAG5tcJJocTSLLvyGtDjrbEU3KqwXAdEPPo',
    CHANNEL_USERNAME: process.env.CHANNEL_USERNAME || 'r4llex'
};

app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.send('✅ Бот работает!');
});

// Webhook от Lava
app.post('/lava-webhook', (req, res) => {
    console.log('💰 Получен платеж:', req.body);
    res.send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
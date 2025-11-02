const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();

// === ДИАГНОСТИКА Lava API ===
console.log('🔍 Диагностика Lava API...');

// ВАШИ КЛЮЧИ ИЗ СКРИНШОТА (перепроверьте точность)
const LAVA_CONFIG = {
    // ПЕРВЫЙ ключ из скриншота: Ов\IPx***KijsY
    SHOP_ID: 'OvIPxKijsY', 
    
    // ВТОРОЙ ключ из скриншота: 2RSVM***Iu6AI
    SECRET_KEY: '2RSVMGXlZOamUFhRKgraq9cbDmVWjzuV1fgOIPuAFGQ7Eeu18vK0yng32vklu6AI',
    
    API_URL: 'https://api.lava.ru/business'
};

console.log('📋 Конфигурация Lava:');
console.log('- Shop ID:', LAVA_CONFIG.SHOP_ID);
console.log('- Secret Key длина:', LAVA_CONFIG.SECRET_KEY.length);
console.log('- API URL:', LAVA_CONFIG.API_URL);

// Проверка ключей
if (!LAVA_CONFIG.SHOP_ID || !LAVA_CONFIG.SECRET_KEY) {
    console.error('❌ ОШИБКА: Отсутствуют ключи Lava!');
}
if (LAVA_CONFIG.SECRET_KEY.length < 10) {
    console.error('❌ ОШИБКА: Secret Key слишком короткий!');
}

// Конфигурация бота
const BOT_CONFIG = {
    BOT_TOKEN: '8133681784:AAG5tcJJocTSLLvyGtDjrbEU3KqwXAdEPPo',
    CHANNEL_USERNAME: 'botsy22'
};

app.use(express.json());

// Простая диагностическая страница
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Telegram Subscription Bot - ДИАГНОСТИКА</h1>
        <p>Статус: <strong>✅ Работает</strong></p>
        <p>Shop ID: <code>${LAVA_CONFIG.SHOP_ID}</code></p>
        <p>Secret Key: <code>${LAVA_CONFIG.SECRET_KEY.substring(0, 10)}...</code></p>
        
        <h3>🧪 Тестовые ссылки:</h3>
        <ul>
            <li><a href="/test-keys">🔑 Проверить ключи Lava</a></li>
            <li><a href="/create-simple">💰 Простой тест платежа (1 рубль)</a></li>
            <li><a href="/check-api">🌐 Проверить доступность Lava API</a></li>
        </ul>
    `);
});

// Тест проверки ключей
app.get('/test-keys', (req, res) => {
    const testData = { test: true,

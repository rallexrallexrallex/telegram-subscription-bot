const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();

// Конфигурация Lava
const LAVA_CONFIG = {
    SECRET_KEY: '2RSVMGXlZOamUFhRKgraq9cbDmVWjzuV1fgOIPuAFGQ7Eeu18vK0yng32vklu6AI',
    SHOP_ID: 'OvIPxKijsY',
    API_URL: 'https://api.lava.ru/business'
};

// Конфигурация бота
const BOT_CONFIG = {
    BOT_TOKEN: '8133681784:AAG5tcJJocTSLLvyGtDjrbEU3KqwXAdEPPo',
    CHANNEL_USERNAME: 'botsy22'
};

app.use(express.json());

// Инициализация SQLite базы
const db = new sqlite3.Database('/tmp/subscriptions.db');

// Создаем таблицу
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER NOT NULL UNIQUE,
        username TEXT,
        first_name TEXT,
        plan TEXT NOT NULL,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME NOT NULL,
        status TEXT DEFAULT 'active'
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id TEXT UNIQUE,
        telegram_id INTEGER,
        amount REAL,
        currency TEXT,
        status TEXT,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        lava_data TEXT
    )`);
    
    console.log('✅ SQLite база готова');
});

// Класс для работы с Lava API
class LavaPayment {
    constructor(secretKey, shopId) {
        this.secretKey = secretKey;
        this.shopId = shopId;
        this.apiUrl = 'https://api.lava.ru/business';
    }

    // Генерация подписи для API
    generateSignature(data) {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto
            .createHash('md5')
            .update(Buffer.from(jsonString + this.secretKey))
            .digest('hex');
    }

    // Создание платежа
    async createInvoice(amount, orderId, customData = {}) {
        const data = {
            sum: amount,
            orderId: orderId,
            shopId: this.shopId,
            hookUrl: 'https://telegram-subscription-bot-q8m8.onrender.com/lava-webhook',
            successUrl: 'https://telegram-subscription-bot-q8m8.onrender.com/success',
            failUrl: 'https://telegram-subscription-bot-q8m8.onrender.com/fail',
            customFields: JSON.stringify(customData),
            expire: 3600
        };

        const signature = this.generateSignature(data);

        try {
            const response = await axios.post(`${this.apiUrl}/invoice/create`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Signature': signature
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Ошибка создания инвойса:', error.response?.data || error.message);
            throw error;
        }
    }

    // Проверка статуса платежа
    async checkInvoiceStatus(invoiceId) {
        const data = {
            invoiceId: invoiceId,
            shopId: this.shopId
        };

        const signature = this.generateSignature(data);

        try {
            const response = await axios.post(`${this.apiUrl}/invoice/status`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Signature': signature
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Ошибка проверки статуса:', error.response?.data || error.message);
            throw error;
        }
    }
}

const lava = new LavaPayment(LAVA_CONFIG.SECRET_KEY, LAVA_CONFIG.SHOP_ID);

// Главная страница с информацией для тестирования
app.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.send(`
        <h1>🤖 Telegram Subscription Bot</h1>
        <p>Статус: <strong>✅ Работает</strong></p>
        <p>Канал: @${BOT_CONFIG.CHANNEL_USERNAME}</p>
        <p>Webhook URL: <code>${baseUrl}/lava-webhook</code></p>
        <p>👇 Скопируйте в Lava.Top → Webhook</p>
        
        <h3>Тестовые платежи:</h3>
        <ul>
            <li><a href="/create-test/1month/123456">Создать платеж 1 месяц (ID: 123456)</a></li>
            <li><a href="/create-test/6months/654321">Создать платеж 6 месяцев (ID: 654321)</a></li>
        </ul>
        
        <h3>Проверить подписки:</h3>
        <ul>
            <li><a href="/subscriptions">Все подписки</a></li>
            <li><a href="/check-expired">Проверить просроченные</a></li>
        </ul>
    `);
});

// Создание тестового платежа
app.get('/create-test/:plan/:userId', async (req, res) => {
    try {
        const { plan, userId } = req.params;
        
        const plans = {
            '1month': { amount: 100, name: '1 месяц' },
            '6months': { amount: 500, name: '6 месяцев' },
            '12months': { amount: 900, name: '12 месяцев' }
        };
        
        const selectedPlan = plans[plan] || plans['1month'];
        
        const customData = {
            telegram_id: parseInt(userId),
            plan: plan,
            first_name: 'Test User',
            user_username: 'testuser'
        };
        
        const orderId = `order_${Date.now()}_${userId}`;
        
        const result = await lava.createInvoice(selectedPlan.amount, orderId, customData);
        
        if (result.status === 'success') {
            res.send(`
                <h2>✅ Платеж создан</h2>
                <p><strong>Сумма:</strong> ${selectedPlan.amount} RUB</p>
                <p><strong>Тариф:</strong> ${selectedPlan.name}</p>
                <p><strong>ID пользователя:</strong> ${userId}</p>
                <p><strong>URL для оплаты:</strong> <a href="${result.data.url}" target="_blank">${result.data.url}</a></p>
                <p><strong>Invoice ID:</strong> ${result.data.invoice_id}</p>
                <br>
                <a href="/">← Назад</a>
            `);
        } else {
            res.status(500).send(`❌ Ошибка: ${result.message}`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания тестового платежа:', error);
        res.status(500).send('Ошибка создания платежа');
    }
});

// Webhook от Lava
app.post('/lava-webhook', async (req, res) => {
    try {
        console.log('💰 Webhook от Lava получен:', JSON.stringify(req.body, null, 2));
        
        const webhookData = req.body;
        const signature = req.headers['signature'];
        
        // Проверяем подпись
        const expectedSignature = crypto
            .createHash('md5')
            .update(Buffer.from(JSON.stringify(webhookData) + LAVA_CONFIG.SECRET_KEY))
            .digest('hex');
        
        if (signature !== expectedSignature) {
            console.error('❌ Неверная подпись webhook');
            return res.status(403).json({ error: 'Invalid signature' });
        }
        
        const { status, invoice_id, order_id, custom_fields, amount } = webhookData;
        
        // Сохраняем информацию о платеже
        db.run(
            `INSERT OR REPLACE INTO payments (invoice_id, telegram_id, amount, currency, status, lava_data) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [invoice_id, null, amount, 'RUB', status, JSON.stringify(webhookData)],
            function(err) {
                if (err) {
                    console.error('❌ Ошибка сохранения платежа:', err);
                } else {
                    console.log(`✅ Платеж сохранен: ${invoice_id}`);
                }
            }
        );
        
        if (status === 'success' || status === 'paid') {
            let customFields;
            try {
                customFields = typeof custom_fields === 'string' ? JSON.parse(custom_fields) : custom_fields;
            } catch (e) {
                customFields = {};
            }
            
            const telegramId = customFields.telegram_id;
            const planName = customFields.plan;
            const firstName = customFields.first_name || 'Пользователь';
            const username = customFields.user_username;
            
            if (telegramId && planName) {
                console.log(`✅ Успешная оплата: ${telegramId} - ${planName}`);
                
                // Рассчитываем дату окончания
                const endDate = calculateEndDate(planName);
                
                // Сохраняем/обновляем подписку
                db.run(
                    `INSERT OR REPLACE INTO subscriptions 
                     (telegram_id, username, first_name, plan, end_date, status) 
                     VALUES (?, ?, ?, ?, ?, 'active')`,
                    [telegramId, username, firstName, planName, endDate.toISOString()],
                    async function(err) {
                        if (err) {
                            console.error('❌ Ошибка сохранения подписки:', err);
                        } else {
                            console.log(`✅ Подписка сохранена для ${telegramId} до ${endDate}`);
                            
                            // Добавляем в канал
                            await addToChannel(telegramId, firstName, planName);
                        }
                    }
                );
            } else {
                console.warn('⚠️ Не хватает данных в custom_fields:', customFields);
            }
        } else if (status === 'error' || status === 'failed') {
            console.log(`❌ Платеж не удался: ${invoice_id}`);
        }
        
        // Всегда отвечаем успехом Lava
        res.json({ status: 'success' });
        
    } catch (error) {
        console.error('❌ Критическая ошибка webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Страница успешной оплаты
app.get('/success', (req, res) => {
    res.send(`
        <h1>✅ Платеж успешно завершен!</h1>
        <p>Спасибо за оплату. Доступ к каналу будет предоставлен в течение нескольких минут.</p>
        <p>Если возникли проблемы, свяжитесь с поддержкой: @SanjarYunusov_bot</p>
        <a href="https://t.me/${BOT_CONFIG.CHANNEL_USERNAME}">Перейти в канал</a>
    `);
});

// Страница неудачной оплаты
app.get('/fail', (req, res) => {
    res.send(`
        <h1>❌ Платеж не удался</h1>
        <p>Попробуйте оплатить еще раз или свяжитесь с поддержкой.</p>
        <p>Техподдержка: @SanjarYunusov_bot</p>
    `);
});

// Список всех подписок
app.get('/subscriptions', (req, res) => {
    db.all(`SELECT * FROM subscriptions ORDER BY end_date DESC`, (err, rows) => {
        if (err) {
            return res.status(500).send('Ошибка базы данных');
        }
        
        let html = `<h1>📊 Все подписки (${rows.length})</h1>`;
        
        rows.forEach(sub => {
            html += `
                <div style="border:1px solid #ccc; padding:10px; margin:5px;">
                    <strong>ID:</strong> ${sub.telegram_id}<br>
                    <strong>Имя:</strong> ${sub.first_name || 'N/A'}<br>
                    <strong>Тариф:</strong> ${sub.plan}<br>
                    <strong>Статус:</strong> ${sub.status}<br>
                    <strong>До:</strong> ${new Date(sub.end_date).toLocaleString()}
                </div>
            `;
        });
        
        html += `<br><a href="/">← Назад</a>`;
        res.send(html);
    });
});

// Проверка просроченных подписок
app.get('/check-expired', (req, res) => {
    checkExpiredSubscriptions();
    res.send('<p>✅ Проверка запущена</p><a href="/">← Назад</a>');
});

// Функция расчета даты окончания
function calculateEndDate(planName) {
    const now = new Date();
    switch(planName) {
        case '1month':
            return new Date(now.setMonth(now.getMonth() + 1));
        case '6months':
            return new Date(now.setMonth(now.getMonth() + 6));
        case '12months':
            return new Date(now.setMonth(now.getMonth() + 12));
        default:
            return new Date(now.setMonth(now.getMonth() + 1));
    }
}

// Добавление в канал
async function addToChannel(userId, firstName, planName) {
    try {
        const url = `https://api.telegram.org/bot${BOT_CONFIG.BOT_TOKEN}/addChatMember`;
        
        const response = await axios.post(url, {
            chat_id: `@${BOT_CONFIG.CHANNEL_USERNAME}`,
            user_id: parseInt(userId)
        });
        
        console.log('✅ Ответ от Telegram API:', response.data);
        
        // Отправляем сообщение пользователю
        await sendMessage(userId,
            `🎉 Поздравляем, ${firstName}!\n\n` +
            `✅ Вы получили доступ к закрытому каналу: @${BOT_CONFIG.CHANNEL_USERNAME}\n\n` +
            `💎 Тариф: ${getPlanText(planName)}\n` +
            `⏰ Срок доступа: ${getDurationText(planName)}\n\n` +
            `💎 Спасибо за подписку!`
        );
        
        console.log(`✅ Пользователь ${userId} добавлен в канал`);
        
    } catch (error) {
        console.error('❌ Ошибка добавления в канал:', error.response?.data);
        
        // Отправляем сообщение об ошибке пользователю
        await sendMessage(userId,
            `❌ Произошла ошибка при добавлении в канал.\n\n` +
            `📞 Свяжитесь с администратором: @SanjarYunusov_bot\n\n` +
            `Ваш ID: ${userId}`
        );
    }
}

// Удаление из канала
async function removeFromChannel(userId) {
    try {
        const url = `https://api.telegram.org/bot${BOT_CONFIG.BOT_TOKEN}/banChatMember`;
        
        await axios.post(url, {
            chat_id: `@${BOT_CONFIG.CHANNEL_USERNAME}`,
            user_id: parseInt(userId),
            revoke_messages: true
        });
        
        console.log(`✅ Пользователь ${userId} удален из канала`);
        
    } catch (error) {
        console.error('❌ Ошибка удаления:', error.response?.data);
    }
}

// Отправка сообщения
async function sendMessage(chatId, text) {
    try {
        const url = `https://api.telegram.org/bot${BOT_CONFIG.BOT_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Ошибка отправки сообщения пользователю', chatId);
    }
}

// Текст для тарифа
function getPlanText(planName) {
    switch(planName) {
        case '1month': return '1 месяц';
        case '6months': return '6 месяцев';
        case '12months': return '12 месяцев';
        default: return planName;
    }
}

// Текст о сроке доступа
function getDurationText(planName) {
    switch(planName) {
        case '1month': return '1 месяц';
        case '6months': return '6 месяцев';
        case '12months': return '12 месяцев';
        default: return '1 месяц';
    }
}

// Проверка просроченных подписок
function checkExpiredSubscriptions() {
    db.all(
        `SELECT * FROM subscriptions WHERE datetime(end_date) < datetime('now') AND status = 'active'`,
        async (err, rows) => {
            if (err) {
                console.error('❌ Ошибка проверки:', err);
                return;
            }
            
            console.log(`🔍 Проверка подписок: ${rows.length} просроченных`);
            
            for (const sub of rows) {
                await removeFromChannel(sub.telegram_id);
                
                db.run(
                    `UPDATE subscriptions SET status = 'expired' WHERE telegram_id = ?`,
                    [sub.telegram_id],
                    function(err) {
                        if (err) console.error('Ошибка обновления статуса:', err);
                    }
                );
                
                console.log(`❌ Удален: ${sub.telegram_id} (${sub.plan})`);
            }
        }
    );
}

// Проверяем каждые 6 часов
setInterval(checkExpiredSubscriptions, 6 * 60 * 60 * 1000);

// Первая проверка через 1 минуту после запуска
setTimeout(checkExpiredSubscriptions, 60000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📢 Канал: @${BOT_CONFIG.CHANNEL_USERNAME}`);
    console.log(`🤖 Бот: Настроен`);
    console.log(`💾 База: SQLite`);
    console.log(`💰 Lava API: Настроено`);
    console.log(`⏰ Автопроверка: каждые 6 часов`);
    console.log(`🌐 Webhook URL: https://telegram-subscription-bot-q8m8.onrender.com/lava-webhook`);
});

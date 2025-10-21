const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Конфигурация
const CONFIG = {
    BOT_TOKEN: '8133681784:AAG5tcJJocTSLLvyGtDjrbEU3KqwXAdEPPo',
    CHANNEL_USERNAME: 'botsy22',
    LAVA_SECRET: '2RSVMGXlZOamUFhRKgraq9cbDmVWjzuV1fgOIPuAFGQ7Eeu18vK0yng32vklu6AI'
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
    console.log('✅ SQLite база готова');
});

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Telegram Subscription Bot</h1>
        <p>Статус: <strong>✅ Работает</strong></p>
        <p>Канал: @${CONFIG.CHANNEL_USERNAME}</p>
        <p>Webhook URL: ${req.protocol}://${req.get('host')}/lava-webhook</p>
        <p>👇 Скопируйте в Lava.Top → Webhook</p>
    `);
});

// Webhook от Lava.Top
app.post('/lava-webhook', async (req, res) => {
    try {
        console.log('💰 Webhook от Lava:', JSON.stringify(req.body, null, 2));
        
        const { status, custom_fields } = req.body;
        
        if (status === 'success') {
            const fields = JSON.parse(custom_fields || '{}');
            const telegramId = fields.telegram_id;
            const planName = fields.plan;
            const firstName = fields.first_name;
            const username = fields.user_username;
            
            if (telegramId) {
                console.log(`✅ Новая оплата: ${telegramId} - ${planName}`);
                
                // Рассчитываем дату окончания
                const endDate = calculateEndDate(planName);
                
                // Сохраняем в SQLite
                db.run(
                    `INSERT OR REPLACE INTO subscriptions 
                     (telegram_id, username, first_name, plan, end_date, status) 
                     VALUES (?, ?, ?, ?, ?, 'active')`,
                    [telegramId, username, firstName, planName, endDate.toISOString()],
                    function(err) {
                        if (err) {
                            console.error('❌ Ошибка базы:', err);
                        } else {
                            console.log(`✅ Данные сохранены для ${telegramId}`);
                        }
                    }
                );
                
                // Добавляем в канал
                await addToChannel(telegramId, firstName, planName);
                
                console.log(`✅ Пользователь ${telegramId} добавлен до ${endDate}`);
            }
        }
        
        res.json({ status: 'success', message: 'Webhook processed' });
    } catch (error) {
        console.error('❌ Ошибка webhook:', error);
        res.status(500).json({ error: error.message });
    }
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
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/addChatMember`;
        
        const response = await axios.post(url, {
            chat_id: CONFIG.CHANNEL_USERNAME,
            user_id: parseInt(userId)
        });
        
        console.log('✅ Ответ от Telegram API:', response.data);
        
        // Отправляем сообщение пользователю
        await sendMessage(userId,
            `🎉 Поздравляем, ${firstName}!\n\n` +
            `✅ Вы получили доступ к закрытому каналу: @${CONFIG.CHANNEL_USERNAME}\n\n` +
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

// Удаление из канала
async function removeFromChannel(userId) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/banChatMember`;
        
        await axios.post(url, {
            chat_id: CONFIG.CHANNEL_USERNAME,
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
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Ошибка отправки сообщения пользователю', chatId);
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
    console.log(`📢 Канал: @${CONFIG.CHANNEL_USERNAME}`);
    console.log(`🤖 Бот: ${CONFIG.BOT_TOKEN ? 'Настроен' : 'Ошибка'}`);
    console.log(`💾 База: SQLite`);
    console.log(`⏰ Автопроверка: каждые 6 часов`);
});

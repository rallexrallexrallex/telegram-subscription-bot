const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// Модель подписки
const subscriptionSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  username: { type: String },
  firstName: { type: String },
  plan: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, default: 'active' }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Конфигурация
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || '8133681784:AAG5tcJJocTSLLvyGtDjrbEU3KqwXAdEPPo',
    CHANNEL_USERNAME: process.env.CHANNEL_USERNAME || 'botsy22',
    MONGODB_URI: process.env.MONGODB_URI,
    LAVA_SECRET: process.env.LAVA_SECRET || '2RSVMGXlZOamUFhRKgraq9cbDmVWjzuV1fgOIPuAFGQ7Eeu18vK0yng32vklu6AI'
};

app.use(express.json());

// Подключение к MongoDB
async function connectDB() {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB error:', error);
    }
}
connectDB();

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Telegram Subscription Bot</h1>
        <p>Статус: <strong>Работает</strong></p>
        <p>Канал: @${CONFIG.CHANNEL_USERNAME}</p>
        <p>Webhook URL: ${req.protocol}://${req.get('host')}/lava-webhook</p>
    `);
});

// Webhook от Lava.Top
app.post('/lava-webhook', async (req, res) => {
    try {
        console.log('💰 Webhook от Lava:', req.body);
        
        const { status, order_id, custom_fields } = req.body;
        
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
                
                // Сохраняем в базу
                const subscription = new Subscription({
                    telegramId: parseInt(telegramId),
                    username: username,
                    firstName: firstName,
                    plan: planName,
                    endDate: endDate
                });
                await subscription.save();
                
                // Добавляем в канал
                await addToChannel(telegramId, firstName);
                
                console.log(`✅ Пользователь ${telegramId} добавлен до ${endDate}`);
            }
        }
        
        res.json({ status: 'success' });
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
async function addToChannel(userId, firstName) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/addChatMember`;
        
        const response = await axios.post(url, {
            chat_id: CONFIG.CHANNEL_USERNAME,
            user_id: parseInt(userId)
        });
        
        // Отправляем сообщение пользователю
        await sendMessage(userId,
            `🎉 Поздравляем, ${firstName}!\n\n` +
            `✅ Вы получили доступ к закрытому каналу: @${CONFIG.CHANNEL_USERNAME}\n\n` +
            `💎 Спасибо за подписку!`
        );
        
        return response.data;
    } catch (error) {
        console.error('❌ Ошибка добавления в канал:', error.response?.data);
        throw error;
    }
}

// Удаление из канала
async function removeFromChannel(userId) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/banChatMember`;
        
        const response = await axios.post(url, {
            chat_id: CONFIG.CHANNEL_USERNAME,
            user_id: parseInt(userId)
        });
        
        return response.data;
    } catch (error) {
        console.error('❌ Ошибка удаления из канала:', error.response?.data);
        throw error;
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
        console.error('Ошибка отправки сообщения:', error.response?.data);
    }
}

// Проверка просроченных подписок
async function checkExpiredSubscriptions() {
    try {
        const expiredSubs = await Subscription.find({
            endDate: { $lt: new Date() },
            status: 'active'
        });
        
        console.log(`🔍 Проверка подписок: найдено ${expiredSubs.length} просроченных`);
        
        for (const sub of expiredSubs) {
            await removeFromChannel(sub.telegramId);
            
            sub.status = 'expired';
            await sub.save();
            
            console.log(`❌ Подписка ${sub.telegramId} истекла и удалена`);
        }
    } catch (error) {
        console.error('Ошибка проверки подписок:', error);
    }
}

// Проверяем каждые 6 часов
setInterval(checkExpiredSubscriptions, 6 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📢 Канал: @${CONFIG.CHANNEL_USERNAME}`);
    // Первая проверка через 1 минуту после запуска
    setTimeout(checkExpiredSubscriptions, 60000);
});

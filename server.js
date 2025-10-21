<!DOCTYPE html>
<html>
<head>
    <title>Premium Подписки</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { 
            font-family: Arial; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            min-height: 100vh; 
        }
        .container { max-width: 400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .card { 
            background: rgba(255,255,255,0.1); 
            padding: 25px; 
            margin: 20px 0; 
            border-radius: 15px; 
            backdrop-filter: blur(10px);
        }
        .price { 
            font-size: 24px; 
            color: #FFD700; 
            font-weight: bold; 
            margin: 10px 0; 
        }
        button { 
            background: #FFD700; 
            color: black; 
            border: none; 
            padding: 15px 30px; 
            width: 100%; 
            border-radius: 10px; 
            font-size: 16px; 
            font-weight: bold; 
            margin-top: 15px; 
            cursor: pointer;
        }
        .feature { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💎 PREMIUM ПОДПИСКИ</h1>
            <p>Закрытый Telegram канал @botsy22</p>
        </div>
        
        <!-- 1 МЕСЯЦ -->
        <div class="card">
            <h2>🎬 1 месяц</h2>
            <div class="price">299 руб</div>
            <div>
                <div class="feature">✅ Доступ к закрытому каналу</div>
                <div class="feature">✅ Эксклюзивный контент</div>
                <div class="feature">✅ Участие в сообществе</div>
            </div>
            <button onclick="buySubscription('1month')">
                💳 КУПИТЬ ПОДПИСКУ
            </button>
        </div>
        
        <!-- 6 МЕСЯЦЕВ -->
        <div class="card">
            <h2>🚀 6 месяцев</h2>
            <div class="price">1 499 руб</div>
            <div>
                <div class="feature">✅ Экономия 300 рублей</div>
                <div class="feature">✅ Все материалы канала</div>
                <div class="feature">✅ Приоритетная поддержка</div>
            </div>
            <button onclick="buySubscription('6months')">
                💳 КУПИТЬ ПОДПИСКУ
            </button>
        </div>
        
        <!-- 12 МЕСЯЦЕВ -->
        <div class="card">
            <h2>👑 12 месяцев</h2>
            <div class="price">2 499 руб</div>
            <div>
                <div class="feature">✅ Экономия 1 000 рублей</div>
                <div class="feature">✅ Персональный чат с автором</div>
                <div class="feature">✅ Пожизненная скидка 20%</div>
            </div>
            <button onclick="buySubscription('12months')">
                💳 КУПИТЬ ПОДПИСКУ
            </button>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        // Ссылки на оплату в Lava.Top
        const LAVA_LINKS = {
            '1month': 'https://app.lava.top/products/034e46fd-d2a4-418f-9f8f-bc90281b3c77',
            '6months': 'https://app.lava.top/products/44f79f40-9c6f-4fee-9d72-10f984099d68',
            '12months': 'https://app.lava.top/products/b2dcc9e2-9372-4bd9-9d9f-34ba36560a2e'
        };

        function buySubscription(plan) {
            const lavaUrl = LAVA_LINKS[plan];
            
            if (lavaUrl) {
                tg.showPopup({
                    title: '💳 Оплата подписки',
                    message: 'После оплаты вы будете автоматически добавлены в канал!',
                    buttons: [
                        {id: 'pay', type: 'default', text: 'Перейти к оплате'},
                        {id: 'cancel', type: 'cancel', text: 'Отмена'}
                    ]
                }, function(buttonId) {
                    if (buttonId === 'pay') {
                        tg.openLink(lavaUrl);
                    }
                });
            }
        }

        if (!window.Telegram?.WebApp) {
            document.body.innerHTML = '<div class="container"><h2>📱 Откройте через Telegram бота</h2></div>';
        }
    </script>
</body>
</html>

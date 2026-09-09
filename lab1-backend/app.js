const express = require('express');
const app = express();
const port = 3000;

// Консольное логирование каждого запроса (для продвинутого уровня)
app.use((req, res, next) => {                                                   
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);      
    next();                                                                                                                                                                                                            
});

// 1. Текстовый эндпоинт
app.get('/', (req, res) => {
    res.send('Welcome to my API');
});

// 2. JSON-эндпоинт 1 (для базового уровня)
app.get('/api/docs', (req, res) => {
    res.json(
        { 
            docs_url: '/api/docs', 
            version: 'v1' 
        }
    );
});

// 3. JSON-эндпоинт 2 (для среднего уровня)
app.get('/api/recipes', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Борщ',
        },
        {
            id: 2,
            name: 'Омлет',
        },
        {
            id: 3,
            name: 'Стейк',
        },
        {
            id: 4,
            name: 'Пицца'
        }
    ]);
});

// 4. JSON-эндпоинт 3 (для среднего уровня)
app.get('/api/ingredients', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Картофель',
        },
        {
            id: 2,
            name: 'Морковь',
        },
        {
            id: 3,
            name: 'Лук',
        },
        {
            id: 4,
            name: 'Яйцо',
        },
        {
            id: 5,
            name: 'Молоко',
        }
    ]);
});

// Массив данных для функций (для продвинутого уровня)
const matches = [
    {
        id: 1,
        homeTeam: 'Barcelona',
        awayTeam: 'Real Madrid',
        score: '2:1'
    },
    {
        id: 2,
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester City',
        score: '1:1'
    },
    {
        id: 3,
        homeTeam: 'Bayern Munich',
        awayTeam: 'Borussia Dortmund',
        score: '3:0'
    }
];

// 5. JSON-эндпоинт 4 (для продвинутого уровня)
app.get('/api/matches', (req, res) => {
    res.json(matches);
});

// 6. JSON-эндпоинт 5 (для продвинутого уровня)
app.get('/api/teams', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Barcelona',
            country: 'Spain'
        },
        {
            id: 2,
            name: 'Real Madrid',
            country: 'Spain'
        },
        {
            id: 3,
            name: 'Manchester City',
            country: 'England'
        },
        {
            id: 4,
            name: 'Liverpool',
            country: 'England'
        }
    ]);
});


// 7. Эндпоинт с параметром (для продвинутого уровня)
app.get('/api/matches/:id', (req, res) => {
    const requestedId = Number(req.params.id);                          // объяснить

    const match = matches.find(match => match.id === requestedId);

    if (match) {
        res.json(
            {
                requestedId: requestedId,
                status: 'success'
            }
        );
    } else {
        res.status(404).json(
            {
                requestedId: requestedId,
                status: 'error'
            }
        );
    }
});

// Обработка 404 (для среднего и продвинутого уровня)
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});

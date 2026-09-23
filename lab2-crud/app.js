const express = require('express');
const app = express();
const port = 3000;

// Middleware для парсинга JSON из тела запроса
app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Хранилище данных в памяти (поля platform и rating для среднего уровня)
let games = [
    { id: 1, title: 'Dark Souls', genre: 'action-RPG', platform: 'PC, PlayStation 3', rating: 8.5 },
    { id: 2, title: 'Warcraft 3', genre: 'RTS', platform: 'PC', rating: 9.1 },
    { id: 3, title: 'Call of Duty 4', genre: 'shooter', platform: 'PC, PlayStation 3, XBOX 360', rating: 9.2 }
];

// Счётчик для генерации новых ID
let nextId = games.length;

// Настройки и вспомогательные функции для GET /games (средний и продвинутый уровень)
 
const ALLOWED_SORT_FIELDS = ['id', 'title', 'genre', 'platform', 'rating'];     // список полей, по которым разрешена сортировка
const DEFAULT_PAGE = 1;                                                         // доля выводимого списка по умолчанию (1:1)
const DEFAULT_LIMIT = 10;                                                       // предел элементов на одну страницу (долю) по умолчанию
const MAX_LIMIT = 100;
const MAX_BULK = 100;                                                           // максимальное количество добавляемых элементов за раз

// Проверка полей для PATCH (продвинутый уровень)
const FIELD_VALIDATORS = {
    title:    { check: v => typeof v === 'string' && v.trim() !== '',      message: 'title должен быть непустой строкой' },
    genre:    { check: v => typeof v === 'string',                         message: 'genre должен быть строкой' },
    platform: { check: v => typeof v === 'string',                         message: 'platform должен быть строкой' },
    rating:   { check: v => typeof v === 'number' && Number.isFinite(v),   message: 'rating должен быть числом' }
};

// Проверка валидности полей
const validateFields = (data) => {
    const errors = [];
    for (const [field, { check, message }] of Object.entries(FIELD_VALIDATORS)) {
        if (data[field] !== undefined && !check(data[field])) {
            errors.push(message);
        }
    }
    return errors;
};

// Проверка query-строки пользователя (средний уровень)
// Разбирает положительное целое из query-параметра.
// Возвращает defaultValue, если параметр не передан, и null, если значение некорректно.
const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined) return defaultValue;
    if (typeof value !== 'string') return null;                                 // например, ?page=1&page=2 даст массив
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Проверка на простой объект (не нулевой, является объектом и не является массивом)
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Платформы, на которых есть игра
const platformsOf = (game) =>
    typeof game.platform === 'string'
        ? game.platform.split(',').map(p => p.trim()).filter(Boolean)
        : [];

// CRUD-операции

// GET
app.get('/games', (req, res) => {
    // Реализация дополнительных эндпоинтов для среднего уровня

    // query - часть URL после знака ?, в которой клиент передаёт
    // дополнительные параметры в виде пар ключ=значение.
    // Express разбирает эту строку и кладёт результат в req.query как обычный JS-объект.
    const { search, sort, order = 'asc' } = req.query;         

    // Валидация параметров
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    if (page === null) {
        return res.status(400).json({ error: 'Параметр page должен быть положительным целым числом' });
    }
    
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    if (limit === null || limit > MAX_LIMIT) {
        return res.status(400).json({
            error: `Параметр limit должен быть целым числом от 1 до ${MAX_LIMIT}`
        });
    }
 
    // 1. Поиск по title 
    let result = [...games];                // копия, чтобы sort не менял исходный массив
 
    if (search !== undefined) {
        const query = search.trim().toLowerCase();
        if (query) {
            result = result.filter(game => game.title.toLowerCase().includes(query));
        }
    }
 
    // 2. Сортировка по рейтингу 
    if (sort !== undefined) {
        const direction = (order === 'desc') ? -1 : 1;
 
        result.sort((a, b) => {
            const x = a[sort];
            const y = b[sort];
 
            // Отсутствующие значения всегда в конце, независимо от направления
            if (x == null && y == null) return 0;
            if (x == null) return 1;
            if (y == null) return -1;
 
            if (typeof x === 'number' && typeof y === 'number') {
                return (x - y) * direction;
            }
            return String(x).localeCompare(String(y), 'ru') * direction;
        });
    }
 
    // 3. Пагинация (после поиска и сортировки)
    const total = result.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = result.slice(start, start + limit);
 
    res.json({
        total: total,                       // всего элементов после фильтрации
        count: paged.length,                // элементов на текущей странице
        page: page,
        limit: limit,
        totalPages: totalPages,
        games: paged
    });
});

// GET STATS (продвинутый уровень)
app.get('/games/stats', (req, res) => {
    const rated = games.filter(g => Number.isFinite(g.rating));
    const sum = rated.reduce((acc, g) => acc + g.rating, 0);
 
    res.json({
        count: games.length,
        averageRating: rated.length ? Math.round((sum / rated.length) * 100) / 100 : null
    });
});

// GET RELATED (продвинутый уровень)                         
app.get('/games/:id/related', (req, res) => {
    const id = parseInt(req.params.id);
    const item = games.find(i => i.id === id);
 
    if (!item) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }
 
    const target = platformsOf(item);
 
    const related = games
        .filter(g => g.id !== id) 

        // .map получает платформы игры g и приводит каждую к нижнему регистру 
        // (чтобы сравнение было нечувствительно к регистру)          
        .map(g => {                                                                 // возвращает новый массив той же длины, где
            const keys = platformsOf(g).map(p => p.toLowerCase());                  // каждый элемент - результат этой функции
            const shared = target.filter(p => keys.includes(p.toLowerCase()));        
            return { game: g, shared };
        })

        // .filter оставляет только те игры, у которых есть хотя бы одна общая платформа
        .filter(x => x.shared.length > 0)                                           // возвращает новый массив только с теми элементами,
        .map(x => ({ ...x.game, sharedPlatforms: x.shared }));                      // для которых условие истинно
 
    res.json({
        id: item.id,
        title: item.title,
        platforms: target,
        count: related.length,
        related: related
    });
});

// GET ID 
app.get('/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = games.find(i => i.id === id);

    if (!item) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }

    res.json(item);
});

// POST
app.post('/games', (req, res) => {
    const { title, genre, platform, rating } = req.body;

    // Валидация: обязательные поля
    if (typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({
            error: "Поле title обязательно и должно быть непустой строкой"
        });
    }

    if (typeof rating !== "number" || !Number.isFinite(rating)) {
        return res.status(400).json({
            error: "Поле rating обязательно и должно быть числом"
        });
    }

    // Создание нового элемента
    const newItem = {
        id: ++nextId,
        title: title,
        genre: genre,
        platform: platform,
        rating: rating
    };
    games.push(newItem);

    // 201 Created — ресурс создан
    res.status(201).json(newItem);
});

// POST BULK (продвинутый уровень)
app.post('/games/bulk', (req, res) => {
    // Запись req.body?.games означает, что если req.body не null и не undefined, то 
    // взять его свойство games, иначе вернуть undefined и не выдавать ошибку.
    const items = Array.isArray(req.body) ? req.body : req.body?.games;
 
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'Ожидается непустой массив игр (в теле запроса или в поле games)'
        });
    }
 
    if (items.length > MAX_BULK) {
        return res.status(400).json({
            error: `За один запрос можно добавить не более ${MAX_BULK} элементов`
        });
    }
 
    const errors = [];
    items.forEach((item, index) => {
        if (!isPlainObject(item)) {
            errors.push({ index, errors: ['элемент должен быть объектом'] });
            return;
        }
 
        const itemErrors = validateFields(item);
        if (item.title === undefined) itemErrors.push('title обязателен');
        if (item.rating === undefined) itemErrors.push('rating обязателен');
 
        if (itemErrors.length > 0) {
            errors.push({ index, errors: itemErrors });
        }
    });
 
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Ошибка валидации, ни один элемент не добавлен',
            details: errors
        });
    }
 
    // Копируем только известные поля, чтобы клиент не мог подставить свой id
    const created = items.map(({ title, genre, platform, rating }) => ({
        id: ++nextId,
        title,
        genre,
        platform,
        rating
    }));
 
    games.push(...created);
 
    res.status(201).json({ count: created.length, games: created });
});

// PUT
app.put('/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = games.findIndex(i => i.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }

    const { title, genre, platform, rating } = req.body;

    // Полное обновление
    games[index] = {
        id: id,
        title: title || games[index].title,
        genre: genre || games[index].genre,
        platform: platform || games[index].platform,
        rating: rating || games[index].rating
    };

    res.json(games[index]);
});

// PATCH ID (продвинутый уровень)
app.patch('/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = games.findIndex(i => i.id === id);
 
    if (index === -1) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }
 
    const body = req.body;
 
    if (!isPlainObject(body)) {
        return res.status(400).json({ error: 'Тело запроса должно быть JSON-объектом' });
    }
 
    const updates = {};
    for (const field of Object.keys(FIELD_VALIDATORS)) {                                        // возвращает массив ключей объекта                
        if (body[field] !== undefined) {
            updates[field] = body[field];
        }
    }
 
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            error: 'Не передано ни одного поля для обновления'
        });
    }
 
    const errors = validateFields(updates);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Некорректные данные', details: errors });
    }
 
    // Перезапись только переданных полей
    Object.assign(games[index], updates);                                                       // перезапись существующих полей
 
    res.json(games[index]);
});

// DELETE (продвинутый уровень)
app.delete('/games', (req, res) => {
    const deletedCount = games.length;
    games = [];

    res.sendStatus(204);
})

// DELETE ID
app.delete('/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = games.findIndex(i => i.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }   

    const deletedItem = games.splice(index, 1)[0];

    // 204 No Content с удалённым элементом
    return res.sendStatus(204);
});

// 404 Not Found
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработчик ошибки 500 (продвинутый уровень)
app.use((err, req, res, next) => {
    // Если ответ уже начал отправляться, отдаём ошибку стандартному обработчику Express
    if (res.headersSent) {
        return next(err);
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
    }
 
    const status = err.status || err.statusCode;
    if (status >= 400 && status < 500) {
        return res.status(status).json({ error: err.message });
    }
 
    // Всё остальное — непредвиденная ошибка сервера
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`, err);
 
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Сообщение о запуске сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});

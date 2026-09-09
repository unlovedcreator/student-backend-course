from flask import Flask, jsonify, request
import time

app = Flask(__name__)

# Консольное логирование запроса (для продвинутого уровня)
@app.before_request
def log_request():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {request.method} {request.path}")

# 1. Текстовый эндпоинт
@app.route('/')
def home():
    return 'Welcome to my API'

# 2. JSON-эндпоинт 1 (для базового уровня)
@app.route('/api/docs')
def docs():
    return jsonify(
        {
            "docs_url": "/api/docs", 
            "version": "v1"
        }
    )

# 3. JSON-эндпоинт 2 (для среднего уровня)
@app.route('/api/recipes')
def recipes():
    return jsonify([
        {
            "id": "1",
            "name": "Борщ",
        },
        {
            "id": "2",
            "name": "Омлет",
        },
        {
            "id": "3",
            "name": "Стейк",
        },
        {
            "id": "4",
            "name": "Пицца"
        }
    ])

# 4. JSON-эндпоинт 3 (для среднего уровня)
@app.route('/api/ingredients')
def ingredients():
    return jsonify([
        {
            "id": "1",
            "name": "Картофель",
        },
        {
            "id": "2",
            "name": "Морковь",
        },
        {
            "id": "3",
            "name": "Лук",
        },
        {
            "id": "4",
            "name": "Яйцо",
        },
        {
            "id": "5",
            "name": "Молоко",
        }
    ])

# Массив данных для функций (для продвинутого уровня)
matches_list = [
    {
        "id": 1,
        "homeTeam": "Barcelona",
        "awayTeam": "Real Madrid",
        "score": "2:1"
    },
    {
        "id": 2,
        "homeTeam": "Liverpool",
        "awayTeam": "Manchester City",
        "score": "1:1"
    },
    {
        "id": 3,
        "homeTeam": "Bayern Munich",
        "awayTeam": "Borussia Dortmund",
        "score": "3:0"
    }
]

# 5. JSON-эндпоинт 4 (для продвинутого уровня)
@app.route('/api/matches')
def matches():
    return jsonify(matches_list)

# 6. JSON-эндпоинт 5 (для продвинутого уровня)
def teams():
    return jsonify([
        {
            "id": "1",
            "name": "Barcelona",
            "country": "Spain"
        },
        {
            "id": "2",
            "name": "Real Madrid",
            "country": "Spain"
        },
        {
            "id": "3",
            "name": "Manchester City",
            "country": "England"
        },
        {
            "id": "4",
            "name": "Liverpool",
            "country": "England"
        }
    ])

# 7. Эндпоинт с параметром (для продвинутого уровня)
@app.route('/api/matches/<int:match_id>')
def get_match(match_id):                                # Прояснить функцию
    match = next((m for m in matches_list if m["id"] == match_id), None)
    
    if match is None:
        return jsonify({"error": f"Матч с id {match_id} не найден"}), 404
    
    return jsonify(match)

# Обработка 404
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found"}), 404

if __name__ == '__main__':                               # Прояснить
    app.run(port=3000, debug=True)
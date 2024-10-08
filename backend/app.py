import atexit
from sqlalchemy import func
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import gc
import requests
from flask import Flask, make_response, request, jsonify
from newspaper import Article
from urllib.parse import urlparse
import os
from dotenv import load_dotenv
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import json
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
import time

app = Flask(__name__)
CORS(app,supports_credentials=True,resources={r"/api/*": {"origins": "*"}})
app.config['JWT_SECRET_KEY'] = 'super-secret'  # Change this!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 1 hour
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
jwt = JWTManager(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:root@localhost:3306/test_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "100 per hour"],
    storage_uri="memory://",
)

# User model
class User(db.Model):

    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class BlockedDomain(db.Model):
    __tablename__ = 'blocked_domains'
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)

    def __repr__(self):
        return f'<BlockedDomain {self.domain}>'

class NewsCache(db.Model):
    __tablename__ = 'news_cache'
    id = db.Column(db.Integer, primary_key=True)
    stock_name = db.Column(db.String(255), nullable=False)
    num_articles = db.Column(db.Integer, nullable=False)
    data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f'<NewsCache {self.stock_name}_{self.num_articles}>'
    
def get_blocked_domains():
    return set(domain.domain for domain in BlockedDomain.query.all())

def add_blocked_domain(domain):
    new_domain = BlockedDomain(domain=domain)
    db.session.add(new_domain)
    db.session.commit()

def remove_blocked_domain(domain):
    BlockedDomain.query.filter_by(domain=domain).delete()
    db.session.commit()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    

    new_user = User(username=username)
    new_user.email = email
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=username)
        resp = jsonify({'login': True})
        resp.set_cookie('access_token_cookie', access_token, httponly=True, secure=False, samesite='Lax')
        return resp
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/logout', methods=['POST'])
@limiter.exempt
def logout():
    response = make_response(jsonify({"msg": "Logout successful"}), 200)
    response.set_cookie('access_token_cookie', '', expires=0)
    return response

@app.route('/api/protected', methods=['GET'])
@jwt_required()
def protected():
    try:
        current_user = get_jwt_identity()
        return jsonify(logged_in_as=current_user), 200
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401


NEWS_API_KEY = os.getenv('NEWS_API_KEY') or '234ef51d9fee41ada47949e875f85de5'
NEWS_API_URL = 'https://newsapi.org/v2/everything'

# Ensure CUDA is available
assert torch.cuda.is_available(), "CUDA is not available. Please check your GPU setup."

# Initialize the model and tokenizer
model_name = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to('cuda')


def summarize_text(text, max_length=150, min_length=50, use_cuda=True):
    device = 'cuda' if use_cuda else 'cpu'
    inputs = tokenizer([text], max_length=1024, return_tensors="pt", truncation=True).to(device)
    model_device = model.to(device)
    summary_ids = model_device.generate(inputs["input_ids"], num_beams=4, max_length=max_length, min_length=min_length)
    summary = tokenizer.batch_decode(summary_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
    if not use_cuda:
        model.to('cuda')  # Move model back to CUDA
    return summary

def fetch_news(stock_name):
    params = {
        'q': f'"{stock_name}" AND (stock OR shares OR investor OR "market cap" OR valuation OR funding OR IPO OR "initial public offering" OR nasdaq OR nyse)',
        'sortBy': 'relevancy',
        'pageSize': 100,  # Keep this higher to have more articles to filter through
        'apiKey': NEWS_API_KEY,
        'language': 'en'
    }
    print(NEWS_API_KEY)
    try:
        response = requests.get(NEWS_API_URL, params=params)
        response.raise_for_status()  # Raises HTTPError for bad responses
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return {'status': 'error', 'message': str(e)}


def extract_and_summarize(article, stock_name):
    url = article['url']
    domain = urlparse(url).netloc
    blocked_domains = get_blocked_domains()
    
    if domain in blocked_domains:
        return None
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        article_obj = Article(url)
        article_obj.set_html(response.text)
        article_obj.parse()
        
        full_text = article_obj.text
        
        if not is_relevant(full_text, stock_name, article['title']):
            return None
        
        input_text = ' '.join(full_text.split()[:1024])
        max_length = min(1000, len(full_text) // 4)
        
        try:
            summary = summarize_text(input_text, max_length=max_length, min_length=50)
        except RuntimeError as e:
            if "CUDA" in str(e):
                print(f"CUDA error occurred. Switching to CPU for this article.")
                summary = summarize_text(input_text, max_length=max_length, min_length=50, use_cuda=False)
            else:
                raise
        
        return {
            'title': article_obj.title,
            'summary': summary,
            'url': url,
            'image_url': article['urlToImage']
        }
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code in [401, 403, 404]:
            add_blocked_domain(domain)
            print(f"Added {domain} to blocked domains due to {http_err.response.status_code} error")
        print(f"HTTP error occurred for {url}: {http_err}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred for {url}: {req_err}")
    except Exception as e:
        print(f"Error processing article {url}: {e}")
    
    return None

def clean_news_cache():
    with app.app_context():
        day_ago = datetime.utcnow() - timedelta(days=1)
        old_cache = NewsCache.query.filter(NewsCache.created_at < day_ago).all()
        for cache in old_cache:
            db.session.delete(cache)
        db.session.commit()
        print(f"Cleaned {len(old_cache)} old cache entries")

# Set up the scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=clean_news_cache, trigger="interval", hours=24)
scheduler.start()

    

def is_relevant(text, stock_name, title):
    stock_name_lower = stock_name.lower()
    text_lower = text.lower()
    title_lower = title.lower()
    
    # Check if stock name is in the title or first 200 characters of the text (case-insensitive)
    if stock_name_lower not in title_lower and stock_name_lower not in text_lower[:200]:
        return False
    
    # List of financial keywords
    financial_keywords = [
        'stock', 'share', 'price', 'market', 'trading', 'investor', 'valuation',
        'funding', 'ipo', 'initial public offering', 'nasdaq', 'nyse', 'market cap',
        'earnings', 'revenue', 'profit', 'financial', 'quarter', 'fiscal'
    ]
    
    # Check for presence of financial keywords in title or first 500 characters
    keyword_count = sum(1 for keyword in financial_keywords if keyword in title_lower or keyword in text_lower[:500])
    
    # Require at least two financial keywords for relevance
    return keyword_count >= 2


@app.route('/api/news', methods=['GET'])
@jwt_required()
@limiter.limit("10 per minute")
def get_news():
    stock_name = request.args.get('stock')
    num_articles = request.args.get('num_articles', default=5, type=int)
    
    if not stock_name:
        return jsonify({'error': 'Stock name is required'}), 400
    
    if num_articles < 1 or num_articles > 20:
        return jsonify({'error': 'Number of articles must be between 1 and 20'}), 400
    
    try:
        start_time = time.time()
        
        # Check if we have cached data
        cached_news = NewsCache.query.filter_by(stock_name=stock_name, num_articles=num_articles).first()
        
        if cached_news and (datetime.now(timezone.utc) - cached_news.created_at.astimezone(timezone.utc)) < timedelta(days=1):
            end_time = time.time()
            return jsonify({
                'articles': cached_news.data,
                'source': 'cache',
                'fetch_time': end_time - start_time,
                'blocked_domains': []
            })
        
        # If no valid cached data, fetch new data
        news_data = fetch_news(stock_name)
        
        if not news_data or news_data.get('status') != 'ok':
            app.logger.error(f"Failed to fetch news for {stock_name}. Response: {news_data}")
            return jsonify({'error': 'Failed to fetch news', 'details': str(news_data)}), 500
        
        summarized_articles = []
        articles_summarized = 0
        newly_blocked_domains = set()
        
        for article in news_data.get('articles', []):
            if articles_summarized >= num_articles:
                break
            
            try:
                summarized = extract_and_summarize(article, stock_name)
                if summarized:
                    summarized_articles.append(summarized)
                    articles_summarized += 1
                elif summarized is None:
                    domain = urlparse(article['url']).netloc
                    if domain in get_blocked_domains():
                        newly_blocked_domains.add(domain)
            except Exception as e:
                app.logger.error(f"Error processing article {article.get('url', 'Unknown URL')}: {str(e)}")
        
        # Store the new data in the cache
        if cached_news:
            cached_news.data = summarized_articles
            cached_news.created_at = datetime.now(timezone.utc)
        else:
            new_cache = NewsCache(stock_name=stock_name, num_articles=num_articles, data=summarized_articles)
            db.session.add(new_cache)
        
        db.session.commit()
        
        end_time = time.time()
        
        return jsonify({
            'articles': summarized_articles,
            'source': 'api',
            'fetch_time': end_time - start_time,
            'blocked_domains': list(newly_blocked_domains)
        })
    
    except Exception as e:
        app.logger.error(f"Error in /api/news endpoint: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500


@app.route('/api/blocked_domains', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def manage_blocked_domains():
    if request.method == 'GET':
        return jsonify(list(get_blocked_domains()))
    
    elif request.method == 'POST':
        domain = request.json.get('domain')
        if domain:
            add_blocked_domain(domain)
            return jsonify({'message': f'Domain {domain} added to blocked list'}), 201
        return jsonify({'error': 'No domain provided'}), 400
    
    elif request.method == 'DELETE':
        domain = request.json.get('domain')
        if domain in get_blocked_domains():
            remove_blocked_domain(domain)
            return jsonify({'message': f'Domain {domain} removed from blocked list'})
        return jsonify({'error': 'Domain not found in blocked list'}), 404


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)

# Ensure a graceful shutdown of the scheduler
atexit.register(lambda: scheduler.shutdown())
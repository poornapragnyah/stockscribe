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


app = Flask(__name__)
CORS(app,supports_credentials=True,resources={r"/api/*": {"origins": "*"}})
app.config['JWT_SECRET_KEY'] = 'super-secret'  # Change this!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 1 hour
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
jwt = JWTManager(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["20 per day", "10 per hour"],
    storage_uri="memory://",
)


# In-memory user database
users = {}

@app.route('/api/register', methods=['POST'])
def register():
    username = request.json.get('username')
    password = request.json.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    if username in users:
        return jsonify({'error': 'Username already exists'}), 400
    
    users[username] = generate_password_hash(password)
    return jsonify({'message': 'User created'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    if username not in users or not check_password_hash(users[username], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    access_token = create_access_token(identity=username)
    print(access_token)
    resp = jsonify({'login': True})
    resp.set_cookie('access_token_cookie', access_token,httponly=True,secure=False,samesite='Lax')
    print("cookie set")
    return resp

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



load_dotenv()

NEWS_API_KEY = os.environ.get('NEWS_API_KEY')
NEWS_API_URL = 'https://newsapi.org/v2/everything'
BLOCKED_DOMAINS_FILE = 'blocked_domains.json'

# Ensure CUDA is available
assert torch.cuda.is_available(), "CUDA is not available. Please check your GPU setup."

# Initialize the model and tokenizer
model_name = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to('cuda')

# Load blocked domains from file
def load_blocked_domains():
    if os.path.exists(BLOCKED_DOMAINS_FILE):
        with open(BLOCKED_DOMAINS_FILE, 'r') as f:
            return set(json.load(f))
    return set()

# Save blocked domains to file
def save_blocked_domains(domains):
    with open(BLOCKED_DOMAINS_FILE, 'w') as f:
        json.dump(list(domains), f)

BLOCKED_DOMAINS = load_blocked_domains()

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
    response = requests.get(NEWS_API_URL, params=params)
    return response.json()


def extract_and_summarize(article, stock_name):
    url = article['url']
    domain = urlparse(url).netloc
    if domain in BLOCKED_DOMAINS:
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
            'image_url': article['urlToImage']  # Include the image URL from NewsAPI
        }
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 403:
            BLOCKED_DOMAINS.add(domain)
            save_blocked_domains(BLOCKED_DOMAINS)
        print(f"HTTP error occurred for {url}: {http_err}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred for {url}: {req_err}")
    except Exception as e:
        print(f"Error processing article {url}: {e}")
    
    return None

    

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
@limiter.limit("2 per minute")
def get_news():
    print(f"Rate limit remaining: {limiter.get_limit()}")
    stock_name = request.args.get('stock')
    num_articles = request.args.get('num_articles', default=5, type=int)
    
    if not stock_name:
        return jsonify({'error': 'Stock name is required'}), 400
    
    if num_articles < 1 or num_articles > 20:
        return jsonify({'error': 'Number of articles must be between 1 and 20'}), 400
    
    news_data = fetch_news(stock_name)
    
    if news_data['status'] != 'ok':
        return jsonify({'error': 'Failed to fetch news'}), 500
    
    summarized_articles = []
    articles_summarized = 0
    
    for article in news_data['articles']:
        if articles_summarized >= num_articles:
            break
        
        try:
            summarized = extract_and_summarize(article, stock_name)
            if summarized:
                summarized_articles.append(summarized)
                articles_summarized += 1
        except Exception as e:
            print(f"Error processing article {article['url']}: {str(e)}")
    
    return jsonify(summarized_articles)


@app.route('/api/blocked_domains', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def manage_blocked_domains():
    global BLOCKED_DOMAINS
    
    if request.method == 'GET':
        return jsonify(list(BLOCKED_DOMAINS))
    
    elif request.method == 'POST':
        domain = request.json.get('domain')
        if domain:
            BLOCKED_DOMAINS.add(domain)
            save_blocked_domains(BLOCKED_DOMAINS)
            return jsonify({'message': f'Domain {domain} added to blocked list'}), 201
        return jsonify({'error': 'No domain provided'}), 400
    
    elif request.method == 'DELETE':
        domain = request.json.get('domain')
        if domain in BLOCKED_DOMAINS:
            BLOCKED_DOMAINS.remove(domain)
            save_blocked_domains(BLOCKED_DOMAINS)
            return jsonify({'message': f'Domain {domain} removed from blocked list'})
        return jsonify({'error': 'Domain not found in blocked list'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
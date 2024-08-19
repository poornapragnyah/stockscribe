# Stock Scribe

Stock Scribe is a web application that leverages AI to provide summarized news articles for specified stocks. It delivers concise, relevant, and actionable insights from news articles, helping investors stay informed and make better decisions.

## Features

- User authentication (JWT)
- Rate limiting to prevent abuse
- News caching for improved performance
- Blocked domain management to filter out unreliable sources
- AI-powered article summarization

## Tech Stack

### Backend
- Flask (Python)
- SQLAlchemy for database ORM
- PyMySQL for MySQL database connection
- Flask-JWT-Extended for authentication
- Flask-Limiter for rate limiting
- APScheduler for automated cache cleaning
- Transformers (Hugging Face) for AI summarization

### Frontend
- Next.js
- Tailwind CSS
- DaisyUI 
- Zod 
- React Hook Form
- React toastify

### Database
- MySQL

## Setup

### Environment Variables

Create a `.env` file in the root directory with the following contents:

```
NEWS_API_KEY=your_news_api_key_here
FLASK_SECRET_KEY=your_flask_secret_key_here
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/database_name
```


### Backend Setup

1. Install required Python packages:
   ```
   pip install flask flask-cors flask-limiter flask-jwt-extended flask-sqlalchemy pymysql python-dotenv requests newspaper3k torch transformers apscheduler
   ```

2. Run the Flask application:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```

## API Endpoints

- `/api/register` (POST): User registration
- `/api/login` (POST): User login
- `/api/logout` (POST): User logout
- `/api/news` (GET): Fetch summarized news for a specific stock
- `/api/blocked_domains` (GET, POST, DELETE): Manage blocked domains

## How It Works

1. Users register and log in to access the service.
2. Users can request news summaries for a specific stock.
3. The backend fetches news articles from the News API.
4. Articles are filtered for relevance and summarized using AI.
5. Summaries are cached to improve performance for subsequent requests.
6. Blocked domains are managed to filter out unreliable sources.
7. The frontend displays the summarized news articles to the user.

## Security Features

- JWT authentication for secure user sessions
- Rate limiting to prevent API abuse
- Password hashing for user security
- Blocked domain management to filter out unreliable sources

## Performance Optimizations

- News caching to reduce API calls and improve response times
- Automated cache cleaning to manage database size
- Use of GPU for AI summarization (when available)

## Future Improvements

- Implement user preferences for stocks and news sources
- Add email notifications for important stock news
- Implement social sharing features for news summaries

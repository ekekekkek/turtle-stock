# Turtle Stock Platform - Backend

A FastAPI-based backend for the Turtle Stock Platform, providing real-time stock market data, portfolio management, and user authentication.

## Features

- 🔐 **User Authentication**: JWT-based authentication with secure password hashing
- 📊 **Real-time Stock Data**: Integration with Yahoo Finance API via yfinance
- 💼 **Portfolio Management**: Track investments with multiple purchases per stock
- 👀 **Watchlist**: Manage favorite stocks
- 📈 **Market Overview**: Major indices and trending stocks
- 🗄️ **Database**: SQLAlchemy ORM with SQLite/PostgreSQL support
- 🔒 **Security**: CORS, rate limiting, and input validation

## Tech Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM
- **yfinance** - Yahoo Finance API wrapper
- **Pydantic** - Data validation using Python type annotations
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Uvicorn** - ASGI server

## Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- **Interactive API docs**: http://localhost:8000/docs
- **ReDoc documentation**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user info

### Stocks
- `GET /api/stocks/{symbol}/quote` - Get real-time stock quote
- `GET /api/stocks/{symbol}/info` - Get detailed stock information
- `GET /api/stocks/{symbol}/history` - Get historical data
- `GET /api/stocks/search` - Search stocks
- `GET /api/stocks/trending` - Get trending stocks

### Portfolio
- `GET /api/portfolio` - Get user's portfolio
- `POST /api/portfolio/stocks` - Add/buy stock shares
- `GET /api/portfolio/stocks/{symbol}` - Get specific stock from portfolio
- `PUT /api/portfolio/stocks/{symbol}` - Update portfolio stock
- `DELETE /api/portfolio/stocks/{symbol}` - Remove stock from portfolio
- `GET /api/portfolio/performance` - Get portfolio performance

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist/stocks` - Add stock to watchlist
- `DELETE /api/watchlist/stocks/{symbol}` - Remove stock from watchlist
- `GET /api/watchlist/quotes` - Get quotes for watchlist stocks

### Market
- `GET /api/market/overview` - Get market overview
- `GET /api/market/trending` - Get trending stocks

## Database Schema

### Users
- `id` - Primary key
- `email` - Unique email address
- `username` - Unique username
- `hashed_password` - Bcrypt hashed password
- `full_name` - User's full name
- `is_active` - Account status
- `is_verified` - Email verification status
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Portfolios
- `id` - Primary key
- `user_id` - Foreign key to users
- `symbol` - Stock symbol
- `company_name` - Company name
- `total_shares` - Total shares owned
- `average_price` - Weighted average price
- `created_at` - Portfolio creation timestamp
- `updated_at` - Last update timestamp

### Portfolio Transactions
- `id` - Primary key
- `portfolio_id` - Foreign key to portfolios
- `transaction_type` - 'buy' or 'sell'
- `shares` - Number of shares
- `price_per_share` - Price per share
- `total_amount` - Total transaction amount
- `transaction_date` - Date of transaction
- `notes` - Optional notes
- `created_at` - Transaction creation timestamp

### Watchlist
- `id` - Primary key
- `user_id` - Foreign key to users
- `symbol` - Stock symbol
- `company_name` - Company name
- `added_at` - Addition timestamp

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./turtle_stock.db` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-change-in-production` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `30` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `YAHOO_FINANCE_TIMEOUT` | API timeout in seconds | `30` |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per minute | `60` |

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Code Formatting
```bash
black .
isort .
```

## Deployment

### Production Setup
1. Set up a production database (PostgreSQL recommended)
2. Configure environment variables for production
3. Set up a reverse proxy (nginx)
4. Use a production ASGI server (Gunicorn + Uvicorn)

### Docker Deployment
```bash
docker build -t turtle-stock-backend .
docker run -p 8000:8000 turtle-stock-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 
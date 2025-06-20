# Turtle Stock Platform - Complete Setup Guide

This guide will help you set up the complete Turtle Stock platform with both frontend and backend components.

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- Git

## Project Structure

```
turtle-stock/
├── frontend/           # React frontend application
├── backend/           # FastAPI backend application
├── SETUP.md          # This setup guide
└── README.md         # Main project README
```

## Step 1: Backend Setup

### 1.1 Navigate to Backend Directory
```bash
cd backend
```

### 1.2 Create Virtual Environment
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 1.3 Install Dependencies
```bash
pip install -r requirements.txt
```

### 1.4 Environment Configuration
Create a `.env` file in the backend directory:
```env
# Database
DATABASE_URL=sqlite:///./turtle_stock.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_V1_STR=/api
PROJECT_NAME=Turtle Stock API

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# Optional: For production
# DATABASE_URL=postgresql://user:password@localhost/turtle_stock
```

### 1.5 Initialize Database
```bash
python -c "from app.core.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

### 1.6 Start Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### 1.7 Verify Backend
- Visit `http://localhost:8000/docs` for the interactive API documentation
- Test the health check endpoint: `http://localhost:8000/api/health`

## Step 2: Frontend Setup

### 2.1 Navigate to Frontend Directory
```bash
cd ../frontend
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Environment Configuration
Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:8000
```

### 2.4 Start Frontend Development Server
```bash
npm start
```

The frontend application will be available at `http://localhost:3000`

## Step 3: Testing the Connection

### 3.1 Register a New User
1. Open `http://localhost:3000/register`
2. Fill in the registration form
3. Submit to create your account

### 3.2 Login
1. Go to `http://localhost:3000/login`
2. Enter your credentials
3. You should be redirected to the dashboard

### 3.3 Test Features
- **Dashboard**: View market overview and trending stocks
- **Stock Details**: Click on any stock to view detailed information
- **Watchlist**: Add stocks to your watchlist
- **Portfolio**: Add stocks with purchase details

## Step 4: Development Workflow

### Backend Development
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Management
```bash
cd backend
source venv/bin/activate
python -c "from app.core.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Stocks
- `GET /api/stocks/{symbol}/quote` - Get stock quote
- `GET /api/stocks/{symbol}/history` - Get historical data
- `GET /api/stocks/{symbol}/info` - Get stock information
- `GET /api/stocks/search` - Search stocks
- `GET /api/stocks/trending` - Get trending stocks

### Portfolio
- `GET /api/portfolio` - Get user portfolio
- `POST /api/portfolio/stocks` - Add stock to portfolio
- `PUT /api/portfolio/stocks/{symbol}` - Update stock in portfolio
- `DELETE /api/portfolio/stocks/{symbol}` - Remove stock from portfolio

### Watchlist
- `GET /api/watchlist` - Get user watchlist
- `POST /api/watchlist/stocks` - Add stock to watchlist
- `DELETE /api/watchlist/stocks/{symbol}` - Remove stock from watchlist
- `GET /api/watchlist/quotes` - Get watchlist quotes

### Market Data
- `GET /api/market/overview` - Get market overview

## Troubleshooting

### Common Issues

#### Backend Issues

1. **Database Connection Error**:
   ```bash
   # Check if database file exists
   ls -la backend/turtle_stock.db
   
   # Recreate database if needed
   python -c "from app.core.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
   ```

2. **Port Already in Use**:
   ```bash
   # Find process using port 8000
   lsof -i :8000
   
   # Kill the process
   kill -9 <PID>
   ```

3. **Missing Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

#### Frontend Issues

1. **API Connection Error**:
   - Verify backend is running on `http://localhost:8000`
   - Check `.env` file has correct `REACT_APP_API_URL`
   - Ensure CORS is configured in backend

2. **Build Errors**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Authentication Issues**:
   - Clear browser localStorage
   - Check browser console for errors
   - Verify JWT token in Network tab

#### General Issues

1. **CORS Errors**:
   - Ensure `BACKEND_CORS_ORIGINS` includes `http://localhost:3000`
   - Restart backend server after changing CORS settings

2. **Stock Data Not Loading**:
   - Check yfinance API availability
   - Verify stock symbols are valid
   - Check backend logs for errors

3. **Environment Variables**:
   - Ensure `.env` files are in correct directories
   - Restart servers after changing environment variables

## Production Deployment

### Backend Production
1. Set up a production database (PostgreSQL recommended)
2. Configure environment variables for production
3. Use a production ASGI server like Gunicorn
4. Set up reverse proxy (Nginx)

### Frontend Production
1. Build the application: `npm run build`
2. Serve static files with a web server
3. Configure environment variables for production API URL

## Development Tips

1. **API Testing**: Use the interactive docs at `http://localhost:8000/docs`
2. **Database Inspection**: Use SQLite browser or command line tools
3. **Logs**: Check backend console for detailed error messages
4. **Network Tab**: Use browser dev tools to inspect API calls

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the backend and frontend README files
3. Check the API documentation at `http://localhost:8000/docs`
4. Verify all environment variables are set correctly

## Next Steps

Once the basic setup is working:
1. Add more stock data sources
2. Implement real-time updates
3. Add more advanced portfolio analytics
4. Implement user preferences and settings
5. Add mobile app support 
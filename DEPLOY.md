# Deployment Guide - Turtle Stock Platform

This guide covers deploying the backend to Render and the frontend to either **Vercel** (recommended) or **Firebase Hosting**.

## Prerequisites

- GitHub repository with the turtle-stock monorepo
- Render account (for backend)
- Vercel account (recommended for frontend) OR Firebase project (alternative)

## Backend Deployment (Render)

### 1. Connect Repository to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `turtle-stock` repository

### 2. Configure Service

- **Name**: `turtle-stock-api`
- **Environment**: `Python`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Free (or choose paid plan for production)

### 3. Set Environment Variables

Configure these environment variables in Render:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Port for the service | Yes | `8000` |
| `DATABASE_URL` | Database connection string | Yes | `postgresql://...` |
| `FINNHUB_API_KEY` | Finnhub API key for stock data | Yes | `your_api_key_here` |
| `JWT_SECRET_KEY` | Secret for JWT tokens | Yes | `your_secret_key_here` |
| `ALGORITHM` | JWT algorithm | No | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry time | No | `30` |
| `NODE_ENV` | Environment | No | `production` |

### 4. Deploy

1. Click "Create Web Service"
2. Wait for the build to complete
3. Note the service URL (e.g., `https://turtle-stock-api.onrender.com`)

## Frontend Deployment (Firebase Hosting)

### 1. Update API Base URL

1. Copy the Render service URL from step 4 above
2. Create `.env.production` file in the `frontend/` directory:
   ```bash
   cd frontend
   cp env.production.example .env.production
   ```
3. Edit `.env.production` and replace the placeholder URL:
   ```bash
   REACT_APP_API_URL=https://your-actual-render-url.onrender.com
   ```

### 2. Build and Deploy

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Build the production version:
   ```bash
   npm run build
   ```

3. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

### 3. Verify Deployment

1. Check Firebase console for deployment status
2. Visit your Firebase hosting URL
3. Test the app functionality

## Environment Variable Summary

### Frontend (.env.production)
- **Variable Name**: `REACT_APP_API_URL`
- **Value**: Your Render service URL (e.g., `https://turtle-stock-api.onrender.com`)
- **Location**: `frontend/.env.production`

### Backend (Render Dashboard)
- **Database URL**: Set in Render environment variables
- **API Keys**: Set in Render environment variables
- **JWT Secrets**: Set in Render environment variables

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the frontend URL is in the backend CORS allowlist
2. **Build Failures**: Check that all dependencies are in `requirements.txt`
3. **Environment Variables**: Verify all required variables are set in Render
4. **Port Issues**: Ensure the PORT environment variable is set correctly

### Health Check

The backend includes a health check endpoint at `/health` that Render uses to verify the service is running.

## Maintenance

### Updating Backend

1. Push changes to GitHub
2. Render will automatically redeploy
3. Monitor the deployment logs

### Updating Frontend

1. Update `.env.production` if API URL changes
2. Run `npm run build`
3. Deploy with `firebase deploy --only hosting`

## Security Notes

- Never commit `.env.production` files to version control
- Use strong, unique secrets for JWT and database
- Regularly rotate API keys
- Monitor Render logs for any suspicious activity 
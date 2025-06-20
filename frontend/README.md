# Turtle Stock Platform - Frontend

A modern, responsive React-based frontend for the Turtle Stock Platform, designed to provide real-time stock market data, portfolio tracking, and investment analysis.

## Features

- 📊 **Real-time Stock Data**: Live stock quotes and market information
- 📈 **Interactive Charts**: Beautiful price charts with multiple timeframes
- 👀 **Watchlist Management**: Add and track your favorite stocks
- 💼 **Portfolio Tracking**: Monitor your investments and performance
- 🔍 **Stock Search**: Search and discover new stocks
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🎨 **Modern UI**: Clean, intuitive interface built with Tailwind CSS
- 🔐 **User Authentication**: Secure login/register with JWT tokens
- 📅 **Portfolio Management**: Track multiple purchases per stock with dates and prices
- 📋 **Watchlist**: Add/remove stocks to personal watchlist
- 📊 **Market Overview**: Key market indices and metrics

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Beautiful and composable charts
- **Axios** - HTTP client for API requests
- **Heroicons** - Beautiful hand-crafted SVG icons
- **React Hot Toast** - Elegant notifications

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running (see backend README)

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd turtle-stock/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
frontend/
├── public/                 # Static files
│   ├── index.html         # Main HTML file
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable React components
│   │   ├── Navbar.js      # Navigation component
│   │   ├── StockCard.js   # Stock display card
│   │   └── StockChart.js  # Chart component
│   ├── pages/            # Page components
│   │   ├── Dashboard.js   # Main dashboard
│   │   ├── StockDetails.js # Individual stock page
│   │   ├── Watchlist.js   # Watchlist management
│   │   ├── Portfolio.js   # Portfolio tracking
│   │   └── NotFound.js    # 404 page
│   ├── utils/            # Utility functions
│   │   ├── api.js        # API configuration
│   │   └── helpers.js    # Helper functions
│   ├── App.js            # Main app component
│   ├── index.js          # App entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

## API Integration

The frontend is designed to work with a FastAPI backend. The API configuration is set up in `src/utils/api.js` with the following endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile

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

## Environment Variables

Create a `.env` file in the frontend directory to configure environment variables:

```env
REACT_APP_API_URL=http://localhost:8000
```

## Styling

The project uses Tailwind CSS for styling with a custom color palette:

- **Primary**: Blue shades for main actions and branding
- **Success**: Green shades for positive changes and gains
- **Danger**: Red shades for negative changes and losses

## Components

### StockCard
A reusable component for displaying stock information with:
- Stock symbol and name
- Current price and change
- Volume and market cap
- Color-coded price changes

### StockChart
Interactive chart component using Recharts with:
- Multiple timeframes (1D, 1W, 1M, 3M, 1Y, 5Y)
- Responsive design
- Custom tooltips
- Gradient fills

### Navbar
Responsive navigation with:
- Mobile menu
- Active state indicators
- Brand logo and name

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 
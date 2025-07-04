import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stockAPI } from '../utils/api';
import StockCard from '../components/StockCard';
import MarketOverview from '../components/MarketOverview';
import { ArrowTrendingUpIcon, ChartBarIcon, EyeIcon } from '@heroicons/react/24/outline';

// Helper to extract a string message from error objects
const extractErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.msg) return detail.msg;
  return fallback;
};

const Dashboard = () => {
  const [trendingStocks, setTrendingStocks] = useState([]);
  const [marketOverview, setMarketOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trending stocks and market overview in parallel
      const [trendingResponse, marketResponse] = await Promise.all([
        stockAPI.getTrending(),
        stockAPI.getMarketOverview()
      ]);
      
      setTrendingStocks(trendingResponse.data);
      setMarketOverview(marketResponse.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(
        extractErrorMessage(err, 'Failed to load dashboard data. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header 
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Turtle Stock</h1>
        <p className="text-gray-600">Your comprehensive stock trading platform</p>
      </div> */}
      
      {/* Market Overview 
      {marketOverview && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="w-6 h-6 mr-2" />
            Market Overview
          </h2>
          <MarketOverview data={marketOverview} />
        </div>
      )} */}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/portfolio"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
              <p className="text-gray-600">Manage your investments</p>
            </div>
          </div>
        </Link>

        <Link
          to="/watchlist"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <EyeIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Watchlist</h3>
              <p className="text-gray-600">Track your favorite stocks</p>
            </div>
          </div>
        </Link>

        <Link
          to="/"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Market Trends</h3>
              <p className="text-gray-600">Explore market movements</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Trending Stocks */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowTrendingUpIcon className="w-6 h-6 mr-2" />
          Trending Stocks
        </h2>
        {trendingStocks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trendingStocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No trending stocks available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
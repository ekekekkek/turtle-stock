import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stockAPI, watchlistAPI, portfolioAPI } from '../utils/api';
import StockChart from '../components/StockChart';
import { ArrowLeftIcon, PlusIcon, EyeIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const StockDetails = () => {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInPortfolio, setIsInPortfolio] = useState(false);

  const extractErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail?.msg) return detail.msg;
    return fallback;
  };

  useEffect(() => {
    if (symbol) {
      fetchStockData();
      checkStockStatus();
    }
  }, [symbol]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quoteResponse, infoResponse, historyResponse] = await Promise.all([
        stockAPI.getQuote(symbol),
        stockAPI.getInfo(symbol),
        stockAPI.getHistory(symbol, timeRange, '1m')
      ]);
      
      setStock({
        ...quoteResponse.data,
        ...infoResponse.data
      });
      setChartData(historyResponse.data);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkStockStatus = async () => {
    try {
      // Check if stock is in watchlist and portfolio
      const [watchlistResponse, portfolioResponse] = await Promise.all([
        watchlistAPI.getWatchlist(),
        portfolioAPI.getPortfolio()
      ]);
      
      setIsInWatchlist(watchlistResponse.data.some(stock => stock.symbol === symbol));
      setIsInPortfolio(portfolioResponse.data.some(stock => stock.symbol === symbol));
    } catch (err) {
      console.error('Error checking stock status:', err);
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await watchlistAPI.addStock(symbol);
      setIsInWatchlist(true);
      toast.success(`${symbol} added to watchlist`);
    } catch (err) {
      toast.error(
        extractErrorMessage(err, 'Failed to add to watchlist')
      );
    }
  };

  const handleRemoveFromWatchlist = async () => {
    try {
      await watchlistAPI.removeStock(symbol);
      setIsInWatchlist(false);
      toast.success(`${symbol} removed from watchlist`);
    } catch (err) {
      toast.error(
        extractErrorMessage(err, 'Failed to remove from watchlist')
      );
    }
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    // Fetch new chart data
    stockAPI.getHistory(symbol, newTimeRange, '1m')
      .then(response => setChartData(response.data))
      .catch(err => console.error('Error fetching chart data:', err));
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
            onClick={fetchStockData}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">Stock not found</div>
          <Link
            to="/"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const timeRanges = [
    { label: '1D', value: '1d' },
    { label: '1W', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{stock.symbol}</h1>
            <p className="text-gray-600">{stock.name}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isInWatchlist ? (
            <button
              onClick={handleRemoveFromWatchlist}
              className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              <EyeIcon className="w-5 h-5 mr-2" />
              Remove from Watchlist
            </button>
          ) : (
            <button
              onClick={handleAddToWatchlist}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add to Watchlist
            </button>
          )}
          
          {isInPortfolio && (
            <Link
              to="/portfolio"
              className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              <BriefcaseIcon className="w-5 h-5 mr-2" />
              View in Portfolio
            </Link>
          )}
        </div>
      </div>

      {/* Stock Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Price</h3>
          <p className="text-3xl font-bold text-gray-900">${stock.price?.toFixed(2) || 'N/A'}</p>
          {stock.change !== undefined && stock.changePercent !== undefined && (
            <p className={`text-lg font-medium ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Cap</h3>
          <p className="text-2xl font-bold text-gray-900">
            {stock.market_cap ? `$${(stock.market_cap / 1e9).toFixed(2)}B` : 'N/A'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Volume</h3>
          <p className="text-2xl font-bold text-gray-900">
            {stock.volume ? stock.volume.toLocaleString() : 'N/A'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">52W Range</h3>
          <p className="text-lg font-medium text-gray-900">
            {stock.fifty_two_week_low && stock.fifty_two_week_high 
              ? `$${stock.fifty_two_week_low.toFixed(2)} - $${stock.fifty_two_week_high.toFixed(2)}`
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Price Chart</h2>
          <div className="flex space-x-2">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <StockChart data={chartData} symbol={symbol} timeRange={timeRange} />
      </div>

      {/* Additional Info */}
      {stock.description && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About {stock.name}</h3>
          <p className="text-gray-700 leading-relaxed">{stock.description}</p>
        </div>
      )}

      {/* Key Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stock.pe_ratio && (
            <div>
              <p className="text-sm text-gray-600">P/E Ratio</p>
              <p className="text-lg font-semibold text-gray-900">{stock.pe_ratio.toFixed(2)}</p>
            </div>
          )}
          {stock.dividend_yield && (
            <div>
              <p className="text-sm text-gray-600">Dividend Yield</p>
              <p className="text-lg font-semibold text-gray-900">{(stock.dividend_yield * 100).toFixed(2)}%</p>
            </div>
          )}
          {stock.beta && (
            <div>
              <p className="text-sm text-gray-600">Beta</p>
              <p className="text-lg font-semibold text-gray-900">{stock.beta.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockDetails; 
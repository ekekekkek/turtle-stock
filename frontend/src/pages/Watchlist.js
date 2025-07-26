import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { watchlistAPI, stockAPI, signalsAPI } from '../utils/api';
import StockCard from '../components/StockCard';
import { EyeIcon, PlusIcon, MagnifyingGlassIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Helper to extract a string message from error objects
const extractErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.msg) return detail.msg;
  return fallback;
};

const Watchlist = () => {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [signals, setSignals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [signalsRequested, setSignalsRequested] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [uniqueStocksCount, setUniqueStocksCount] = useState(0);

  useEffect(() => {
    fetchWatchlist();
  }, [isAuthenticated]);

  // Auto-fetch daily signals on load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      handleGetSignals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await watchlistAPI.getQuotes();
      setWatchlist(response.data);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError(extractErrorMessage(err, 'Failed to load watchlist. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await signalsAPI.getSignalsStatus();
      setLastRun(res.data.last_run);
    } catch (err) {
      setLastRun(null);
    }
  };

  const handleGetSignals = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to view signals');
      return;
    }
    setSignalsRequested(true);
    try {
      setSignalsLoading(true);
      const [signalsRes, countRes] = await Promise.all([
        signalsAPI.getTodaySignals(),
        signalsAPI.getUniqueStocksCount()
      ]);
      setSignals(signalsRes.data);
      setUniqueStocksCount(countRes.data.unique_stocks_count);
      if (signalsRes.data.length > 0) {
        toast.success(`${countRes.data.unique_stocks_count} unique stocks analyzed!`);
      }
      fetchStatus();
    } catch (err) {
      setSignals([]);
      setUniqueStocksCount(0);
      setError('Unable to get analysis.');
      console.error('Error fetching signals:', err);
      if (err.response?.status === 401) {
        toast.error('Please log in to view signals');
      } else {
        toast.error('Failed to load signals');
      }
    } finally {
      setSignalsLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStockSymbol.trim()) return;

    try {
      setAddingStock(true);
      await watchlistAPI.addStock(newStockSymbol.toUpperCase());
      toast.success(`${newStockSymbol.toUpperCase()} added to watchlist`);
      setNewStockSymbol('');
      setShowAddModal(false);
      fetchWatchlist(); // Refresh the watchlist
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to add stock to watchlist';
      toast.error(message);
    } finally {
      setAddingStock(false);
    }
  };

  const handleRemoveStock = async (symbol) => {
    try {
      await watchlistAPI.removeStock(symbol);
      toast.success(`${symbol} removed from watchlist`);
      setWatchlist(watchlist.filter(stock => stock.symbol !== symbol));
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to remove stock from watchlist';
      toast.error(message);
    }
  };

  const filteredWatchlist = watchlist.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            onClick={fetchWatchlist}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <EyeIcon className="w-8 h-8 mr-3 text-gray-900 dark:text-white" />
            Watchlist
          </h1>
          <p className="mt-2 text-gray-600 dark:text-white">Track your favorite stocks and daily market signals</p>
          {lastRun && (
            <div className="mt-2 text-xs text-gray-500 dark:text-white">
              Last market analysis: {new Date(lastRun).toLocaleString()} (based on previous market close)
            </div>
          )}
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleGetSignals}
            disabled={signalsLoading || !isAuthenticated}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {signalsLoading ? 'Loading...' : 'Get Daily Signals'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Stock
          </button>
        </div>
      </div>

      {/* Daily Signals Section */}
      {isAuthenticated && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 dark:from-gray-950 dark:to-gray-950 dark:bg-gray-950 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <SparklesIcon className="w-6 h-6 text-yellow-600 mr-2 dark:text-yellow-400" />
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-white">Daily Market Analysis</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGetSignals}
                disabled={signalsLoading}
                className="text-sm text-yellow-700 hover:text-yellow-800 underline dark:text-white dark:hover:text-gray-300"
              >
                {signalsLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => setShowHold((prev) => !prev)}
                className="text-sm text-yellow-700 hover:text-yellow-800 underline flex items-center dark:text-white dark:hover:text-gray-300"
                aria-expanded={showHold}
              >
                {showHold ? <ChevronUpIcon className="w-4 h-4 mr-1" /> : <ChevronDownIcon className="w-4 h-4 mr-1" />}
                {showHold ? 'Collapse HOLD' : 'Expand HOLD'}
              </button>
            </div>
          </div>
          
          {signals.length > 0 ? (
            <div>
              <div className="mb-4 text-sm text-yellow-700 dark:text-white">
                <p>Analysis of {uniqueStocksCount} unique stocks from S&P 500 and Nasdaq</p>
                <p>Signals based on {signals[0]?.date ? new Date(signals[0].date).toLocaleDateString() : 'yesterday'}'s market data</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm dark:bg-gray-950">
                  <thead>
                    <tr className="bg-yellow-100 dark:bg-gray-950">
                      <th className="px-3 py-2 text-left text-yellow-800 dark:text-white">Symbol</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">Close</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">20d High</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">50d SMA</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">200d SMA</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">52w High</th>
                      <th className="px-3 py-2 text-right text-yellow-800 dark:text-white">ATR</th>
                      <th className="px-3 py-2 text-center text-yellow-800 dark:text-white">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-gray-950">
                    {(showHold ? signals : signals.filter(sig => sig.signal_triggered)).map(sig => (
                      <tr key={sig.id} className="border-b border-yellow-200 hover:bg-yellow-50 dark:border-gray-700 dark:hover:bg-gray-900 dark:text-gray-200 dark:bg-gray-950">
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">{sig.symbol}</td>
                        <td className="px-3 py-2 text-right">${sig.close?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${sig.high_20d?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${sig.sma_50d?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${sig.sma_200d?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">${sig.high_52w?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{sig.atr?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {sig.signal_triggered ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              BUY
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              HOLD
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : signalsRequested ? (
            <div className="text-center py-8">
              <SparklesIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">No good stocks today.</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Analysis ran, but no stocks met the criteria.</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <SparklesIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">Unable to get analysis.</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Please try again later.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <SparklesIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">No market analysis available</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Click "Get Daily Signals" to analyze S&P 500 and Nasdaq stocks</p>
            </div>
          )}
        </div>
      )}

      {/* Authentication Notice */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <Link to="/login" className="font-medium underline hover:text-blue-600">
                  Sign in
                </Link>
                {' '}to view daily trading signals and generate new insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Section */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow border border-transparent dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Watchlist</h2>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search watchlist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredWatchlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWatchlist.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onRemove={() => handleRemoveStock(stock.symbol)}
                  showRemoveButton={true}
                  unclickable={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <EyeIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">Your watchlist is empty</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Your First Stock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Stock to Watchlist</h3>
            <form onSubmit={handleAddStock}>
              <div className="mb-4">
                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  id="symbol"
                  value={newStockSymbol}
                  onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStock}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {addingStock ? 'Adding...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist; 
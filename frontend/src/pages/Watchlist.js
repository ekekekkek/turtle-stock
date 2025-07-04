import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { watchlistAPI, stockAPI } from '../utils/api';
import StockCard from '../components/StockCard';
import { EyeIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Helper to extract a string message from error objects
const extractErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.msg) return detail.msg;
  return fallback;
};

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <EyeIcon className="w-8 h-8 mr-3" />
            Watchlist
          </h1>
          <p className="mt-2 text-gray-600">Track your favorite stocks</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Stock
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search watchlist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
        />
      </div>

      {/* Watchlist Content */}
      {watchlist.length === 0 ? (
        <div className="text-center py-12">
          <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks in watchlist</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding some stocks to track.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Stock
            </button>
          </div>
        </div>
      ) : (
        <div>
          {filteredWatchlist.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No stocks match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredWatchlist.map((stock) => (
                <div key={stock.symbol} className="relative">
                  <StockCard stock={stock} />
                  <button
                    onClick={() => handleRemoveStock(stock.symbol)}
                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    title="Remove from watchlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock to Watchlist</h3>
              <form onSubmit={handleAddStock}>
                <div className="mb-4">
                  <label htmlFor="stockSymbol" className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    id="stockSymbol"
                    value={newStockSymbol}
                    onChange={(e) => setNewStockSymbol(e.target.value)}
                    placeholder="e.g., AAPL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
        </div>
      )}
    </div>
  );
};

export default Watchlist; 
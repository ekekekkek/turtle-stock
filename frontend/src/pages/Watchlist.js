import React, { useState, useEffect } from 'react';
import StockCard from '../components/StockCard';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock watchlist data
  useEffect(() => {
    const mockWatchlist = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        volume: 45678900,
        marketCap: 2500000000000
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        price: 2750.80,
        change: -15.20,
        changePercent: -0.55,
        volume: 23456700,
        marketCap: 1800000000000
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        price: 320.45,
        change: 8.75,
        changePercent: 2.81,
        volume: 34567800,
        marketCap: 2400000000000
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        price: 850.30,
        change: -25.70,
        changePercent: -2.94,
        volume: 56789000,
        marketCap: 850000000000
      }
    ];

    setWatchlist(mockWatchlist);
    setLoading(false);
  }, []);

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      toast.error('Please enter a stock symbol');
      return;
    }

    const symbol = newSymbol.trim().toUpperCase();
    
    // Check if already in watchlist
    if (watchlist.some(stock => stock.symbol === symbol)) {
      toast.error(`${symbol} is already in your watchlist`);
      return;
    }

    // Mock new stock data
    const newStock = {
      symbol: symbol,
      name: `${symbol} Corporation`,
      price: Math.random() * 1000 + 50,
      change: (Math.random() - 0.5) * 20,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 100000000),
      marketCap: Math.floor(Math.random() * 1000000000000)
    };

    setWatchlist([...watchlist, newStock]);
    setNewSymbol('');
    toast.success(`${symbol} added to watchlist`);
  };

  const handleRemoveStock = (symbol) => {
    setWatchlist(watchlist.filter(stock => stock.symbol !== symbol));
    toast.success(`${symbol} removed from watchlist`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Watchlist</h1>
          <p className="mt-2 text-gray-600">Track your favorite stocks</p>
        </div>
      </div>

      {/* Add Stock Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Stock to Watchlist</h2>
        <form onSubmit={handleAddStock} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter stock symbol (e.g., AAPL)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add
          </button>
        </form>
      </div>

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your watchlist is empty</h3>
          <p className="text-gray-600 mb-4">Add stocks to your watchlist to track their performance</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Watchlist ({watchlist.length} stocks)
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlist.map((stock) => (
              <div key={stock.symbol} className="relative">
                <StockCard stock={stock} />
                <button
                  onClick={() => handleRemoveStock(stock.symbol)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove from watchlist"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Summary */}
      {watchlist.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Watchlist Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{watchlist.length}</p>
              <p className="text-gray-600">Total Stocks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">
                {watchlist.filter(stock => stock.change >= 0).length}
              </p>
              <p className="text-gray-600">Gainers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-danger-600">
                {watchlist.filter(stock => stock.change < 0).length}
              </p>
              <p className="text-gray-600">Losers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist; 
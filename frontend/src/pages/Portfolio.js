import React, { useState, useEffect } from 'react';
import { portfolioAPI, stockAPI } from '../utils/api';
import StockCard from '../components/StockCard';
import { BriefcaseIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: '',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await portfolioAPI.getPortfolio();
      setPortfolio(response.data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to load portfolio. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStock.symbol.trim() || !newStock.shares || !newStock.price) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAddingStock(true);
      const stockData = {
        symbol: newStock.symbol.toUpperCase(),
        shares: parseFloat(newStock.shares),
        price: parseFloat(newStock.price),
        date: newStock.date
      };
      
      await portfolioAPI.addStock(stockData);
      toast.success(`${stockData.symbol} added to portfolio`);
      setNewStock({
        symbol: '',
        shares: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      fetchPortfolio(); // Refresh the portfolio
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to add stock to portfolio';
      toast.error(message);
    } finally {
      setAddingStock(false);
    }
  };

  const handleRemoveStock = async (symbol) => {
    try {
      await portfolioAPI.removeStock(symbol);
      toast.success(`${symbol} removed from portfolio`);
      setPortfolio(portfolio.filter(stock => stock.symbol !== symbol));
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to remove stock from portfolio';
      toast.error(message);
    }
  };

  const calculateTotalValue = () => {
    return portfolio.reduce((total, stock) => {
      const totalShares = stock.purchases.reduce((sum, purchase) => sum + purchase.shares, 0);
      return total + (totalShares * stock.current_price);
    }, 0);
  };

  const calculateTotalGainLoss = () => {
    return portfolio.reduce((total, stock) => {
      const totalShares = stock.purchases.reduce((sum, purchase) => sum + purchase.shares, 0);
      const totalCost = stock.purchases.reduce((sum, purchase) => sum + (purchase.shares * purchase.price), 0);
      const currentValue = totalShares * stock.current_price;
      return total + (currentValue - totalCost);
    }, 0);
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
            onClick={fetchPortfolio}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalValue = calculateTotalValue();
  const totalGainLoss = calculateTotalGainLoss();
  const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BriefcaseIcon className="w-8 h-8 mr-3" />
            Portfolio
          </h1>
          <p className="mt-2 text-gray-600">Manage your investments</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Stock
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
          <p className="text-3xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Gain/Loss</h3>
          <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString()}
          </p>
          <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Stocks</h3>
          <p className="text-3xl font-bold text-gray-900">{portfolio.length}</p>
        </div>
      </div>

      {/* Portfolio Content */}
      {portfolio.length === 0 ? (
        <div className="text-center py-12">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks in portfolio</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding some stocks to your portfolio.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {portfolio.map((stock) => (
            <div key={stock.symbol} className="relative">
              <StockCard stock={stock} />
              <button
                onClick={() => handleRemoveStock(stock.symbol)}
                className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                title="Remove from portfolio"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Purchase Details */}
              <div className="mt-2 bg-white rounded-lg shadow-sm p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Purchase History</h4>
                {stock.purchases.map((purchase, index) => (
                  <div key={index} className="text-xs text-gray-600 mb-1">
                    {purchase.date}: {purchase.shares} shares @ ${purchase.price}
                  </div>
                ))}
                <div className="text-sm font-medium text-gray-900 mt-2">
                  Avg Price: ${(stock.purchases.reduce((sum, p) => sum + (p.shares * p.price), 0) / 
                    stock.purchases.reduce((sum, p) => sum + p.shares, 0)).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock to Portfolio</h3>
              <form onSubmit={handleAddStock}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Symbol
                    </label>
                    <input
                      type="text"
                      id="symbol"
                      value={newStock.symbol}
                      onChange={(e) => setNewStock({...newStock, symbol: e.target.value})}
                      placeholder="e.g., AAPL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      id="shares"
                      value={newStock.shares}
                      onChange={(e) => setNewStock({...newStock, shares: e.target.value})}
                      placeholder="e.g., 10"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price per Share
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={newStock.price}
                      onChange={(e) => setNewStock({...newStock, price: e.target.value})}
                      placeholder="e.g., 150.25"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={newStock.date}
                      onChange={(e) => setNewStock({...newStock, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
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

export default Portfolio; 
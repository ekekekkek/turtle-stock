import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [newStock, setNewStock] = useState({ symbol: '', shares: '', price: '' });
  const [loading, setLoading] = useState(true);

  // Mock portfolio data with purchases
  useEffect(() => {
    const mockPortfolio = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.25,
        change: 2.15,
        changePercent: 1.45,
        volume: 45678900,
        marketCap: 2500000000000,
        purchases: [
          { shares: 10, price: 145.5, date: '2024-06-01' }
        ]
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        currentPrice: 320.45,
        change: 8.75,
        changePercent: 2.81,
        volume: 34567800,
        marketCap: 2400000000000,
        purchases: [
          { shares: 5, price: 310.0, date: '2024-06-02' }
        ]
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        currentPrice: 2750.80,
        change: -15.20,
        changePercent: -0.55,
        volume: 23456700,
        marketCap: 1800000000000,
        purchases: [
          { shares: 3, price: 2800.0, date: '2024-06-03' }
        ]
      }
    ];
    setPortfolio(mockPortfolio);
    setLoading(false);
  }, []);

  // Add or buy more shares of a stock
  const handleAddStock = (e) => {
    e.preventDefault();
    const { symbol, shares, price } = newStock;
    if (!symbol.trim() || !shares || !price) {
      toast.error('Please fill in all fields');
      return;
    }
    const stockSymbol = symbol.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    const purchase = { shares: parseInt(shares), price: parseFloat(price), date: today };
    const stockIndex = portfolio.findIndex(stock => stock.symbol === stockSymbol);
    if (stockIndex !== -1) {
      // Add purchase to existing stock
      const updatedPortfolio = [...portfolio];
      updatedPortfolio[stockIndex].purchases.push(purchase);
      setPortfolio(updatedPortfolio);
      toast.success(`Bought more shares of ${stockSymbol}`);
    } else {
      // Add new stock
      const newStockData = {
        symbol: stockSymbol,
        name: `${stockSymbol} Corporation`,
        currentPrice: Math.random() * 1000 + 50,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 100000000),
        marketCap: Math.floor(Math.random() * 1000000000000),
        purchases: [purchase]
      };
      setPortfolio([...portfolio, newStockData]);
      toast.success(`${stockSymbol} added to portfolio`);
    }
    setNewStock({ symbol: '', shares: '', price: '' });
  };

  const handleRemoveStock = (symbol) => {
    setPortfolio(portfolio.filter(stock => stock.symbol !== symbol));
    toast.success(`${symbol} removed from portfolio`);
  };

  // Calculate stats
  const calculatePortfolioStats = () => {
    if (portfolio.length === 0) return null;
    let totalInvested = 0;
    let totalCurrent = 0;
    portfolio.forEach(stock => {
      const totalShares = stock.purchases.reduce((sum, p) => sum + p.shares, 0);
      const avgPrice = stock.purchases.reduce((sum, p) => sum + p.shares * p.price, 0) / (totalShares || 1);
      totalInvested += stock.purchases.reduce((sum, p) => sum + p.shares * p.price, 0);
      totalCurrent += totalShares * stock.currentPrice;
    });
    const totalGainLoss = totalCurrent - totalInvested;
    const totalGainLossPercent = (totalGainLoss / totalInvested) * 100;
    return { totalInvested, totalCurrent, totalGainLoss, totalGainLossPercent };
  };
  const stats = calculatePortfolioStats();

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
          <h1 className="text-3xl font-bold text-gray-900">My Portfolio</h1>
          <p className="mt-2 text-gray-600">Track your investments and performance</p>
        </div>
      </div>
      {/* Portfolio Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Invested</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.totalInvested.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Value</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.totalCurrent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Gain/Loss</h3>
            <p className={`text-2xl font-bold ${
              stats.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {stats.totalGainLoss >= 0 ? '+' : ''}${stats.totalGainLoss.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Return %</h3>
            <p className={`text-2xl font-bold ${
              stats.totalGainLossPercent >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {stats.totalGainLossPercent >= 0 ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
      {/* Add Stock Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Buy Shares / Add Stock to Portfolio</h2>
        <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Symbol (e.g., AAPL)"
            value={newStock.symbol}
            onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Shares"
            value={newStock.shares}
            onChange={(e) => setNewStock({ ...newStock, shares: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Unit Price"
            value={newStock.price}
            onChange={(e) => setNewStock({ ...newStock, price: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Buy/Add
          </button>
        </form>
      </div>
      {/* Portfolio Holdings */}
      {portfolio.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your portfolio is empty</h3>
          <p className="text-gray-600 mb-4">Add stocks to your portfolio to track your investments</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Holdings ({portfolio.length} stocks)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((stock) => {
              const totalShares = stock.purchases.reduce((sum, p) => sum + p.shares, 0);
              const avgPrice = stock.purchases.reduce((sum, p) => sum + p.shares * p.price, 0) / (totalShares || 1);
              const totalInvested = stock.purchases.reduce((sum, p) => sum + p.shares * p.price, 0);
              const currentValue = totalShares * stock.currentPrice;
              const gainLoss = currentValue - totalInvested;
              const gainLossPercent = (gainLoss / totalInvested) * 100;
              return (
                <div key={stock.symbol} className="relative">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{stock.symbol}</h3>
                        <p className="text-sm text-gray-600 truncate max-w-48">{stock.name}</p>
                        <p className="text-sm text-gray-500">{totalShares} shares @ ${avgPrice.toFixed(2)} avg</p>
                        <div className="mt-2">
                          <h4 className="font-semibold text-gray-700 text-xs mb-1">Purchases:</h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {stock.purchases.map((p, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>{p.shares} shares @ ${p.price.toFixed(2)}</span>
                                <span className="ml-2">{p.date}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">${stock.currentPrice.toFixed(2)}</p>
                        <div className={`flex items-center text-sm font-medium ${
                          stock.change >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Invested</span>
                        <span className="font-medium">${totalInvested.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Value</span>
                        <span className="font-medium">${currentValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gain/Loss</span>
                        <span className={`font-medium ${
                          gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveStock(stock.symbol)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove from portfolio"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio; 
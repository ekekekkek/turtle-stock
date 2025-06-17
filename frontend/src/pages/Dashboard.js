import React, { useState, useEffect } from 'react';
import StockCard from '../components/StockCard';
import StockChart from '../components/StockChart';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('1D');
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockStocks = [
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
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com, Inc.',
        price: 3200.15,
        change: 45.85,
        changePercent: 1.45,
        volume: 12345600,
        marketCap: 1600000000000
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        price: 450.75,
        change: 12.30,
        changePercent: 2.81,
        volume: 78901200,
        marketCap: 1100000000000
      }
    ];

    setStocks(mockStocks);
    setLoading(false);
  }, []);

  const mockChartData = [
    { timestamp: '2024-01-01T09:30:00', price: 148.50 },
    { timestamp: '2024-01-01T10:30:00', price: 149.20 },
    { timestamp: '2024-01-01T11:30:00', price: 150.10 },
    { timestamp: '2024-01-01T12:30:00', price: 149.80 },
    { timestamp: '2024-01-01T13:30:00', price: 150.25 },
    { timestamp: '2024-01-01T14:30:00', price: 151.00 },
    { timestamp: '2024-01-01T15:30:00', price: 150.75 },
    { timestamp: '2024-01-01T16:00:00', price: 150.25 }
  ];

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const timeRanges = ['1D', '1W', '1M', '3M', '1Y'];

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
          <h1 className="text-3xl font-bold text-gray-900">Market Dashboard</h1>
          <p className="mt-2 text-gray-600">Real-time stock market overview</p>
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 sm:mt-0 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
          />
        </div>
      </div>

      {/* Market Overview Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Market Overview</h2>
          <div className="flex space-x-2">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <StockChart data={mockChartData} symbol="SPY" timeRange={timeRange} />
      </div>

      {/* Trending Stocks */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Stocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">S&P 500</h3>
          <p className="text-2xl font-bold text-gray-900">4,567.89</p>
          <p className="text-success-600 text-sm">+23.45 (+0.52%)</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">NASDAQ</h3>
          <p className="text-2xl font-bold text-gray-900">14,234.56</p>
          <p className="text-danger-600 text-sm">-12.34 (-0.09%)</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">DOW JONES</h3>
          <p className="text-2xl font-bold text-gray-900">34,567.12</p>
          <p className="text-success-600 text-sm">+45.67 (+0.13%)</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
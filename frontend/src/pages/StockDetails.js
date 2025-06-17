import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import StockChart from '../components/StockChart';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const StockDetails = () => {
  const { symbol } = useParams();
  const [timeRange, setTimeRange] = useState('1D');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockStockData = {
      symbol: symbol,
      name: 'Apple Inc.',
      price: 150.25,
      change: 2.15,
      changePercent: 1.45,
      volume: 45678900,
      marketCap: 2500000000000,
      pe: 25.5,
      dividend: 0.88,
      dividendYield: 0.58,
      high: 152.30,
      low: 148.90,
      open: 149.10,
      previousClose: 148.10,
      beta: 1.2,
      eps: 5.89,
      sector: 'Technology',
      industry: 'Consumer Electronics'
    };

    setStockData(mockStockData);
    setLoading(false);
  }, [symbol]);

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

  const timeRanges = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stock Not Found</h2>
        <p className="text-gray-600">The stock symbol "{symbol}" could not be found.</p>
      </div>
    );
  }

  const isPositive = stockData.change >= 0;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(stockData.price);

  const formattedChange = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(stockData.change));

  return (
    <div className="space-y-6">
      {/* Stock Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{stockData.symbol}</h1>
            <p className="text-lg text-gray-600">{stockData.name}</p>
            <p className="text-sm text-gray-500">{stockData.sector} • {stockData.industry}</p>
          </div>
          <div className="mt-4 lg:mt-0 text-right">
            <p className="text-4xl font-bold text-gray-900">{formattedPrice}</p>
            <div className={`flex items-center justify-end text-lg font-medium ${
              isPositive ? 'text-success-600' : 'text-danger-600'
            }`}>
              {isPositive ? (
                <ArrowUpIcon className="w-5 h-5 mr-1" />
              ) : (
                <ArrowDownIcon className="w-5 h-5 mr-1" />
              )}
              {formattedChange} ({stockData.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Price Chart</h2>
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
        <StockChart data={mockChartData} symbol={symbol} timeRange={timeRange} />
      </div>

      {/* Stock Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Market Cap</span>
              <span className="font-medium">
                ${(stockData.marketCap / 1000000000).toFixed(2)}B
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">P/E Ratio</span>
              <span className="font-medium">{stockData.pe}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">EPS</span>
              <span className="font-medium">${stockData.eps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Beta</span>
              <span className="font-medium">{stockData.beta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dividend Yield</span>
              <span className="font-medium">{stockData.dividendYield}%</span>
            </div>
          </div>
        </div>

        {/* Trading Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Open</span>
              <span className="font-medium">${stockData.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Previous Close</span>
              <span className="font-medium">${stockData.previousClose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Day High</span>
              <span className="font-medium">${stockData.high}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Day Low</span>
              <span className="font-medium">${stockData.low}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Volume</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(stockData.volume)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Description */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About {stockData.name}</h3>
        <p className="text-gray-600 leading-relaxed">
          {stockData.name} is a leading technology company that designs, manufactures, and markets 
          smartphones, personal computers, tablets, wearables, and accessories worldwide. The company 
          offers iPhone, Mac, iPad, and wearables, home, and accessories. It also provides digital 
          content, applications, and various cloud services. The company serves consumers, small and 
          mid-sized businesses, and education, enterprise, and government customers.
        </p>
      </div>
    </div>
  );
};

export default StockDetails; 
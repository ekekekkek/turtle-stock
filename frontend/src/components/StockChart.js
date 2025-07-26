import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const StockChart = ({ data, symbol, timeRange = '1D' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const formatTooltip = (value, name) => {
    if (name === 'price') {
      return [`$${value.toFixed(2)}`, 'Price'];
    }
    return [value, name];
  };

  const formatXAxis = (tickItem) => {
    if (timeRange === '1D') {
      return new Date(tickItem).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return new Date(tickItem).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const isPositive = data[data.length - 1]?.price >= data[0]?.price;
  const gradientId = `gradient-${symbol}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {symbol} - {timeRange}
        </h3>
        <div className={`text-sm font-medium ${
          isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
        }`}>
          {isPositive ? '+' : ''}
          {((data[data.length - 1]?.price - data[0]?.price) / data[0]?.price * 100).toFixed(2)}%
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="dark:stroke-gray-600" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            stroke="#9ca3af"
            className="dark:stroke-gray-400"
            fontSize={12}
          />
          <YAxis
            domain={['dataMin - 1', 'dataMax + 1']}
            stroke="#9ca3af"
            className="dark:stroke-gray-400"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => new Date(label).toLocaleString()}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#f9fafb',
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart; 
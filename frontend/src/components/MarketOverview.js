import React from 'react';

const MarketOverview = ({ data }) => {
  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatChange = (change, changePercent) => {
    const isPositive = change >= 0;
    const sign = isPositive ? '+' : '';
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {sign}{change.toFixed(2)} ({sign}{changePercent.toFixed(2)}%)
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.indices?.map((index) => (
          <div key={index.symbol} className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{index.name}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {index.price ? index.price.toFixed(2) : 'N/A'}
            </p>
            {index.change !== undefined && index.changePercent !== undefined && (
              <p className="text-sm">
                {formatChange(index.change, index.changePercent)}
              </p>
            )}
          </div>
        ))}
      </div>

      {data.metrics && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Market Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.metrics.advancing && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Advancing</p>
                <p className="text-xl font-bold text-green-600">{data.metrics.advancing}</p>
              </div>
            )}
            {data.metrics.declining && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Declining</p>
                <p className="text-xl font-bold text-red-600">{data.metrics.declining}</p>
              </div>
            )}
            {data.metrics.unchanged && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Unchanged</p>
                <p className="text-xl font-bold text-gray-600">{data.metrics.unchanged}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {data.volume && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Total Volume</p>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(data.volume)}</p>
        </div>
      )}
    </div>
  );
};

export default MarketOverview; 
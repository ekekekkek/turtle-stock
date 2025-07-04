import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const StockCard = ({ stock }) => {
  const {
    symbol,
    name,
    price = 0,
    change = 0,
    changePercent,    // might be undefined
    volume = 0,
    marketCap         // might be undefined
  } = stock;

  // fall back to snake_case props or sensible defaults
  const displayName = name ?? stock.company_name ?? symbol;
  const cp = typeof changePercent === 'number'
    ? changePercent
    : stock.change_percent ?? 0;
  const mc = typeof marketCap === 'number'
    ? marketCap
    : stock.market_cap ?? 0;

  const isPositive = change >= 0;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);

  const formattedChange = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(change));

  const formattedVolume = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(volume);

  const formattedMarketCap = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(mc);

  return (
    <Link
      to={`/stock/${symbol}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
          <p className="text-sm text-gray-600 truncate max-w-48">{displayName}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{formattedPrice}</p>
          <div
            className={`flex items-center text-sm font-medium ${
              isPositive ? 'text-success-600' : 'text-danger-600'
            }`}
          >
            {isPositive ? (
              <ArrowUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 mr-1" />
            )}
            {formattedChange} ({cp.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Volume</p>
          <p className="font-medium text-gray-900">{formattedVolume}</p>
        </div>
        <div>
          <p className="text-gray-500">Market Cap</p>
          <p className="font-medium text-gray-900">{formattedMarketCap}</p>
        </div>
      </div>
    </Link>
  );
};

export default StockCard;

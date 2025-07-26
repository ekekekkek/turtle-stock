import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';

const StockCard = ({ stock, showRemoveButton = false, onRemove, unclickable = false }) => {
  const {
    symbol,
    name,
    price = 0,
    change = 0,
    changePercent,    // might be undefined
    volume = 0,
    marketCap,         // might be undefined
    sma_200d,
    high_52w
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

  const sma200 = stock.sma_200d;
  const high52w = stock.high_52w;

  const CardWrapper = unclickable ? 'div' : Link;
  const cardProps = unclickable ? {} : { to: `/stock/${symbol}` };
  return (
    <CardWrapper
      {...cardProps}
      className="block bg-white dark:bg-gray-950 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 dark:border-gray-700 relative"
    >
      <div className="flex justify-between items-start mb-4 pt-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{symbol}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-48">{displayName}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formattedPrice}</p>
          <div
            className={`flex items-center text-sm font-medium ${
              isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
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
        {showRemoveButton && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-transparent rounded-full p-1 focus:outline-none"
            aria-label="Remove from watchlist"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Volume</p>
          <p className="font-medium text-gray-900 dark:text-white">{formattedVolume}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Market Cap</p>
          <p className="font-medium text-gray-900 dark:text-white">{formattedMarketCap}</p>
        </div>
        {sma200 !== undefined && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">200d SMA</p>
            <p className="font-medium text-gray-900 dark:text-white">{sma200 ? `$${sma200.toFixed(2)}` : 'N/A'}</p>
          </div>
        )}
        {high52w !== undefined && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">52w High</p>
            <p className="font-medium text-gray-900 dark:text-white">{high52w ? `$${high52w.toFixed(2)}` : 'N/A'}</p>
          </div>
        )}
      </div>
    </CardWrapper>
  );
};

export default StockCard;

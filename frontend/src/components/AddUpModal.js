import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { portfolioAPI } from '../utils/api';

const AddUpModal = ({ isOpen, onClose, holding, onAddUp }) => {
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  const maxAddUpShares = holding ? Math.floor(Math.max(holding.shares - 1, 1)) : 0;
  const pyramidError = shares && Number(shares) >= holding?.shares;

  useEffect(() => {
    if (holding) {
      setPrice(holding.current_price);
      setShares('');
      setDate(new Date().toISOString().split('T')[0]);
      setRecommendation(null);
      fetchRecommendation();
    }
    // eslint-disable-next-line
  }, [holding]);

  const fetchRecommendation = async () => {
    if (!holding) return;
    try {
      setLoading(true);
      // Use the same endpoint as AddStockModal for position size
      const settings = await portfolioAPI.getSettings();
      const res = await portfolioAPI.getPositionSize({
        symbol: holding.symbol,
        capital: settings.data.capital,
        risk_percent: settings.data.risk_tolerance,
        window: 14
      });
      setRecommendation(res.data);
    } catch (err) {
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shares || !price) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await portfolioAPI.addUpStock({
        symbol: holding.symbol,
        shares: parseFloat(shares),
        price: parseFloat(price),
        date
      });
      toast.success('Add-up successful!');
      onAddUp();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add up');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !holding) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add-up to {holding.symbol}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-blue-900 font-semibold mb-2">Recommended Add-up</div>
              <div className="text-sm text-blue-700 mb-1">ATR: ${recommendation.atr.toFixed(2)}</div>
              <div className="text-sm text-blue-700 mb-1">Add-up Stop Distance: ${recommendation.stop_loss_distance.toFixed(2)}</div>
              <div className="text-sm text-blue-700 mb-1">Recommended Shares: {Math.min(recommendation.recommended_shares, maxAddUpShares)}</div>
              <div className="text-sm text-blue-700 mb-1">Position Value: ${recommendation.position_value}</div>
              <div className="text-sm text-blue-700 mb-1">Risk Amount: ${recommendation.risk_amount}</div>
              <div className="text-sm text-blue-700 mb-1">Max Add-up Shares Allowed: {maxAddUpShares}</div>
            </div>
          )}
          {pyramidError && (
            <div className="text-red-600 text-sm mb-2">Add-up shares must be less than current shares ({holding.shares}) for pyramid structure.</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shares to Add *</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                min={0}
                max={maxAddUpShares}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Share *</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                min={0}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pyramidError}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add-up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUpModal; 
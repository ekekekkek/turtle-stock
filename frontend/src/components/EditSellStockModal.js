import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { portfolioAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function EditSellStockModal({ isOpen, onClose, holding, onSold }) {
  const [tab, setTab] = useState('sell');
  const [sellData, setSellData] = useState({
    shares: '',
    price_per_share: '',
    sell_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen || !holding) return null;

  const handleSell = async (e) => {
    e.preventDefault();
    if (!sellData.shares || !sellData.price_per_share) {
      toast.error('Please fill in all fields');
      return;
    }
    if (Number(sellData.shares) > holding.shares) {
      toast.error(`Cannot sell more than ${holding.shares} shares`);
      return;
    }
    try {
      setLoading(true);
      await portfolioAPI.sellStock(holding.symbol, {
        shares: Number(sellData.shares),
        price_per_share: Number(sellData.price_per_share),
        sell_date: sellData.sell_date,
      });
      toast.success('Stock sold!');
      onClose();
      onSold && onSold();
    } catch (err) {
      toast.error('Failed to sell stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
        <Dialog.Panel className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-bold mb-4">Edit / Sell {holding.symbol}</Dialog.Title>
          <div className="mb-4">
            <button
              className={`px-4 py-2 rounded-l ${tab === 'sell' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setTab('sell')}
            >
              Sell
            </button>
            {/* Future: Add Edit tab here */}
          </div>
          {tab === 'sell' && (
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Symbol</label>
                <input type="text" value={holding.symbol} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shares to Sell</label>
                <input
                  type="number"
                  min={0.01}
                  max={holding.shares}
                  step={0.01}
                  value={sellData.shares}
                  onChange={e => setSellData(s => ({ ...s, shares: e.target.value }))}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
                <span className="text-xs text-gray-400">You own {holding.shares} shares</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price per Share ($)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={sellData.price_per_share}
                  onChange={e => setSellData(s => ({ ...s, price_per_share: e.target.value }))}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sell Date</label>
                <input
                  type="date"
                  value={sellData.sell_date}
                  onChange={e => setSellData(s => ({ ...s, sell_date: e.target.value }))}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded">
                  {loading ? 'Selling...' : 'Sell'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 
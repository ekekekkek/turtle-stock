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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!isOpen || !holding) {
    // Reset confirmation state when modal closes
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    }
    return null;
  }

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

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await portfolioAPI.removeStock(holding.symbol);
      toast.success(`${holding.symbol} deleted from portfolio`);
      setShowDeleteConfirm(false);
      onClose();
      onSold && onSold();
    } catch (err) {
      toast.error('Failed to delete stock');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
        <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
          <Dialog.Title className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Sell/Delete {holding.symbol}</Dialog.Title>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Deleting your holdings won't be recorded in trade history.</p>
          <div className="mb-4">
            {/* <button
              className={`px-4 py-2 rounded-l ${tab === 'sell' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
              onClick={() => setTab('sell')}
            >
              Sell
            </button> */}
            {/* Future: Add Edit tab here */}
          </div>
          {tab === 'sell' && (
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Symbol</label>
                <input type="text" value={holding.symbol} disabled className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shares to Sell</label>
                <input
                  type="number"
                  min={0.01}
                  max={holding.shares}
                  step={0.01}
                  value={sellData.shares}
                  onChange={e => setSellData(s => ({ ...s, shares: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">You own {holding.shares} shares</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sell Price per Share ($)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={sellData.price_per_share}
                  onChange={e => setSellData(s => ({ ...s, price_per_share: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sell Date</label>
                <input
                  type="date"
                  value={sellData.sell_date}
                  onChange={e => setSellData(s => ({ ...s, sell_date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-between items-center mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete Stock
                </button>
                <div className="flex space-x-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                    {loading ? 'Selling...' : 'Sell'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>

    {/* Delete Confirmation Modal */}
    <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
      <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black bg-opacity-50">
        <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
          <Dialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</Dialog.Title>
          <Dialog.Description className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete {holding.symbol}? Deleted trades aren't recorded.
          </Dialog.Description>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
    </>
  );
} 
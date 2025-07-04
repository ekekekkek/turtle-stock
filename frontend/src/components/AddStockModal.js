import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AddStockModal = ({ isOpen, onClose, onAddStock }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.shares || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await onAddStock({
        symbol: formData.symbol.toUpperCase(),
        shares: parseFloat(formData.shares),
        price: parseFloat(formData.price),
        date: formData.date
      });
      
      // Reset form
      setFormData({
        symbol: '',
        shares: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      onClose();
      toast.success('Stock added to portfolio successfully!');
    } catch (error) {
      toast.error('Failed to add stock to portfolio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add Stock to Portfolio</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Symbol *
                </label>
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Shares *
                </label>
                <input
                  type="number"
                  id="shares"
                  name="shares"
                  value={formData.shares}
                  onChange={handleChange}
                  placeholder="e.g., 10"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Share *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g., 150.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
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
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal; 
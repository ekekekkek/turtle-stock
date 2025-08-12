import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { portfolioAPI } from '../utils/api';

const AddStockModal = ({ isOpen, onClose, onAddStock }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    symbol: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    shares: ''
  });
  const [positionSizeData, setPositionSizeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculatingPosition, setCalculatingPosition] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = async () => {
    if (!formData.symbol || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCalculatingPosition(true);
      // Get user settings to calculate position size
      const settingsResponse = await portfolioAPI.getSettings();
      const settings = settingsResponse.data;
      
      // Calculate position size based on volatility
      const positionResponse = await portfolioAPI.getPositionSize({
        symbol: formData.symbol.toUpperCase(),
        capital: settings.capital,
        risk_percent: settings.risk_tolerance,
        window: 14 // Default ATR window
      });
      
      setPositionSizeData(positionResponse.data);
      setStep(2);
    } catch (error) {
      console.error('Error calculating position size:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to calculate position size. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCalculatingPosition(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setPositionSizeData(null);
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
      setPositionSizeData(null);
      setStep(1);
      
      onClose();
      toast.success('Stock added to portfolio successfully!');
    } catch (error) {
      toast.error('Failed to add stock to portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      symbol: '',
      shares: '',
      price: '',
      date: new Date().toISOString().split('T')[0]
    });
    setPositionSizeData(null);
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {step === 1 ? 'Add Stock to Portfolio' : 'Position Size Recommendation'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 mx-2 ${
              step >= 2 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}>
              2
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stock Symbol *
                  </label>
                  <input
                    type="text"
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="e.g., AAPL"
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculatingPosition}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {calculatingPosition ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Calculating...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <>
              {!positionSizeData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Calculating position size...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    {/* Position Size Recommendation */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Position Size Recommendation
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                        Based on volatility (ATR) and your risk tolerance. Stop loss is set at 2× ATR below entry price.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white dark:bg-blue-800/30 rounded p-2 border border-blue-100 dark:border-blue-600">
                          <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">Current Price</span>
                          <div className="text-blue-900 dark:text-blue-100 font-semibold">${positionSizeData.current_price.toFixed(2)}</div>
                        </div>
                        <div className="bg-white dark:bg-blue-800/30 rounded p-2 border border-blue-100 dark:border-blue-600">
                          <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">ATR (Volatility)</span>
                          <div className="text-blue-900 dark:text-blue-100 font-semibold">${positionSizeData.atr.toFixed(2)}</div>
                          {positionSizeData.volatility_source && (
                            <div className="text-blue-500 dark:text-blue-400 text-xs mt-1">
                              Source: {positionSizeData.volatility_source}
                            </div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-blue-800/30 rounded p-2 border border-blue-100 dark:border-blue-600">
                          <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">Stop Loss Price</span>
                          <div className="text-blue-900 dark:text-blue-100 font-semibold">${positionSizeData.stop_loss_price.toFixed(2)}</div>
                        </div>
                        <div className="bg-white dark:bg-blue-800/30 rounded p-2 border border-blue-100 dark:border-blue-600">
                          <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">Risk Amount</span>
                          <div className="text-blue-900 dark:text-blue-100 font-semibold">${positionSizeData.risk_amount.toFixed(2)}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-200 dark:border-green-700 col-span-2">
                          <span className="text-green-700 dark:text-green-300 text-xs font-medium">Recommended Position</span>
                          <div className="text-green-900 dark:text-green-100 font-semibold text-lg">{positionSizeData.recommended_shares.toFixed(2)} shares</div>
                          <div className="text-green-700 dark:text-green-300 text-sm">${positionSizeData.position_value.toFixed(2)} total value</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="shares" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Number of Shares *
                      </label>
                      <input
                        type="number"
                        id="shares"
                        name="shares"
                        value={formData.shares}
                        onChange={handleChange}
                        placeholder={positionSizeData.recommended_shares.toFixed(2)}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended: {positionSizeData.recommended_shares.toFixed(2)} shares 
                        (${positionSizeData.position_value.toFixed(2)})
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
                    >
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                      Back
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStockModal; 
// src/pages/Portfolio.js
import React, { useState, useEffect } from 'react'
import { portfolioAPI } from '../utils/api'
import { BriefcaseIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import AddStockModal from '../components/AddStockModal'

const extractErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState([])
  const [summary, setSummary]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const loadPerformance = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading portfolio performance...')
      const res = await portfolioAPI.getPerformance()  // GET /api/portfolio/performance
      console.log('Portfolio performance response:', res.data)
      setHoldings(res.data.holdings)
      setSummary(res.data.summary)
    } catch (err) {
      console.error('Portfolio performance error:', err)
      setError(
        extractErrorMessage(err, 'Failed to load portfolio performance')
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPerformance()
  }, [])

  const handleAddStock = async (stockData) => {
    try {
      await portfolioAPI.addStock(stockData)
      loadPerformance() // Refresh the portfolio data
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to add stock to portfolio'))
    }
  }

  const handleRemoveStock = async (symbol) => {
    try {
      await portfolioAPI.removeStock(symbol)
      toast.success(`${symbol} removed from portfolio`)
      loadPerformance() // Refresh the portfolio data
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to remove stock from portfolio'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BriefcaseIcon className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl font-bold">Portfolio Performance</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Stock
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Invested</h3>
          <p className="text-2xl font-semibold">
            ${summary.total_invested?.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Current</h3>
          <p className="text-2xl font-semibold">
            ${summary.total_current?.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Gain/Loss</h3>
          <p
            className={`text-2xl font-semibold ${
              summary.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {summary.total_gain_loss >= 0 ? '+' : ''}
            ${summary.total_gain_loss?.toLocaleString()} (
            {summary.total_gain_loss_percent?.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Individual Holdings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holdings.map((h) => (
          <div
            key={h.symbol}
            className="bg-white rounded-lg shadow p-6 flex flex-col justify-between relative"
          >
            <button
              onClick={() => handleRemoveStock(h.symbol)}
              className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
              title="Remove from portfolio"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <div>
              <h4 className="text-lg font-semibold">{h.symbol}</h4>
              <p className="text-sm text-gray-500">Shares: {h.shares}</p>
            </div>
            <div className="mt-4 space-y-1">
              <p>Avg Price: ${h.average_price.toFixed(2)}</p>
              <p>Current: ${h.current_price.toFixed(2)}</p>
              <p>
                Value: ${(h.shares * h.current_price).toLocaleString()}
              </p>
            </div>
            <p
              className={`mt-4 font-semibold ${
                h.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {h.gain_loss >= 0 ? '+' : ''}
              ${h.gain_loss.toLocaleString()} (
              {h.gain_loss_percent.toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddStock={handleAddStock}
      />
    </div>
  )
}

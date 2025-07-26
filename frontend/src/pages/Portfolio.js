// src/pages/Portfolio.js
import React, { useState, useEffect } from 'react'
import { portfolioAPI } from '../utils/api'
import { BriefcaseIcon, PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import AddStockModal from '../components/AddStockModal'
import { Dialog } from '@headlessui/react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import EditSellStockModal from '../components/EditSellStockModal'
import AddUpModal from '../components/AddUpModal'

const extractErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState([])
  const [summary, setSummary]   = useState({})
  const [userSettings, setUserSettings] = useState({ capital: 0, risk_tolerance: 0, max_loss_limit: 0 })
  const [tradeHistory, setTradeHistory] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [editSettings, setEditSettings] = useState({ capital: 0, risk_tolerance: 0 })
  const [showEditSellModal, setShowEditSellModal] = useState(false)
  const [selectedHolding, setSelectedHolding] = useState(null)
  const [showAddUpModal, setShowAddUpModal] = useState(false)
  const [selectedAddUpHolding, setSelectedAddUpHolding] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDetailHolding, setSelectedDetailHolding] = useState(null)
  const [showEditSellMenu, setShowEditSellMenu] = useState(false)
  const [editSellMenuAnchor, setEditSellMenuAnchor] = useState(null)

  const loadPerformance = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading portfolio performance...')
      const res = await portfolioAPI.getPerformance()  // GET /api/portfolio/performance
      console.log('Portfolio performance response:', res.data)
      setHoldings(res.data.holdings)
      setSummary(res.data.summary)
      setUserSettings(res.data.user_settings)
      setTradeHistory(res.data.trade_history)
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

  const handleEditSettings = () => {
    setEditSettings({
      capital: userSettings.capital,
      risk_tolerance: userSettings.risk_tolerance
    })
    setShowEditSettings(true)
  }

  const handleSaveSettings = async () => {
    try {
      await portfolioAPI.updateSettings(editSettings)
      setShowEditSettings(false)
      loadPerformance()
      toast.success('Settings updated!')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update settings'))
    }
  }

  // Prepare trade history chart data
  const chartData = React.useMemo(() => {
    // First, reverse the trade history to get chronological order (oldest first)
    const chronologicalTrades = [...tradeHistory].reverse()
    let cumulative = 0
    
    return chronologicalTrades.map((t, i) => {
      cumulative += t.net_value
      return {
        name: `${t.symbol} #${i + 1}`,
        net: t.net_value,
        cumulative: cumulative,
      }
    })
  }, [tradeHistory])

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
          <BriefcaseIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portfolio Performance</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Stock
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Invested</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            ${summary.total_invested?.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Current</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            ${summary.total_current?.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Gain/Loss</h3>
          <p
            className={`text-2xl font-semibold ${
              summary.total_gain_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {summary.total_gain_loss >= 0 ? '+' : ''}
            ${summary.total_gain_loss?.toLocaleString()} (
            {summary.total_gain_loss_percent?.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* User Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 flex items-center justify-between border border-transparent dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Capital</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">${userSettings.capital?.toLocaleString()}</p>
          </div>
          <button onClick={handleEditSettings} className="ml-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit Settings">
            <PencilIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 flex items-center justify-between border border-transparent dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Risk Level</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{userSettings.risk_tolerance}%</p>
          </div>
          <button onClick={handleEditSettings} className="ml-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit Settings">
            <PencilIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Max Loss Limit</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">${userSettings.max_loss_limit?.toLocaleString()}</p>
        </div>
      </div>

      {/* Edit Settings Modal */}
      <Dialog open={showEditSettings} onClose={() => setShowEditSettings(false)}>
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Edit Portfolio Settings</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Capital ($)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={editSettings.capital}
                  min={0}
                  onChange={e => setEditSettings(s => ({ ...s, capital: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Level (%)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={editSettings.risk_tolerance}
                  min={0}
                  max={100}
                  onChange={e => setEditSettings(s => ({ ...s, risk_tolerance: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowEditSettings(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
              <button onClick={handleSaveSettings} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Individual Holdings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holdings.map((h) => (
          <div
            key={h.symbol}
            className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 flex flex-col justify-between relative border border-transparent dark:border-gray-700"
          >
            {/* Scope icon for details */}
            <button
              onClick={() => { setSelectedDetailHolding(h); setShowDetailModal(true) }}
              className="absolute top-2 right-2 p-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              title="View Details"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
            {/* Pencil icon for edit/sell/delete menu */}
            <button
              onClick={() => { setSelectedHolding(h); setShowEditSellModal(true) }}
              className="absolute top-2 right-9 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Edit / Sell / Delete"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            {/* Add-up icon remains */}
            <button
              onClick={() => { setSelectedAddUpHolding(h); setShowAddUpModal(true) }}
              className="absolute top-2 right-16 p-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              title="Add-up"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{h.symbol}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Shares: {h.shares}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Entry Date: {Array.isArray(h.purchase_dates) && h.purchase_dates.length > 0 ? new Date(h.purchase_dates[0]).toLocaleDateString() : '-'}</p>
              {Array.isArray(h.purchase_dates) && h.purchase_dates.length > 1 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Add-up Dates: {h.purchase_dates.slice(1).map(d => new Date(d).toLocaleDateString()).join(', ')}</p>
              )}
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-gray-900 dark:text-white">Avg Price: ${h.average_price.toFixed(2)}</p>
              <p className="text-gray-900 dark:text-white">Current: ${h.current_price.toFixed(2)}</p>
              <p className="text-gray-900 dark:text-white">Value: ${(h.shares * h.current_price).toLocaleString()}</p>
              <p className="text-sm text-red-600 dark:text-red-400">Stop Loss: ${h.stop_loss_price?.toFixed(2) ?? '-'}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Add-up Point: {h.atr != null ? `$${(h.average_price + h.atr).toFixed(2)}` : '-'}</p>
            </div>
            <p
              className={`mt-4 font-semibold ${
                h.gain_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {h.gain_loss >= 0 ? '+' : ''}
              ${h.gain_loss.toLocaleString()} (
              {h.gain_loss_percent.toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>

      {/* Edit/Sell/Delete Menu Modal */}
      {showEditSellMenu && selectedHolding && (
        <Dialog open={showEditSellMenu} onClose={() => setShowEditSellMenu(false)}>
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs">
              <Dialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Actions for {selectedHolding.symbol}</Dialog.Title>
              <div className="space-y-4">
                <button
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  onClick={() => { setShowEditSellModal(true); setShowEditSellMenu(false); }}
                >
                  Sell Stock
                </button>
                <button
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={async () => { await handleRemoveStock(selectedHolding.symbol); setShowEditSellMenu(false); }}
                >
                  Delete Stock
                </button>
                <button
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  onClick={() => setShowEditSellMenu(false)}
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
      {/* Detail Modal for Scope Icon */}
      {showDetailModal && selectedDetailHolding && (
        <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg">
              <Dialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Details for {selectedDetailHolding.symbol}</Dialog.Title>
              <div className="space-y-2 text-gray-900 dark:text-white">
                <p><strong>Company:</strong> {selectedDetailHolding.company_name}</p>
                <p><strong>Shares:</strong> {selectedDetailHolding.shares}</p>
                <p><strong>Average Price:</strong> ${selectedDetailHolding.average_price.toFixed(2)}</p>
                <p><strong>Current Price:</strong> ${selectedDetailHolding.current_price.toFixed(2)}</p>
                <p><strong>Stop Loss:</strong> ${selectedDetailHolding.stop_loss_price?.toFixed(2) ?? '-'}</p>
                <p><strong>Add-up Point:</strong> {selectedDetailHolding.atr != null ? `$${(selectedDetailHolding.average_price + selectedDetailHolding.atr).toFixed(2)}` : '-'}</p>
                <p><strong>Entry Date:</strong> {Array.isArray(selectedDetailHolding.purchase_dates) && selectedDetailHolding.purchase_dates.length > 0 ? new Date(selectedDetailHolding.purchase_dates[0]).toLocaleDateString() : '-'}</p>
                {Array.isArray(selectedDetailHolding.purchase_dates) && selectedDetailHolding.purchase_dates.length > 1 && (
                  <p><strong>Add-up Dates:</strong> {selectedDetailHolding.purchase_dates.slice(1).map(d => new Date(d).toLocaleDateString()).join(', ')}</p>
                )}
                {/* Price Log */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Price Log</h4>
                  {Array.isArray(selectedDetailHolding.purchase_dates) && selectedDetailHolding.purchase_dates.length > 0 ? (
                    <ul className="text-sm space-y-1 text-gray-900 dark:text-white">
                      {selectedDetailHolding.purchase_dates.map((date, idx) => (
                        <li key={idx}>
                          {new Date(date).toLocaleDateString()} - ${selectedDetailHolding.average_price.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No price log available.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded">Close</button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Edit/Sell Modal */}
      <EditSellStockModal
        isOpen={showEditSellModal}
        onClose={() => setShowEditSellModal(false)}
        holding={selectedHolding}
        onSold={loadPerformance}
      />

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddStock={handleAddStock}
      />

      {/* Add Up Modal */}
      <AddUpModal
        isOpen={showAddUpModal}
        onClose={() => setShowAddUpModal(false)}
        holding={selectedAddUpHolding}
        onAddUp={() => { setShowAddUpModal(false); loadPerformance(); }}
      />

      {/* Trade History Chart */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow p-6 mt-8 border border-transparent dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Trade History</h3>
        {chartData.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No trades yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="dark:stroke-gray-600" />
              <XAxis dataKey="name" stroke="#9ca3af" className="dark:stroke-gray-400" fontSize={12} />
              <YAxis stroke="#9ca3af" className="dark:stroke-gray-400" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#f9fafb',
                }}
              />
              <Legend />
              <Bar
                dataKey="net"
                fill="#3b82f6"
                className="dark:fill-gray-500"
                radius={[4, 4, 0, 0]}
                name="Trade Net"
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Cumulative Net"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

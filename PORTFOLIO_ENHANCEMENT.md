# Portfolio Enhancement: Volatility-Based Position Sizing

## Overview

The portfolio page has been enhanced with a new multi-step stock addition process that includes volatility-based position sizing recommendations. This feature helps users make more informed investment decisions by considering market volatility and risk management principles.

## New Features

### Multi-Step Stock Addition Process

1. **Step 1: Basic Information**
   - Stock symbol input
   - Price per share input
   - Purchase date selection

2. **Step 2: Position Size Recommendation**
   - Volatility calculation using ATR (Average True Range)
   - Position size recommendation based on risk tolerance
   - Manual position size input with recommendation guidance

### Volatility-Based Position Sizing

The system calculates position sizes using the following methodology:

1. **ATR Calculation**: Uses a 14-day Average True Range to measure volatility
2. **Stop Loss Distance**: Set at 2 × ATR below the entry price
3. **Position Size Formula**: `Position Size = Risk Amount / Stop Loss Distance`
4. **Risk Management**: Ensures the total position value doesn't exceed available capital

### Key Components

- **ATR (Average True Range)**: Measures market volatility over a configurable window (default: 14 days)
- **Stop Loss Price**: Calculated as `Entry Price - (2 × ATR)`
- **Risk Amount**: Based on user's capital and risk tolerance percentage
- **Recommended Shares**: Calculated to match the user's risk tolerance while respecting capital limits

## Technical Implementation

### Backend

- **Endpoint**: `POST /api/portfolio/position-size`
- **Service**: `stock_service.calculate_position_size()`
- **Data Sources**: Yahoo Finance and Finnhub for historical price data

### Frontend

- **Component**: Enhanced `AddStockModal.js`
- **Features**: 
  - Step-by-step form navigation
  - Real-time position size calculation
  - Visual position size recommendations
  - Responsive design with improved UX

## User Experience

1. User clicks "Add Stock" button
2. Enters stock symbol, price, and date
3. Clicks "Next" to calculate position size
4. Reviews volatility-based recommendation
5. Adjusts position size if desired
6. Confirms and adds stock to portfolio

## Benefits

- **Risk Management**: Helps users avoid over-leveraging positions
- **Volatility Awareness**: Educates users about market volatility
- **Consistent Sizing**: Provides systematic approach to position sizing
- **Capital Protection**: Prevents excessive risk exposure

## Configuration

- **ATR Window**: Configurable (default: 14 days)
- **Stop Loss Multiplier**: 2× ATR (configurable)
- **Risk Tolerance**: User-defined percentage of capital
- **Capital Limits**: Maximum position size based on available capital 
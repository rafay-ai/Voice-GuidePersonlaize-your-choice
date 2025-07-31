// Enhanced Admin Dashboard Component
// File: src/components/admin/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import dataManager from '../shared/DataManager';
import './AdminComponents.css';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = () => {
    setIsLoading(true);
    
    // Simulate API delay for demo
    setTimeout(() => {
      const realTimeData = dataManager.calculateRealTimeAnalytics();
      setAnalytics(realTimeData);
      setLastUpdated(new Date().toLocaleTimeString());
      setIsLoading(false);
    }, 800);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const getGrowthIndicator = (current, previous) => {
    if (!previous) return { value: 0, trend: 'neutral' };
    
    const growth = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(growth)),
      trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
    };
  };

  if (isLoading || !analytics) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>📊 Analytics Dashboard</h1>
            <p>Loading real-time business insights...</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Fetching latest data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>📊 Analytics Dashboard</h1>
            <p>Real-time business insights</p>
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={loadDashboardData}>
              🔄 Refresh
            </button>
            <span className="last-updated">
              Last updated: {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <div className="metric-value">{formatCurrency(analytics.totalRevenue)}</div>
            <div className="metric-trend positive">
              +15.3% this month
            </div>
          </div>
        </div>

        <div className="metric-card orders">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h3>Total Orders</h3>
            <div className="metric-value">{analytics.totalOrders}</div>
            <div className="metric-trend positive">
              +12% this week
            </div>
          </div>
        </div>

        <div className="metric-card customers">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Active Customers</h3>
            <div className="metric-value">{analytics.activeCustomers}</div>
            <div className="metric-trend positive">
              +5 new today
            </div>
          </div>
        </div>

        <div className="metric-card avg-order">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Avg Order Value</h3>
            <div className="metric-value">{formatCurrency(analytics.avgOrderValue)}</div>
            <div className="metric-trend positive">
              +8% vs last month
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics Row */}
      <div className="analytics-row">
        {/* Popular Restaurants */}
        <div className="analytics-card popular-restaurants">
          <div className="card-header">
            <h3>👑 Popular Restaurants</h3>
            <span className="card-subtitle">Today's performance</span>
          </div>
          <div className="restaurants-list">
            {analytics.topRestaurants.slice(0, 5).map((restaurant, index) => (
              <div key={restaurant.restaurantId} className="restaurant-item">
                <div className="restaurant-rank">#{index + 1}</div>
                <div className="restaurant-info">
                  <div className="restaurant-name">{restaurant.name}</div>
                  <div className="restaurant-stats">
                    {restaurant.orders} orders • {formatCurrency(restaurant.revenue)}
                  </div>
                </div>
                <div className="restaurant-progress">
                  <div 
                    className="progress-bar" 
                    style={{
                      width: `${Math.min((restaurant.orders / Math.max(...analytics.topRestaurants.map(r => r.orders))) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="analytics-card order-status">
          <div className="card-header">
            <h3>📋 Order Status Distribution</h3>
            <span className="card-subtitle">Live order pipeline</span>
          </div>
          <div className="status-list">
            <div className="status-item">
              <div className="status-indicator delivered"></div>
              <span className="status-label">Delivered</span>
              <span className="status-count">{analytics.ordersByStatus.delivered}</span>
            </div>
            
            <div className="status-item">
              <div className="status-indicator on-way"></div>
              <span className="status-label">On the Way</span>
              <span className="status-count">{analytics.ordersByStatus.on_way}</span>
            </div>
            
            <div className="status-item">
              <div className="status-indicator preparing"></div>
              <span className="status-label">Preparing</span>
              <span className="status-count">{analytics.ordersByStatus.preparing}</span>
            </div>
            
            <div className="status-item">
              <div className="status-indicator confirmed"></div>
              <span className="status-label">Confirmed</span>
              <span className="status-count">{analytics.ordersByStatus.confirmed}</span>
            </div>

            {analytics.ordersByStatus.cancelled > 0 && (
              <div className="status-item">
                <div className="status-indicator cancelled"></div>
                <span className="status-label">Cancelled</span>
                <span className="status-count">{analytics.ordersByStatus.cancelled}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="analytics-card recent-activity">
        <div className="card-header">
          <h3>🕒 Recent Activity</h3>
          <span className="card-subtitle">Latest admin actions</span>
        </div>
        <div className="activity-list">
          {dataManager.getAdminActions().slice(0, 8).map((action, index) => (
            <div key={action.id} className="activity-item">
              <div className="activity-icon">
                {action.action.includes('order') ? '📦' : 
                 action.action.includes('restaurant') ? '🏪' : 
                 action.action.includes('review') ? '⭐' : '👤'}
              </div>
              <div className="activity-content">
                <div className="activity-text">
                  {action.action === 'order_updated' && 'Updated order status'}
                  {action.action === 'restaurant_updated' && 'Modified restaurant settings'}
                  {action.action === 'review_updated' && 'Moderated customer review'}
                  {action.action === 'user_updated' && 'Updated user profile'}
                </div>
                <div className="activity-time">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {dataManager.getAdminActions().length === 0 && (
            <div className="empty-state">
              <p>No recent admin actions</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn orders">
            <span className="action-icon">📋</span>
            <span className="action-text">Manage Orders</span>
          </button>
          
          <button className="action-btn restaurants">
            <span className="action-icon">🏪</span>
            <span className="action-text">Add Restaurant</span>
          </button>
          
          <button className="action-btn reviews">
            <span className="action-icon">⭐</span>
            <span className="action-text">Review Reports</span>
          </button>
          
          <button className="action-btn analytics">
            <span className="action-icon">📊</span>
            <span className="action-text">View Analytics</span>
          </button>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="analytics-card performance-insights">
        <div className="card-header">
          <h3>💡 Performance Insights</h3>
          <span className="card-subtitle">AI-powered recommendations</span>
        </div>
        <div className="insights-list">
          <div className="insight-item">
            <div className="insight-icon success">📈</div>
            <div className="insight-content">
              <div className="insight-title">Peak Hour Optimization</div>
              <div className="insight-description">
                Order volume is 40% higher between 7-9 PM. Consider surge pricing.
              </div>
            </div>
          </div>
          
          <div className="insight-item">
            <div className="insight-icon warning">⚠️</div>
            <div className="insight-content">
              <div className="insight-title">Delivery Time Alert</div>
              <div className="insight-description">
                Average delivery time increased by 8 minutes. Check rider availability.
              </div>
            </div>
          </div>
          
          <div className="insight-item">
            <div className="insight-icon info">💰</div>
            <div className="insight-content">
              <div className="insight-title">Revenue Opportunity</div>
              <div className="insight-description">
                Pakistani cuisine orders up 25%. Promote local restaurants.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
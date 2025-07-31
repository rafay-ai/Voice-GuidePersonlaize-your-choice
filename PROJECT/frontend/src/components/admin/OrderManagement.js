// Order Management Component
// File: src/components/admin/OrderManagement.js

import React, { useState, useEffect } from 'react';
import dataManager from '../shared/DataManager';
import './AdminComponents.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateRange: 'today'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const loadOrders = () => {
    setIsLoading(true);
    setTimeout(() => {
      const allOrders = dataManager.getOrders();
      const users = dataManager.getUsers();
      
      // Enrich orders with user data
      const enrichedOrders = allOrders.map(order => {
        const user = users.find(u => u.id === order.userId);
        return {
          ...order,
          userName: user ? user.name : 'Unknown User',
          userPhone: user ? user.phone : 'No phone'
        };
      });

      // Sort by newest first
      enrichedOrders.sort((a, b) => new Date(b.timestamps.ordered) - new Date(a.timestamps.ordered));
      
      setOrders(enrichedOrders);
      setIsLoading(false);
    }, 500);
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm) ||
        order.userName.toLowerCase().includes(searchTerm) ||
        order.restaurantName.toLowerCase().includes(searchTerm)
      );
    }

    // Date range filter
    if (filters.dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(order =>
        order.timestamps.ordered.split('T')[0] === today
      );
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order =>
        new Date(order.timestamps.ordered) >= weekAgo
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const updates = {
      status: newStatus,
      timestamps: {
        ...orders.find(o => o.id === orderId).timestamps,
        [newStatus.replace('_', '')]: new Date().toISOString()
      }
    };

    const updatedOrder = dataManager.updateOrder(orderId, updates);
    
    if (updatedOrder) {
      loadOrders(); // Refresh the list
      setSelectedOrder(prev => prev && prev.id === orderId ? updatedOrder : prev);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: '#f59e0b',
      preparing: '#3b82f6',
      on_way: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      confirmed: '✅',
      preparing: '👨‍🍳',
      on_way: '🚚',
      delivered: '📦',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const calculateOrderProgress = (order) => {
    const statuses = ['confirmed', 'preparing', 'on_way', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statuses.length) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="order-management">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-management">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>📋 Order Management</h2>
          <p>Monitor and manage all customer orders</p>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={loadOrders}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">All Orders</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="on_way">On the Way</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range:</label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Order ID, customer name, restaurant..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
        </div>
      </div>

      {/* Orders Summary */}
      <div className="orders-summary">
        <div className="summary-card">
          <div className="summary-number">{filteredOrders.length}</div>
          <div className="summary-label">Total Orders</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">
            {filteredOrders.filter(o => o.status === 'confirmed').length}
          </div>
          <div className="summary-label">Pending</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">
            {filteredOrders.filter(o => o.status === 'preparing').length}
          </div>
          <div className="summary-label">Preparing</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">
            {filteredOrders.filter(o => o.status === 'delivered').length}
          </div>
          <div className="summary-label">Delivered</div>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-container">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No orders found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-header">
                  <div className="order-id">#{order.id}</div>
                  <div
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusIcon(order.status)} {order.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="order-info">
                  <div className="customer-info">
                    <strong>{order.userName}</strong>
                    <span className="order-time">
                      {new Date(order.timestamps.ordered).toLocaleString()}
                    </span>
                  </div>

                  <div className="restaurant-info">
                    <span className="restaurant-name">🏪 {order.restaurantName}</span>
                  </div>

                  <div className="order-items">
                    {order.items.slice(0, 2).map(item => (
                      <div key={item.id} className="item-preview">
                        {item.quantity}x {item.name}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="items-more">
                        +{order.items.length - 2} more items
                      </div>
                    )}
                  </div>

                  <div className="order-total">
                    <strong>{formatCurrency(order.pricing.total)}</strong>
                  </div>
                </div>

                <div className="order-progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${calculateOrderProgress(order)}%` }}
                  ></div>
                </div>

                <div className="order-actions">
                  {order.status === 'confirmed' && (
                    <button
                      className="action-btn preparing"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, 'preparing');
                      }}
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      className="action-btn on-way"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, 'on_way');
                      }}
                    >
                      Out for Delivery
                    </button>
                  )}
                  {order.status === 'on_way' && (
                    <button
                      className="action-btn delivered"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, 'delivered');
                      }}
                    >
                      Mark Delivered
                    </button>
                  )}
                  <button
                    className="action-btn view-details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content order-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details - #{selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                ×
              </button>
            </div>

            <div className="order-details-content">
              {/* Customer Information */}
              <div className="details-section">
                <h4>👤 Customer Information</h4>
                <div className="details-grid">
                  <div><strong>Name:</strong> {selectedOrder.userName}</div>
                  <div><strong>Phone:</strong> {selectedOrder.userPhone}</div>
                  <div><strong>Address:</strong> {selectedOrder.delivery.address}</div>
                </div>
              </div>

              {/* Order Items */}
              <div className="details-section">
                <h4>🍽️ Order Items</h4>
                <div className="items-list">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="item-row">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">×{item.quantity}</span>
                      <span className="item-price">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="details-section">
                <h4>💰 Pricing</h4>
                <div className="pricing-breakdown">
                  <div className="price-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.pricing.subtotal)}</span>
                  </div>
                  <div className="price-row">
                    <span>Delivery Fee:</span>
                    <span>{formatCurrency(selectedOrder.pricing.deliveryFee)}</span>
                  </div>
                  {selectedOrder.pricing.surgeMultiplier > 1 && (
                    <div className="price-row surge">
                      <span>Surge ({selectedOrder.pricing.surgeMultiplier}x):</span>
                      <span>Applied</span>
                    </div>
                  )}
                  <div className="price-row">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedOrder.pricing.tax)}</span>
                  </div>
                  <div className="price-row total">
                    <span><strong>Total:</strong></span>
                    <span><strong>{formatCurrency(selectedOrder.pricing.total)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="details-section">
                <h4>⏰ Order Timeline</h4>
                <div className="timeline">
                  <div className="timeline-item completed">
                    <div className="timeline-icon">✅</div>
                    <div className="timeline-content">
                      <div className="timeline-title">Order Placed</div>
                      <div className="timeline-time">{formatTime(selectedOrder.timestamps.ordered)}</div>
                    </div>
                  </div>
                  
                  {selectedOrder.timestamps.confirmed && (
                    <div className="timeline-item completed">
                      <div className="timeline-icon">👨‍💼</div>
                      <div className="timeline-content">
                        <div className="timeline-title">Order Confirmed</div>
                        <div className="timeline-time">{formatTime(selectedOrder.timestamps.confirmed)}</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.timestamps.preparing && (
                    <div className="timeline-item completed">
                      <div className="timeline-icon">👨‍🍳</div>
                      <div className="timeline-content">
                        <div className="timeline-title">Started Preparing</div>
                        <div className="timeline-time">{formatTime(selectedOrder.timestamps.preparing)}</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.timestamps.on_way && (
                    <div className="timeline-item completed">
                      <div className="timeline-icon">🚚</div>
                      <div className="timeline-content">
                        <div className="timeline-title">Out for Delivery</div>
                        <div className="timeline-time">{formatTime(selectedOrder.timestamps.on_way)}</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.timestamps.delivered && (
                    <div className="timeline-item completed">
                      <div className="timeline-icon">📦</div>
                      <div className="timeline-content">
                        <div className="timeline-title">Delivered</div>
                        <div className="timeline-time">{formatTime(selectedOrder.timestamps.delivered)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="details-section">
                <h4>⚙️ Admin Actions</h4>
                <div className="admin-actions-grid">
                  {selectedOrder.status === 'confirmed' && (
                    <button
                      className="admin-action-btn preparing"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                    >
                      👨‍🍳 Start Preparing
                    </button>
                  )}
                  {selectedOrder.status === 'preparing' && (
                    <button
                      className="admin-action-btn on-way"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'on_way')}
                    >
                      🚚 Out for Delivery
                    </button>
                  )}
                  {selectedOrder.status === 'on_way' && (
                    <button
                      className="admin-action-btn delivered"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                    >
                      📦 Mark Delivered
                    </button>
                  )}
                  {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <button
                      className="admin-action-btn cancel"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    >
                      ❌ Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
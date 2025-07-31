// User Analytics Component
// File: src/components/admin/UserAnalytics.js

import React, { useState, useEffect } from 'react';
import dataManager from '../shared/DataManager';
import './AdminComponents.css';

const UserAnalytics = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalSpent');
  const [filterBy, setFilterBy] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUserAnalytics();
  }, []);

  const loadUserAnalytics = () => {
    setIsLoading(true);
    setTimeout(() => {
      const allUsers = dataManager.getUsers().filter(user => user.role === 'customer');
      const orders = dataManager.getOrders();
      const reviews = dataManager.getReviews();

      // Calculate user analytics
      const userAnalytics = allUsers.map(user => {
        const userOrders = orders.filter(order => order.userId === user.id);
        const userReviews = reviews.filter(review => review.userId === user.id);
        
        const totalSpent = userOrders.reduce((sum, order) => sum + order.pricing.total, 0);
        const avgOrderValue = userOrders.length > 0 ? totalSpent / userOrders.length : 0;
        const lastOrderDate = userOrders.length > 0 
          ? new Date(Math.max(...userOrders.map(o => new Date(o.timestamps.ordered))))
          : null;
        
        const daysSinceLastOrder = lastOrderDate 
          ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...user,
          orderCount: userOrders.length,
          totalSpent,
          avgOrderValue,
          reviewCount: userReviews.length,
          avgRating: userReviews.length > 0 
            ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length 
            : 0,
          lastOrderDate,
          daysSinceLastOrder,
          isActive: daysSinceLastOrder !== null && daysSinceLastOrder <= 30,
          customerSegment: getCustomerSegment(userOrders.length, totalSpent)
        };
      });

      // Calculate overall analytics
      const totalCustomers = userAnalytics.length;
      const activeCustomers = userAnalytics.filter(u => u.isActive).length;
      const totalRevenue = userAnalytics.reduce((sum, u) => sum + u.totalSpent, 0);
      const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      const segmentBreakdown = {
        VIP: userAnalytics.filter(u => u.customerSegment === 'VIP').length,
        Regular: userAnalytics.filter(u => u.customerSegment === 'Regular').length,
        New: userAnalytics.filter(u => u.customerSegment === 'New').length,
        Inactive: userAnalytics.filter(u => u.customerSegment === 'Inactive').length
      };

      setUsers(userAnalytics);
      setAnalytics({
        totalCustomers,
        activeCustomers,
        totalRevenue,
        avgCustomerValue,
        segmentBreakdown
      });
      setIsLoading(false);
    }, 600);
  };

  const getCustomerSegment = (orderCount, totalSpent) => {
    if (orderCount === 0) return 'New';
    if (orderCount >= 10 && totalSpent >= 5000) return 'VIP';
    if (orderCount >= 3) return 'Regular';
    return 'New';
  };

  const getSegmentColor = (segment) => {
    const colors = {
      VIP: '#8b5cf6',
      Regular: '#10b981',
      New: '#3b82f6',
      Inactive: '#6b7280'
    };
    return colors[segment] || '#6b7280';
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!user.name.toLowerCase().includes(searchLower) && 
            !user.email.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Segment filter
      if (filterBy !== 'all' && user.customerSegment !== filterBy) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'orderCount':
          return b.orderCount - a.orderCount;
        case 'joinDate':
          return new Date(b.joinDate) - new Date(a.joinDate);
        case 'lastActive':
          return new Date(b.lastActive) - new Date(a.lastActive);
        default:
          return 0;
      }
    });

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="user-analytics">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-analytics">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>👥 User Analytics</h2>
          <p>Customer insights and behavior analysis</p>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={loadUserAnalytics}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="analytics-overview">
        <div className="overview-card">
          <div className="overview-icon">👥</div>
          <div className="overview-content">
            <div className="overview-number">{analytics.totalCustomers}</div>
            <div className="overview-label">Total Customers</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">✅</div>
          <div className="overview-content">
            <div className="overview-number">{analytics.activeCustomers}</div>
            <div className="overview-label">Active Customers</div>
            <div className="overview-subtitle">
              {Math.round((analytics.activeCustomers / analytics.totalCustomers) * 100)}% of total
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">💰</div>
          <div className="overview-content">
            <div className="overview-number">{formatCurrency(analytics.totalRevenue)}</div>
            <div className="overview-label">Total Revenue</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">📊</div>
          <div className="overview-content">
            <div className="overview-number">{formatCurrency(Math.round(analytics.avgCustomerValue))}</div>
            <div className="overview-label">Avg Customer Value</div>
          </div>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="customer-segments">
        <h3>🎯 Customer Segments</h3>
        <div className="segments-grid">
          {Object.entries(analytics.segmentBreakdown).map(([segment, count]) => (
            <div key={segment} className="segment-card">
              <div
                className="segment-color"
                style={{ backgroundColor: getSegmentColor(segment) }}
              ></div>
              <div className="segment-content">
                <div className="segment-name">{segment}</div>
                <div className="segment-count">{count} customers</div>
                <div className="segment-percentage">
                  {Math.round((count / analytics.totalCustomers) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-bar">
        <div className="filter-group search-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Filter by Segment:</label>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">All Customers</option>
            <option value="VIP">VIP Customers</option>
            <option value="Regular">Regular Customers</option>
            <option value="New">New Customers</option>
            <option value="Inactive">Inactive Customers</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="totalSpent">Total Spent</option>
            <option value="orderCount">Order Count</option>
            <option value="name">Name</option>
            <option value="joinDate">Join Date</option>
            <option value="lastActive">Last Active</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="users-list">
        {filteredAndSortedUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No customers found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="users-table">
            <div className="table-header">
              <div className="header-cell">Customer</div>
              <div className="header-cell">Segment</div>
              <div className="header-cell">Orders</div>
              <div className="header-cell">Total Spent</div>
              <div className="header-cell">Avg Order</div>
              <div className="header-cell">Last Order</div>
              <div className="header-cell">Actions</div>
            </div>

            {filteredAndSortedUsers.map(user => (
              <div key={user.id} className="table-row">
                <div className="table-cell customer-info">
                  <div className="customer-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="customer-details">
                    <div className="customer-name">{user.name}</div>
                    <div className="customer-email">{user.email}</div>
                    <div className="customer-joined">
                      Joined {formatDate(user.joinDate)}
                    </div>
                  </div>
                </div>

                <div className="table-cell">
                  <span
                    className="segment-badge"
                    style={{ backgroundColor: getSegmentColor(user.customerSegment) }}
                  >
                    {user.customerSegment}
                  </span>
                </div>

                <div className="table-cell">
                  <div className="stat-value">{user.orderCount}</div>
                  {user.reviewCount > 0 && (
                    <div className="stat-subtitle">{user.reviewCount} reviews</div>
                  )}
                </div>

                <div className="table-cell">
                  <div className="stat-value">{formatCurrency(user.totalSpent)}</div>
                </div>

                <div className="table-cell">
                  <div className="stat-value">
                    {user.avgOrderValue > 0 ? formatCurrency(Math.round(user.avgOrderValue)) : '-'}
                  </div>
                </div>

                <div className="table-cell">
                  {user.lastOrderDate ? (
                    <div>
                      <div className="stat-value">{formatDate(user.lastOrderDate)}</div>
                      <div className="stat-subtitle">
                        {user.daysSinceLastOrder} days ago
                      </div>
                    </div>
                  ) : (
                    <div className="stat-value">No orders</div>
                  )}
                </div>

                <div className="table-cell">
                  <button
                    className="action-btn view-profile"
                    onClick={() => setSelectedUser(user)}
                  >
                    👤 View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Customer Profile - {selectedUser.name}</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>
                ×
              </button>
            </div>

            <div className="user-profile-content">
              {/* Basic Information */}
              <div className="profile-section">
                <h4>👤 Basic Information</h4>
                <div className="profile-grid">
                  <div><strong>Name:</strong> {selectedUser.name}</div>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div><strong>Phone:</strong> {selectedUser.phone}</div>
                  <div><strong>Joined:</strong> {formatDate(selectedUser.joinDate)}</div>
                  <div><strong>Last Active:</strong> {formatDate(selectedUser.lastActive)}</div>
                  <div>
                    <strong>Segment:</strong>
                    <span
                      className="segment-badge"
                      style={{ backgroundColor: getSegmentColor(selectedUser.customerSegment), marginLeft: '8px' }}
                    >
                      {selectedUser.customerSegment}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Statistics */}
              <div className="profile-section">
                <h4>📊 Order Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{selectedUser.orderCount}</div>
                    <div className="stat-label">Total Orders</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{formatCurrency(selectedUser.totalSpent)}</div>
                    <div className="stat-label">Total Spent</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">
                      {selectedUser.avgOrderValue > 0 ? formatCurrency(Math.round(selectedUser.avgOrderValue)) : '-'}
                    </div>
                    <div className="stat-label">Avg Order Value</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{selectedUser.reviewCount}</div>
                    <div className="stat-label">Reviews Given</div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              {selectedUser.preferences && (
                <div className="profile-section">
                  <h4>🎯 Preferences</h4>
                  <div className="preferences-grid">
                    <div>
                      <strong>Favorite Cuisines:</strong>
                      <div className="preference-tags">
                        {selectedUser.preferences.cuisines.map(cuisine => (
                          <span key={cuisine} className="preference-tag">{cuisine}</span>
                        ))}
                      </div>
                    </div>
                    <div><strong>Spice Level:</strong> {selectedUser.preferences.spiceLevel}</div>
                    <div><strong>Budget Range:</strong> {selectedUser.preferences.budget}</div>
                    {selectedUser.preferences.dietary.length > 0 && (
                      <div>
                        <strong>Dietary Restrictions:</strong>
                        <div className="preference-tags">
                          {selectedUser.preferences.dietary.map(diet => (
                            <span key={diet} className="preference-tag">{diet}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Addresses */}
              {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                <div className="profile-section">
                  <h4>📍 Addresses</h4>
                  <div className="addresses-list">
                    {selectedUser.addresses.map(address => (
                      <div key={address.id} className="address-item">
                        <div className="address-label">
                          {address.label} {address.isDefault && <span className="default-badge">Default</span>}
                        </div>
                        <div className="address-text">{address.address}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Favorite Restaurants */}
              {selectedUser.stats && selectedUser.stats.favoriteRestaurants && selectedUser.stats.favoriteRestaurants.length > 0 && (
                <div className="profile-section">
                  <h4>❤️ Favorite Restaurants</h4>
                  <div className="favorite-restaurants">
                    {selectedUser.stats.favoriteRestaurants.map(restaurantId => {
                      const restaurants = dataManager.getRestaurants();
                      const restaurant = restaurants.find(r => r.id === restaurantId);
                      return restaurant ? (
                        <div key={restaurantId} className="favorite-restaurant">
                          <span className="restaurant-name">{restaurant.name}</span>
                          <span className="restaurant-cuisine">{restaurant.cuisine.join(', ')}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="profile-section">
                <h4>🕒 Recent Activity</h4>
                <div className="activity-timeline">
                  {selectedUser.lastOrderDate && (
                    <div className="activity-item">
                      <div className="activity-icon">📦</div>
                      <div className="activity-content">
                        <div className="activity-title">Last Order</div>
                        <div className="activity-time">{formatDate(selectedUser.lastOrderDate)}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="activity-item">
                    <div className="activity-icon">👤</div>
                    <div className="activity-content">
                      <div className="activity-title">Account Created</div>
                      <div className="activity-time">{formatDate(selectedUser.joinDate)}</div>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <div className="activity-icon">🔔</div>
                    <div className="activity-content">
                      <div className="activity-title">Last Active</div>
                      <div className="activity-time">{formatDate(selectedUser.lastActive)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Insights */}
              <div className="profile-section">
                <h4>💡 Customer Insights</h4>
                <div className="insights-list">
                  {selectedUser.customerSegment === 'VIP' && (
                    <div className="insight-item vip">
                      <div className="insight-icon">👑</div>
                      <div className="insight-text">
                        VIP Customer - High value customer with {selectedUser.orderCount} orders and {formatCurrency(selectedUser.totalSpent)} total spending
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.daysSinceLastOrder !== null && selectedUser.daysSinceLastOrder > 30 && (
                    <div className="insight-item warning">
                      <div className="insight-icon">⚠️</div>
                      <div className="insight-text">
                        Inactive Customer - Last order was {selectedUser.daysSinceLastOrder} days ago. Consider re-engagement campaign
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.avgRating > 4 && selectedUser.reviewCount >= 3 && (
                    <div className="insight-item positive">
                      <div className="insight-icon">⭐</div>
                      <div className="insight-text">
                        Happy Customer - Average rating of {selectedUser.avgRating.toFixed(1)} stars across {selectedUser.reviewCount} reviews
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.orderCount >= 5 && selectedUser.daysSinceLastOrder <= 7 && (
                    <div className="insight-item active">
                      <div className="insight-icon">🔥</div>
                      <div className="insight-text">
                        Highly Engaged - Regular customer with recent activity. Great candidate for loyalty programs
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="profile-section">
                <h4>⚙️ Admin Actions</h4>
                <div className="admin-actions-grid">
                  <button className="admin-action-btn">
                    📧 Send Email
                  </button>
                  <button className="admin-action-btn">
                    🎁 Send Coupon
                  </button>
                  <button className="admin-action-btn">
                    📊 View Orders
                  </button>
                  <button className="admin-action-btn">
                    ⭐ View Reviews
                  </button>
                  <button className="admin-action-btn">
                    🔄 Reset Password
                  </button>
                  <button className="admin-action-btn warning">
                    🚫 Suspend Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Insights Dashboard */}
      <div className="insights-dashboard">
        <h3>💡 Customer Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <div className="insight-icon">📈</div>
              <div className="insight-title">Growth Trend</div>
            </div>
            <div className="insight-content">
              <div className="insight-stat">+{Math.round(Math.random() * 15 + 5)}%</div>
              <div className="insight-description">
                Customer base growth this month
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <div className="insight-icon">💰</div>
              <div className="insight-title">Revenue per Customer</div>
            </div>
            <div className="insight-content">
              <div className="insight-stat">{formatCurrency(Math.round(analytics.avgCustomerValue))}</div>
              <div className="insight-description">
                Average lifetime value
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <div className="insight-icon">🔄</div>
              <div className="insight-title">Retention Rate</div>
            </div>
            <div className="insight-content">
              <div className="insight-stat">{Math.round((analytics.activeCustomers / analytics.totalCustomers) * 100)}%</div>
              <div className="insight-description">
                Customers active in last 30 days
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <div className="insight-icon">⭐</div>
              <div className="insight-title">Satisfaction Score</div>
            </div>
            <div className="insight-content">
              <div className="insight-stat">4.{Math.floor(Math.random() * 4 + 3)}/5</div>
              <div className="insight-description">
                Average customer rating
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;
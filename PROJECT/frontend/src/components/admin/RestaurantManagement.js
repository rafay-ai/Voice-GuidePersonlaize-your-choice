// Restaurant Management Component
// File: src/components/admin/RestaurantManagement.js

import React, { useState, useEffect } from 'react';
import dataManager from '../shared/DataManager';
import './AdminComponents.css';

const RestaurantManagement = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    cuisine: [],
    location: '',
    operatingHours: '',
    priceRange: '',
    deliveryTime: '',
    status: 'active'
  });

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = () => {
    setIsLoading(true);
    setTimeout(() => {
      const restaurantData = dataManager.getRestaurants();
      setRestaurants(restaurantData);
      setIsLoading(false);
    }, 500);
  };

  const filteredAndSortedRestaurants = restaurants
    .filter(restaurant =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
      restaurant.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.ratings.average - a.ratings.average;
        case 'orders':
          return b.stats.totalOrders - a.stats.totalOrders;
        case 'revenue':
          return b.stats.totalRevenue - a.stats.totalRevenue;
        default:
          return 0;
      }
    });

  const updateRestaurantStatus = (restaurantId, newStatus) => {
    const updates = { status: newStatus };
    const updatedRestaurant = dataManager.updateRestaurant(restaurantId, updates);
    
    if (updatedRestaurant) {
      loadRestaurants();
    }
  };

  const toggleFeatured = (restaurantId, currentFeatured) => {
    const updates = {
      adminSettings: {
        ...restaurants.find(r => r.id === restaurantId).adminSettings,
        featured: !currentFeatured
      }
    };
    
    const updatedRestaurant = dataManager.updateRestaurant(restaurantId, updates);
    
    if (updatedRestaurant) {
      loadRestaurants();
    }
  };

  const handleAddRestaurant = (e) => {
    e.preventDefault();
    
    const restaurant = {
      id: `rest_${Date.now()}`,
      ...newRestaurant,
      cuisine: newRestaurant.cuisine.filter(c => c.trim() !== ''),
      ratings: {
        average: 0,
        totalReviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        avgDeliveryTime: 30,
        popularItems: []
      },
      adminSettings: {
        featured: false,
        priority: restaurants.length + 1,
        commissionRate: 0.15
      }
    };

    // In a real app, this would be an API call
    const updatedRestaurants = [...restaurants, restaurant];
    localStorage.setItem('enhanced_restaurants', JSON.stringify(updatedRestaurants));
    
    loadRestaurants();
    setShowAddForm(false);
    setNewRestaurant({
      name: '',
      cuisine: [],
      location: '',
      operatingHours: '',
      priceRange: '',
      deliveryTime: '',
      status: 'active'
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      inactive: '#f59e0b',
      suspended: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="restaurant-management">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-management">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🏪 Restaurant Management</h2>
          <p>Manage restaurant listings and settings</p>
        </div>
        <div className="header-right">
          <button
            className="add-restaurant-btn"
            onClick={() => setShowAddForm(true)}
          >
            + Add Restaurant
          </button>
          <button className="refresh-btn" onClick={loadRestaurants}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-bar">
        <div className="filter-group search-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Restaurant name, cuisine, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="orders">Total Orders</option>
            <option value="revenue">Revenue</option>
          </select>
        </div>
      </div>

      {/* Restaurant Stats */}
      <div className="restaurant-stats">
        <div className="stat-card">
          <div className="stat-number">{restaurants.length}</div>
          <div className="stat-label">Total Restaurants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {restaurants.filter(r => r.status === 'active').length}
          </div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {restaurants.filter(r => r.adminSettings.featured).length}
          </div>
          <div className="stat-label">Featured</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Math.round(restaurants.reduce((sum, r) => sum + r.ratings.average, 0) / restaurants.length * 10) / 10}
          </div>
          <div className="stat-label">Avg Rating</div>
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="restaurants-grid">
        {filteredAndSortedRestaurants.map(restaurant => (
          <div key={restaurant.id} className="restaurant-card">
            <div className="restaurant-header">
              <div className="restaurant-name">{restaurant.name}</div>
              <div className="restaurant-badges">
                {restaurant.adminSettings.featured && (
                  <span className="badge featured">⭐ Featured</span>
                )}
                <span
                  className="badge status"
                  style={{ backgroundColor: getStatusColor(restaurant.status) }}
                >
                  {restaurant.status}
                </span>
              </div>
            </div>

            <div className="restaurant-info">
              <div className="info-row">
                <span className="info-label">📍 Location:</span>
                <span className="info-value">{restaurant.location}</span>
              </div>
              <div className="info-row">
                <span className="info-label">🍽️ Cuisine:</span>
                <span className="info-value">{restaurant.cuisine.join(', ')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">⭐ Rating:</span>
                <span className="info-value">
                  {restaurant.ratings.average}/5 ({restaurant.ratings.totalReviews} reviews)
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">🕒 Hours:</span>
                <span className="info-value">{restaurant.operatingHours}</span>
              </div>
            </div>

            <div className="restaurant-stats-mini">
              <div className="mini-stat">
                <div className="mini-stat-number">{restaurant.stats.totalOrders}</div>
                <div className="mini-stat-label">Orders</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-number">{formatCurrency(restaurant.stats.totalRevenue)}</div>
                <div className="mini-stat-label">Revenue</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-number">{restaurant.stats.avgDeliveryTime}m</div>
                <div className="mini-stat-label">Avg Delivery</div>
              </div>
            </div>

            <div className="restaurant-actions">
              <button
                className={`action-btn ${restaurant.adminSettings.featured ? 'featured' : 'unfeatured'}`}
                onClick={() => toggleFeatured(restaurant.id, restaurant.adminSettings.featured)}
              >
                {restaurant.adminSettings.featured ? '⭐ Featured' : '☆ Feature'}
              </button>
              
              <button
                className="action-btn view-details"
                onClick={() => setSelectedRestaurant(restaurant)}
              >
                📊 Details
              </button>
              
              <div className="status-controls">
                <select
                  value={restaurant.status}
                  onChange={(e) => updateRestaurantStatus(restaurant.id, e.target.value)}
                  className="status-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Restaurant Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content add-restaurant-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Restaurant</h3>
              <button className="close-btn" onClick={() => setShowAddForm(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddRestaurant} className="add-restaurant-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Restaurant Name *</label>
                  <input
                    type="text"
                    value={newRestaurant.name}
                    onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={newRestaurant.location}
                    onChange={(e) => setNewRestaurant(prev => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Cuisine Types *</label>
                  <input
                    type="text"
                    placeholder="e.g., Pakistani, Fast Food, Chinese (comma separated)"
                    value={newRestaurant.cuisine.join(', ')}
                    onChange={(e) => setNewRestaurant(prev => ({ 
                      ...prev, 
                      cuisine: e.target.value.split(',').map(c => c.trim())
                    }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Operating Hours *</label>
                  <input
                    type="text"
                    placeholder="e.g., 11:00 AM - 11:00 PM"
                    value={newRestaurant.operatingHours}
                    onChange={(e) => setNewRestaurant(prev => ({ ...prev, operatingHours: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price Range *</label>
                  <input
                    type="text"
                    placeholder="e.g., Rs. 200-500"
                    value={newRestaurant.priceRange}
                    onChange={(e) => setNewRestaurant(prev => ({ ...prev, priceRange: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Time *</label>
                  <input
                    type="text"
                    placeholder="e.g., 25-35 min"
                    value={newRestaurant.deliveryTime}
                    onChange={(e) => setNewRestaurant(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant Details Modal */}
      {selectedRestaurant && (
        <div className="modal-overlay" onClick={() => setSelectedRestaurant(null)}>
          <div className="modal-content restaurant-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Restaurant Details - {selectedRestaurant.name}</h3>
              <button className="close-btn" onClick={() => setSelectedRestaurant(null)}>
                ×
              </button>
            </div>

            <div className="restaurant-details-content">
              {/* Basic Information */}
              <div className="details-section">
                <h4>🏪 Basic Information</h4>
                <div className="details-grid">
                  <div><strong>Name:</strong> {selectedRestaurant.name}</div>
                  <div><strong>Location:</strong> {selectedRestaurant.location}</div>
                  <div><strong>Cuisine:</strong> {selectedRestaurant.cuisine.join(', ')}</div>
                  <div><strong>Operating Hours:</strong> {selectedRestaurant.operatingHours}</div>
                  <div><strong>Price Range:</strong> {selectedRestaurant.priceRange}</div>
                  <div><strong>Delivery Time:</strong> {selectedRestaurant.deliveryTime}</div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="details-section">
                <h4>📊 Performance Metrics</h4>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-value">{selectedRestaurant.stats.totalOrders}</div>
                    <div className="metric-label">Total Orders</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{formatCurrency(selectedRestaurant.stats.totalRevenue)}</div>
                    <div className="metric-label">Total Revenue</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{selectedRestaurant.stats.avgDeliveryTime}m</div>
                    <div className="metric-label">Avg Delivery Time</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{selectedRestaurant.ratings.average}/5</div>
                    <div className="metric-label">Average Rating</div>
                  </div>
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="details-section">
                <h4>⭐ Rating Breakdown</h4>
                <div className="rating-breakdown">
                  {[5, 4, 3, 2, 1].map(star => (
                    <div key={star} className="rating-row">
                      <span className="rating-stars">{star} ⭐</span>
                      <div className="rating-bar">
                        <div
                          className="rating-fill"
                          style={{
                            width: `${selectedRestaurant.ratings.totalReviews > 0 
                              ? (selectedRestaurant.ratings.breakdown[star] / selectedRestaurant.ratings.totalReviews) * 100 
                              : 0}%`
                          }}
                        ></div>
                      </div>
                      <span className="rating-count">
                        {selectedRestaurant.ratings.breakdown[star]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Settings */}
              <div className="details-section">
                <h4>⚙️ Admin Settings</h4>
                <div className="admin-settings">
                  <div className="setting-item">
                    <label>Featured Restaurant:</label>
                    <button
                      className={`toggle-btn ${selectedRestaurant.adminSettings.featured ? 'active' : ''}`}
                      onClick={() => toggleFeatured(selectedRestaurant.id, selectedRestaurant.adminSettings.featured)}
                    >
                      {selectedRestaurant.adminSettings.featured ? 'Yes' : 'No'}
                    </button>
                  </div>
                  
                  <div className="setting-item">
                    <label>Status:</label>
                    <select
                      value={selectedRestaurant.status}
                      onChange={(e) => updateRestaurantStatus(selectedRestaurant.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <label>Priority:</label>
                    <span>{selectedRestaurant.adminSettings.priority}</span>
                  </div>
                  
                  <div className="setting-item">
                    <label>Commission Rate:</label>
                    <span>{(selectedRestaurant.adminSettings.commissionRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Popular Items */}
              {selectedRestaurant.stats.popularItems.length > 0 && (
                <div className="details-section">
                  <h4>🔥 Popular Items</h4>
                  <div className="popular-items">
                    {selectedRestaurant.stats.popularItems.map((item, index) => (
                      <div key={index} className="popular-item">
                        #{index + 1} {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="details-section">
                <h4>⚡ Quick Actions</h4>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn">
                    📧 Contact Restaurant
                  </button>
                  <button className="quick-action-btn">
                    📊 View Analytics
                  </button>
                  <button className="quick-action-btn">
                    💬 View Reviews
                  </button>
                  <button className="quick-action-btn">
                    🏷️ Manage Promotions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantManagement;
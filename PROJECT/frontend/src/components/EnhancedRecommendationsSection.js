// Enhanced Recommendations Component with proper Matrix Factorization integration
// Replace your existing EnhancedRecommendationsSection component with this

import React, { useState, useEffect } from 'react';
import recommendationService from '../services/RecommendationService';

const EnhancedRecommendationsSection = ({ 
  currentUser, 
  restaurants, 
  selectRestaurant, 
  toggleFavorite, 
  getUserData 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendationSource, setRecommendationSource] = useState('');
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Fetch recommendations when component mounts or user changes
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin) {
      fetchRecommendations();
    }
  }, [currentUser]);

  const fetchRecommendations = async (refresh = false) => {
    if (!currentUser || currentUser.isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching recommendations for user:', currentUser.id);
      
      const result = await recommendationService.getPersonalizedRecommendations(
        currentUser.id, 
        { 
          count: 6, 
          includeExplanation: true,
          refresh: refresh 
        }
      );

      if (result.success && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
        setRecommendationSource(result.source);
        console.log(`Loaded ${result.recommendations.length} recommendations from ${result.source}`);
      } else {
        console.warn('No recommendations available:', result.error);
        setRecommendations([]);
        setError(result.error || 'No recommendations available');
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations([]);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
    fetchRecommendations(true);
  };

  const handleRestaurantSelect = async (recommendation) => {
    // Track user interaction
    await recommendationService.trackUserInteraction(currentUser.id, {
      type: 'RESTAURANT_SELECTED',
      restaurantId: recommendation.id,
      rank: recommendation.rank,
      source: recommendation.source,
      matchPercentage: recommendation.matchPercentage
    });

    // Find or create restaurant object
    let restaurant = restaurants.find(r => r._id === recommendation.id);
    if (!restaurant) {
      restaurant = {
        _id: recommendation.id,
        name: recommendation.name,
        cuisine: recommendation.cuisine,
        rating: recommendation.rating,
        priceRange: recommendation.priceRange,
        deliveryTime: recommendation.deliveryTime,
        deliveryFee: recommendation.deliveryFee,
        minimumOrder: recommendation.minimumOrder
      };
    }

    selectRestaurant(restaurant);
  };

  const handleFavoriteToggle = async (restaurantId, e) => {
    e.stopPropagation();
    
    const userData = getUserData(currentUser.id);
    const isFavorited = userData.favorites.includes(restaurantId);
    
    // Track interaction
    await recommendationService.trackUserInteraction(currentUser.id, {
      type: isFavorited ? 'UNFAVORITE' : 'FAVORITE',
      restaurantId: restaurantId
    });

    toggleFavorite(restaurantId);
  };

  // Helper functions
  const getMatchScoreColor = (score) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getSourceBadge = (source) => {
    const badges = {
      neural: { label: 'AI Neural', color: '#9b59b6', icon: '🧠' },
      matrix: { label: 'CF Matrix', color: '#3498db', icon: '🔢' },
      content: { label: 'Content', color: '#e67e22', icon: '📊' }
    };
    return badges[source] || { label: 'Standard', color: '#95a5a6', icon: '⭐' };
  };

  const formatExplanation = (explanation) => {
    const iconMap = {
      'AI Top Pick': '🎯',
      'Perfect Match': '💯',
      'Highly rated': '⭐',
      'Popular choice': '🔥',
      'New restaurant': '✨',
      'Fast delivery': '⚡'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (explanation.includes(key)) {
        return `${icon} ${explanation}`;
      }
    }
    return explanation;
  };

  // Don't render for admin users or logged out users
  if (!currentUser || currentUser.isAdmin) {
    return null;
  }

  return (
    <div className="enhanced-recommendations-section">
      {loading ? (
        <>
          <div className="enhanced-rec-header">
            <h2>🤖 AI Crafting Your Perfect Menu</h2>
            <p>Analyzing your taste profile with {recommendationSource || 'advanced'} algorithms...</p>
            <div className="loading-stages">
              <div className="stage active">Analyzing preferences</div>
              <div className="stage active">Running collaborative filtering</div>
              <div className="stage">Ranking restaurants</div>
            </div>
          </div>
          <div className="loading-placeholder">
            <div className="loading-spinner"></div>
            <p>Matrix factorization in progress...</p>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        </>
      ) : error ? (
        <>
          <div className="enhanced-rec-header">
            <h2>Your Personalized Dashboard</h2>
            <p>Having trouble loading your recommendations</p>
          </div>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Recommendation System Unavailable</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button 
                className="retry-btn primary"
                onClick={handleRefresh}
              >
                Try Again
              </button>
              <button 
                className="browse-all-btn secondary"
                onClick={() => {
                  const regularSection = document.querySelector('.regular-restaurants');
                  if (regularSection) {
                    regularSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Browse All Restaurants
              </button>
            </div>
          </div>
        </>
      ) : recommendations.length === 0 ? (
        <>
          <div className="enhanced-rec-header">
            <h2>Your Personalized Dashboard</h2>
            <p>Discover restaurants tailored just for you</p>
          </div>
          <div className="no-recommendations-state">
            <div className="empty-state-animation">
              <div className="empty-state-icon">🍽️</div>
              <div className="sparkles">✨</div>
            </div>
            <h3>Building Your Taste Profile</h3>
            <p>Order from a few restaurants to unlock personalized AI recommendations!</p>
            <div className="empty-state-actions">
              <button 
                className="refresh-recommendations primary"
                onClick={handleRefresh}
              >
                Check for Recommendations
              </button>
              <button 
                className="browse-all-restaurants secondary"
                onClick={() => {
                  const regularSection = document.querySelector('.regular-restaurants');
                  if (regularSection) {
                    regularSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Explore All Restaurants
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="enhanced-rec-header">
            <h2>🎯 AI-Powered Recommendations</h2>
            <p>
              Powered by {getSourceBadge(recommendationSource).icon} {getSourceBadge(recommendationSource).label} 
              {recommendationSource === 'matrix' && ' - Matrix Factorization Collaborative Filtering'}
              {recommendationSource === 'neural' && ' - Neural Collaborative Filtering'}
            </p>
            <div className="recommendation-stats">
              <div className="stat">
                <span className="stat-number">{recommendations.length}</span>
                <span className="stat-label">Perfect Matches</span>
              </div>
              <div className="stat">
                <span className="stat-number">
                  {Math.round(recommendations.reduce((acc, rec) => acc + rec.matchPercentage, 0) / recommendations.length)}%
                </span>
                <span className="stat-label">Avg Match</span>
              </div>
              <div className="stat">
                <span className="stat-number">#{refreshCount + 1}</span>
                <span className="stat-label">Refresh</span>
              </div>
            </div>
            <div className="source-badge" style={{ backgroundColor: getSourceBadge(recommendationSource).color }}>
              {getSourceBadge(recommendationSource).label}
            </div>
          </div>
          
          <div className="enhanced-rec-grid">
            {recommendations.map((rec, index) => (
              <div 
                key={rec.id}
                className={`enhanced-rec-card ${index === 0 ? 'top-pick' : ''}`}
                onClick={() => handleRestaurantSelect(rec)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Rank Badge */}
                <div className="rec-rank">
                  #{rec.rank}
                  {index === 0 && <span className="crown">👑</span>}
                </div>
                
                {/* Source Badge */}
                <div 
                  className="rec-source-badge"
                  style={{ backgroundColor: getSourceBadge(rec.source).color }}
                >
                  {getSourceBadge(rec.source).icon}
                </div>
                
                {/* Favorite Heart */}
                <button 
                  className={`rec-favorite-heart ${getUserData(currentUser.id).favorites.includes(rec.id) ? 'active' : ''}`}
                  onClick={(e) => handleFavoriteToggle(rec.id, e)}
                >
                  {getUserData(currentUser.id).favorites.includes(rec.id) ? '❤️' : '🤍'}
                </button>

                {/* Restaurant Info */}
                <div className="rec-restaurant-info">
                  <h4>
                    {rec.name}
                    {index === 0 && <span className="top-pick-badge">AI Top Pick</span>}
                  </h4>
                  <p className="rec-cuisine">
                    {Array.isArray(rec.cuisine) ? rec.cuisine.join(', ') : rec.cuisine}
                  </p>
                </div>
                
                {/* Match Score */}
                <div className="rec-match-score">
                  <div className="match-percentage" style={{ color: getMatchScoreColor(rec.matchPercentage) }}>
                    {rec.matchPercentage}% Match
                  </div>
                  <div className="match-bar">
                    <div 
                      className="match-fill" 
                      style={{ 
                        width: `${rec.matchPercentage}%`,
                        background: `linear-gradient(90deg, ${getMatchScoreColor(rec.matchPercentage)}, ${getMatchScoreColor(rec.matchPercentage)}dd)`
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Explanations */}
                <div className="rec-explanations">
                  {rec.explanations.slice(0, 2).map((explanation, idx) => (
                    <span key={idx} className="explanation-tag">
                      {formatExplanation(explanation)}
                    </span>
                  ))}
                </div>
                
                {/* Restaurant Details */}
                <div className="rec-restaurant-details">
                  <span className="rec-rating">⭐ {rec.rating}</span>
                  <span className="rec-delivery">🚚 {rec.deliveryTime}</span>
                  <span className="rec-price-range">💰 {rec.priceRange}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="enhanced-rec-actions">
            <button 
              className="refresh-recommendations"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Updating...' : '🔄 Refresh AI Recommendations'}
            </button>
            <button 
              className="see-all-restaurants"
              onClick={() => {
                const regularSection = document.querySelector('.regular-restaurants');
                if (regularSection) {
                  regularSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              📋 Explore All Restaurants
            </button>
          </div>

          {/* Algorithm Insights Panel */}
          <div className="recommendation-insights">
            <h4>🔬 How We Made These Recommendations</h4>
            <div className="insights-grid">
              {recommendationSource === 'matrix' && (
                <div className="insight">
                  <span className="insight-icon">🔢</span>
                  <span>Matrix Factorization analyzed user-restaurant patterns</span>
                </div>
              )}
              {recommendationSource === 'neural' && (
                <div className="insight">
                  <span className="insight-icon">🧠</span>
                  <span>Neural networks learned complex preference patterns</span>
                </div>
              )}
              <div className="insight">
                <span className="insight-icon">👥</span>
                <span>Based on users with similar taste profiles</span>
              </div>
              <div className="insight">
                <span className="insight-icon">📊</span>
                <span>Your order history and ratings analyzed</span>
              </div>
              <div className="insight">
                <span className="insight-icon">⚡</span>
                <span>Real-time model updates as you order</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedRecommendationsSection;
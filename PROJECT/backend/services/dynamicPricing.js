// Step 1: Create this file: services/dynamicPricing.js

// Create a 'services' folder in your backend root directory
// Inside services folder, create dynamicPricing.js with this content:

class DynamicPricingEngine {
  constructor() {
    this.basePriceMultiplier = 1.0;
    this.maxSurgeMultiplier = 2.5;
    this.minPriceMultiplier = 0.8;
    
    // Time-based pricing weights
    this.timeWeights = {
      peakHours: [11, 12, 13, 18, 19, 20, 21], // 11AM-1PM, 6PM-9PM
      offPeakDiscount: 0.9,
      peakSurge: 1.3,
      lateNightSurge: 1.2 // 10PM-2AM
    };
    
    // Weather impact weights
    this.weatherWeights = {
      'rain': 1.4,
      'storm': 1.6,
      'snow': 1.8,
      'extreme_cold': 1.3,
      'extreme_heat': 1.2,
      'clear': 1.0
    };
  }

  // Main pricing calculation method
  async calculateDynamicPrice(restaurantId, baseDeliveryFee, location) {
    try {
      console.log('🧮 Calculating dynamic price for restaurant:', restaurantId);
      
      const [
        demandMultiplier,
        timeMultiplier,
        weatherMultiplier,
        restaurantCapacityMultiplier
      ] = await Promise.all([
        this.calculateDemandMultiplier(restaurantId, location),
        this.calculateTimeMultiplier(),
        this.calculateWeatherMultiplier(location),
        this.calculateRestaurantCapacityMultiplier(restaurantId)
      ]);

      console.log('📊 Pricing factors:', {
        demand: demandMultiplier,
        time: timeMultiplier,
        weather: weatherMultiplier,
        capacity: restaurantCapacityMultiplier
      });

      // Combine all multipliers with weights
      const combinedMultiplier = (
        demandMultiplier * 0.4 +
        timeMultiplier * 0.25 +
        weatherMultiplier * 0.2 +
        restaurantCapacityMultiplier * 0.15
      );

      // Apply bounds to prevent extreme pricing
      const finalMultiplier = Math.min(
        Math.max(combinedMultiplier, this.minPriceMultiplier),
        this.maxSurgeMultiplier
      );

      const dynamicPrice = baseDeliveryFee * finalMultiplier;

      const result = {
        originalPrice: baseDeliveryFee,
        dynamicPrice: Math.round(dynamicPrice * 100) / 100,
        multiplier: Math.round(finalMultiplier * 100) / 100,
        breakdown: {
          demand: Math.round(demandMultiplier * 100) / 100,
          time: Math.round(timeMultiplier * 100) / 100,
          weather: Math.round(weatherMultiplier * 100) / 100,
          capacity: Math.round(restaurantCapacityMultiplier * 100) / 100
        },
        surgeActive: finalMultiplier > 1.1,
        timestamp: new Date().toISOString()
      };

      console.log('💰 Final pricing result:', result);
      return result;

    } catch (error) {
      console.error('❌ Dynamic pricing calculation error:', error);
      return {
        originalPrice: baseDeliveryFee,
        dynamicPrice: baseDeliveryFee,
        multiplier: 1.0,
        error: 'Pricing calculation failed, using base price'
      };
    }
  }

  // Calculate demand-based multiplier (simulated for now)
  async calculateDemandMultiplier(restaurantId, location) {
    try {
      // Simulate realistic demand patterns
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      
      let baseCount = 10;
      
      // Higher demand during peak hours
      if (this.timeWeights.peakHours.includes(hour)) {
        baseCount += Math.random() * 15;
      }
      
      // Weekend boost
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseCount += Math.random() * 8;
      }
      
      // Random variation
      const recentOrderCount = baseCount + (Math.random() * 10);
      const activeDrivers = 8 + (Math.random() * 7); // 8-15 drivers
      
      // Calculate supply-demand ratio
      const demandSupplyRatio = recentOrderCount / Math.max(activeDrivers, 1);
      
      console.log('📈 Demand calculation:', {
        recentOrders: Math.round(recentOrderCount),
        activeDrivers: Math.round(activeDrivers),
        ratio: Math.round(demandSupplyRatio * 100) / 100
      });
      
      // Convert ratio to multiplier
      if (demandSupplyRatio > 3) return 1.8;
      if (demandSupplyRatio > 2) return 1.5;
      if (demandSupplyRatio > 1.5) return 1.3;
      if (demandSupplyRatio > 1) return 1.1;
      if (demandSupplyRatio < 0.5) return 0.9;
      
      return 1.0;
    } catch (error) {
      console.error('Demand calculation error:', error);
      return 1.0;
    }
  }

  // Calculate time-based multiplier
  calculateTimeMultiplier() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    let multiplier = 1.0;
    
    // Peak hours surge
    if (this.timeWeights.peakHours.includes(hour)) {
      multiplier = this.timeWeights.peakSurge;
    }
    
    // Late night surge (10PM - 2AM)
    if (hour >= 22 || hour <= 2) {
      multiplier = this.timeWeights.lateNightSurge;
    }
    
    // Off-peak discount (3AM - 10AM)
    if (hour >= 3 && hour <= 10) {
      multiplier = this.timeWeights.offPeakDiscount;
    }
    
    // Weekend adjustment
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= 1.1;
    }
    
    // Special Pakistani timings
    // Friday prayer time discount (12PM-2PM on Friday)
    if (dayOfWeek === 5 && hour >= 12 && hour <= 14) {
      multiplier *= 0.95;
    }
    
    console.log('⏰ Time multiplier:', { hour, dayOfWeek, multiplier });
    return multiplier;
  }

  // Calculate weather-based multiplier (mock for now)
  async calculateWeatherMultiplier(location) {
    try {
      // Mock weather conditions based on Karachi patterns
      const now = new Date();
      const month = now.getMonth(); // 0-11
      
      let weatherCondition = 'clear';
      
      // Monsoon season (July-September)
      if (month >= 6 && month <= 8) {
        weatherCondition = Math.random() > 0.7 ? 'rain' : 'clear';
      }
      
      // Summer heat (April-June)
      if (month >= 3 && month <= 5) {
        weatherCondition = Math.random() > 0.6 ? 'extreme_heat' : 'clear';
      }
      
      const multiplier = this.weatherWeights[weatherCondition] || 1.0;
      console.log('🌤️ Weather multiplier:', { condition: weatherCondition, multiplier });
      
      return multiplier;
    } catch (error) {
      console.error('Weather calculation error:', error);
      return 1.0;
    }
  }

  // Calculate restaurant capacity multiplier
  async calculateRestaurantCapacityMultiplier(restaurantId) {
    try {
      // Mock restaurant capacity data
      const maxCapacity = 20;
      const currentOrders = Math.floor(Math.random() * 25); // 0-24 current orders
      
      const capacityUtilization = currentOrders / maxCapacity;
      
      console.log('🏪 Restaurant capacity:', {
        current: currentOrders,
        max: maxCapacity,
        utilization: Math.round(capacityUtilization * 100) + '%'
      });
      
      if (capacityUtilization > 0.9) return 1.4; // Over capacity
      if (capacityUtilization > 0.8) return 1.2; // High capacity
      if (capacityUtilization > 0.7) return 1.1; // Medium-high capacity
      if (capacityUtilization < 0.3) return 0.95; // Low capacity discount
      
      return 1.0;
    } catch (error) {
      console.error('Restaurant capacity calculation error:', error);
      return 1.0;
    }
  }
}

module.exports = { DynamicPricingEngine };
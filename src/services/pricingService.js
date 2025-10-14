// Pricing service for API calls
const API_BASE_URL = '/api';

// Fetch all pricing for the authenticated hall owner
export const fetchPricing = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pricing`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to fetch pricing: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    const pricing = await response.json();
    return pricing;
  } catch (error) {
    console.error('Error fetching pricing:', error);
    throw error;
  }
};

// Get pricing for a specific resource
export const getPricingForResource = (pricingData, resourceId) => {
  if (!pricingData || !Array.isArray(pricingData)) return null;
  return pricingData.find(p => p.resourceId === resourceId);
};

// Calculate price based on pricing data, date, and duration
export const calculatePrice = (pricingData, bookingDate, startTime, endTime) => {
  if (!pricingData || !bookingDate || !startTime || !endTime) {
    return null;
  }

  try {
    // Calculate duration in hours
    const startTimeObj = new Date(`2000-01-01T${startTime}:00`);
    const endTimeObj = new Date(`2000-01-01T${endTime}:00`);
    const durationMs = endTimeObj.getTime() - startTimeObj.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 0) return null;

    // Determine if weekend
    const date = new Date(bookingDate);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Get the appropriate rate
    const rate = isWeekend ? pricingData.weekendRate : pricingData.weekdayRate;

    // Calculate price based on rate type
    let calculatedPrice = 0;
    if (pricingData.rateType === 'hourly') {
      calculatedPrice = rate * durationHours;
    } else {
      // For daily rates, assume minimum 4 hours for half day, 8+ hours for full day
      calculatedPrice = durationHours >= 8 ? rate : rate * 0.5;
    }

    return {
      calculatedPrice,
      durationHours,
      isWeekend,
      rate,
      rateType: pricingData.rateType,
      weekdayRate: pricingData.weekdayRate,
      weekendRate: pricingData.weekendRate
    };
  } catch (error) {
    console.error('Error calculating price:', error);
    return null;
  }
};


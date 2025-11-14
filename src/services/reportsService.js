const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth token
const getAuthToken = () => {  
  return localStorage.getItem('token');
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  console.log(`🔍 API Call: ${endpoint}`, {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    apiBaseUrl: API_BASE_URL
  });
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    console.log(`📡 Response for ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API Error for ${endpoint}:`, errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Success for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`💥 API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Helper to append optional hallOwnerId
const withHallOwner = (path, hallOwnerId) => {
  if (!hallOwnerId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}hallOwnerId=${encodeURIComponent(hallOwnerId)}`;
};

// Reports API service
export const reportsService = {
  // Get executive KPIs
  getExecutiveKPIs: async (period = '90d', hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/executive-kpis?period=${period}`, hallOwnerId));
  },

  // Get historical performance data
  getHistoricalData: async (months = 6, hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/historical-data?months=${months}`, hallOwnerId));
  },

  // Get pipeline data (upcoming bookings)
  getPipelineData: async (months = 6, hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/pipeline-data?months=${months}`, hallOwnerId));
  },

  // Get booking funnel data
  getFunnelData: async (period = '90d', hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/funnel-data?period=${period}`, hallOwnerId));
  },

  // Get payment analysis data
  getPaymentAnalysis: async (hallOwnerId) => {
    return apiCall(withHallOwner('/reports/payment-analysis', hallOwnerId));
  },

  // Get resource utilisation data
  getResourceUtilisation: async (hallOwnerId) => {
    return apiCall(withHallOwner('/reports/resource-utilisation', hallOwnerId));
  },

  // Get cancellation reasons analysis
  getCancellationReasons: async (period = '90d', hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/cancellation-reasons?period=${period}`, hallOwnerId));
  },

  // Get forecast data
  getForecastData: async (periods = 6, hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/forecast?periods=${periods}`, hallOwnerId));
  },

  // Get comprehensive summary
  getSummary: async (period = '90d', hallOwnerId) => {
    return apiCall(withHallOwner(`/reports/summary?period=${period}`, hallOwnerId));
  },

  // Get all reports data at once
  getAllReportsData: async (period = '90d', months = 6, hallOwnerId) => {
    try {
      const [
        executiveKPIs,
        historicalData,
        pipelineData,
        funnelData,
        paymentAnalysis,
        resourceUtilisation,
        cancellationReasons,
        forecastData,
        summary
      ] = await Promise.all([
        reportsService.getExecutiveKPIs(period, hallOwnerId),
        reportsService.getHistoricalData(months, hallOwnerId),
        reportsService.getPipelineData(months, hallOwnerId),
        reportsService.getFunnelData(period, hallOwnerId),
        reportsService.getPaymentAnalysis(hallOwnerId),
        reportsService.getResourceUtilisation(hallOwnerId),
        reportsService.getCancellationReasons(period, hallOwnerId),
        reportsService.getForecastData(6, hallOwnerId),
        reportsService.getSummary(period, hallOwnerId)
      ]);

      return {
        executiveKPIs,
        historicalData,
        pipelineData,
        funnelData,
        paymentAnalysis,
        resourceUtilisation,
        cancellationReasons,
        forecastData,
        summary
      };
    } catch (error) {
      console.error('Error fetching all reports data:', error);
      throw error;
    }
  }
};

export default reportsService;

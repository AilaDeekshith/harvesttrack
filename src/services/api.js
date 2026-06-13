import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearAuthData,
} from './authStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

let isRefreshing        = false;   // ← Prevent multiple refresh calls
let onTokenRefreshed    = null;    // ← Callback after refresh

console.log('🌐 API URL:', API_URL); 
// ─────────────────────────────────────────────
// CORE API CALL — Auto refresh on 401
// ─────────────────────────────────────────────
export const apiCall = async (
  endpoint,
  method   = 'GET',
  body     = null,
  onLogout = null    // ← callback to force logout
) => {

  const accessToken = await getAccessToken();

  const options = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  if (body) options.body = JSON.stringify(body);

  let response = await fetch(`${API_URL}${endpoint}`, options);

  console.log(`API Call: ${method} ${endpoint} - Status: ${response.status}`); // Debugging log

  // ── If 401 → Try to refresh token
  if (response.status === 401) {

    // ── Prevent multiple simultaneous refresh calls
    if (isRefreshing) {
      return new Promise((resolve) => {
        onTokenRefreshed = async (newToken) => {
          options.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(await fetch(`${API_URL}${endpoint}`, options));
        };
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      // ── Call refresh endpoint
      const refreshResponse = await fetch(
        `${API_URL}/api/auth/refresh`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
        }
      );

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.data.accessToken;

        // ── Save new access token
        await updateAccessToken(newAccessToken);

        // ── Notify any waiting requests
        if (onTokenRefreshed) {
          onTokenRefreshed(newAccessToken);
          onTokenRefreshed = null;
        }

        // ── Retry original request with new token
        options.headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, options);

      } else {
        // ── Refresh failed → Force logout
        await clearAuthData();
        if (onLogout) onLogout();
        throw new Error('Session expired. Please login again.');
      }

    } catch (error) {
      await clearAuthData();
      if (onLogout) onLogout();
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  return response;
};

// ─────────────────────────────────────────────
// AUTH APIs — No token needed
// ─────────────────────────────────────────────
export const loginApi = async (phone, password) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone, password }),
  });
  console.log('Login response status:', response.status); // Debugging log
  return response.json();
};

export const registerApi = async (name, phone, address, password) => {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, phone, address, password }),
  });
  return response.json();
};

export const logoutApi = async (accessToken) => {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  return response.json();
};

// ─────────────────────────────────────────────
// CUSTOMER APIs
// ─────────────────────────────────────────────
export const fetchCustomersApi = async (ownerId) => {
  const response = await apiCall(
    `/api/customers?ownerId=${ownerId}`, 'GET', null, null
  );
  return response.json();
};

export const addCustomerApi = async (ownerId, data, onLogout) => {
  const response = await apiCall(
    `/api/customers?ownerId=${ownerId}`, 'POST', data, onLogout
  );
  return response.json();
};

export const updateCustomerApi = async (id, ownerId, data, onLogout) => {
  const response = await apiCall(
    `/api/customers/${id}?ownerId=${ownerId}`, 'PUT', data, onLogout
  );
  return response.json();
};

export const deleteCustomerApi = async (id, ownerId, onLogout) => {
  const response = await apiCall(
    `/api/customers/${id}?ownerId=${ownerId}`, 'DELETE', null, onLogout
  );
  return response.json();
};

// ─────────────────────────────────────────────
// JOBS APIs
// ─────────────────────────────────────────────
export const fetchJobsApi = async (ownerId, onLogout) => {
  const response = await apiCall(
    `/api/jobs/owner/${ownerId}`, 'GET', null, onLogout
  );
  return response.json();
};

export const createJobApi = async (data, onLogout) => {
  const response = await apiCall(
    `/api/jobs`, 'POST', data, onLogout
  );
  return response.json();
};

export const updateJobApi = async (id, data) => {
  const response = await apiCall(
    `/api/jobs/${id}`, 'PUT', data, null
  );
  return response.json();
};

export const deleteJobApi = async (id) => {
  const response = await apiCall(
    `/api/jobs/${id}`, 'DELETE', null, onLogout
  );
  return response.json();
};

export const updatePaymentStatusApi = async (id, paymentStatus, onLogout) => {
  const res = await apiCall(
    `/api/jobs/${id}/payment`,
    'PATCH',
    { paymentStatus },
    onLogout
  );
  return res.json();
};

// ─────────────────────────────────────────────
// VEHICLE APIs
// ─────────────────────────────────────────────
export const fetchVehiclesApi = async (ownerId) => {
  const response = await apiCall(
    `/api/vehicles/owner/${ownerId}`, 'GET', null, null
  );
  return response.json();
};

export const addVehicleApi = async (data, onLogout) => {
  const response = await apiCall(
    `/api/vehicles`, 'POST', data, onLogout
  );
  return response.json();
};

export const updateVehicleApi = async (id, data, onLogout) => {
  const response = await apiCall(
    `/api/vehicles/${id}`, 'PUT', data, onLogout
  );
  return response.json();
};

export const deleteVehicleApi = async (id, onLogout) => {
  const response = await apiCall(
    `/api/vehicles/${id}`, 'DELETE', null, onLogout
  );
  return response.json();
};

// ─────────────────────────────────────────────
// ACTIVITY APIs
// ─────────────────────────────────────────────
export const fetchActivitiesApi = async () => {
  const response = await apiCall(
    `/api/activities`, 'GET', null, null
  );
  return response.json();
};

export const getDashboardStatsApi = async (ownerId) => {
  const response = await apiCall(
    `/api/dashboard?ownerId=${ownerId}`, 'GET', null, null
  );
  return response.json();
};

export const fetchRecentJobsApi = async (ownerId) => {
  const response = await apiCall(
    `/api/jobs/recent/jobs/${ownerId}`, 'GET', null, null
  );
  return response.json();
};

export const fetchCustomerApi = async (ownerId) => {
  const response = await apiCall(
    `/api/customers?ownerId=${ownerId}`, 'GET', null, null
  );
  return response.json();
}

export const dashboardReportApi = async (ownerId, from, to) => {
  const response = await apiCall(
    `/api/dashboard/report?ownerId=${ownerId}&from=${from}&to=${to}`, 'GET', null, null
  );
  return response.json();
};

export const dashBoardDailyEarningsApi = async (ownerId, from, to) => {
  const response = await apiCall(
    `/api/dashboard/dailyEarnings?ownerId=${ownerId}&from=${from}&to=${to}`, 'GET', null, null
  );
  return response.json();
};
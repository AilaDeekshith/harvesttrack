import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN:  'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  OWNER:         'owner',
};

// ── Save all auth data after login
export const saveAuthData = async (data) => {
  await AsyncStorage.multiSet([
    [KEYS.ACCESS_TOKEN,  data.accessToken],
    [KEYS.REFRESH_TOKEN, data.refreshToken],
    [KEYS.OWNER,         JSON.stringify({
      id:      data.ownerId,
      name:    data.name,
      phone:   data.phone,
      address: data.address,
    })],
  ]);
};

// ── Get access token
export const getAccessToken = async () => {
  return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
};

// ── Get refresh token
export const getRefreshToken = async () => {
  return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
};

// ── Get owner data
export const getOwner = async () => {
  console.log('Getting owner from AsyncStorage...'); // Debugging log

  const owner = await AsyncStorage.getItem(KEYS.OWNER);

  console.log('Owner data retrieved:', owner); // Debugging log
  return owner ?? null;
};

// ── Update access token after refresh
export const updateAccessToken = async (newAccessToken) => {
  await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, newAccessToken);
};

// ── Clear all auth data on logout
export const clearAuthData = async () => {
  await AsyncStorage.multiRemove([
    KEYS.ACCESS_TOKEN,
    KEYS.REFRESH_TOKEN,
    KEYS.OWNER,
  ]);
};

// ── Check if user is logged in
export const isLoggedIn = async () => {
  const token = await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  return token !== null;
};

export const isTokenExpiringSoon = async () => {
  const token = await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    return exp - now < 60; // Expiring in next 60 seconds
  } catch (e) {
    console.error('Error decoding token:', e);
    return false;
  }
};
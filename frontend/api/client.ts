import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import Constants from "expo-constants";

const getApiHost = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const hostIp = hostUri ? hostUri.split(":")[0] : "localhost";
  return `http://${hostIp}:3000`;
};

export const apiClient = axios.create({
  baseURL: getApiHost() + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept requests to inject the JWT token automatically
apiClient.interceptors.request.use((config) => {
  // get token from zustand safely
  const state = useAuthStore.getState();
  const token = state.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Only warn if we're hitting a game/admin route without a token
    if (config.url && (config.url.includes("/game/") || config.url.includes("/admin/")) && !config.url.includes("/metadata")) {
      console.warn(`Attempting to call authenticated route without token: ${config.url}`);
    }
  }
  return config;
});

// Intercept responses to handle auth failures globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the token is invalid (401) or character not found (404), 
    // automatically log the user out to bring them back to the login screen.
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.warn(`Auth Error (${error.response?.status}): Auto-logging out...`);
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

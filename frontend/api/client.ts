import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept requests to inject the JWT token automatically
apiClient.interceptors.request.use((config) => {
  // get token from zustand safely
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle auth failures globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the token is invalid (401) or the character was deleted on the server (404),
    // automatically log the user out to bring them back to the login screen.
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.warn("Auth Error Detected: Auto-logging out...");
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

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

import { z } from "zod";
import { apiClient } from "./client";

// --- Validations ---
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  characterName: z
    .string()
    .min(3, "Character name must be at least 3 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterData = z.infer<typeof RegisterSchema>;
export type LoginData = z.infer<typeof LoginSchema>;

// --- API Calls ---
export const authApi = {
  register: async (data: RegisterData) => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },
};

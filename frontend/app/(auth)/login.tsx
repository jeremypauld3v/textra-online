import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { authApi, LoginSchema } from "../../api/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      // 1. Zod Validation
      const validatedData = LoginSchema.parse({ email, password });
      
      setIsLoading(true);
      // 2. Axios Request
      const data = await authApi.login(validatedData);
      
      // 3. Success State
      login(data.token, data.characterId, data.userId);
      router.replace("/(tabs)/adventure");
    } catch (err: any) {
      if (err.name === "ZodError") {
        Alert.alert("Validation Error", err.errors[0].message);
      } else if (err.response?.data?.error) {
        Alert.alert("Login Failed", err.response.data.error);
      } else {
        Alert.alert("Error", "A network error occurred. Check if the server is running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="absolute top-[0px] left-[-50px] w-96 h-96 bg-slate-100/10 rounded-full blur-3xl opacity-30" />
          
          <View className="z-10 py-10">
            <Text className="text-5xl font-bold text-white text-center tracking-widest mb-2 font-pixel-bold text-shadow">
              TEXTRA
            </Text>
            <Text className="text-center text-slate-300 font-bold tracking-widest mb-12 uppercase text-[10px] font-sans">
              The Infinite Realm
            </Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wider ml-1 font-pixel-bold">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="wanderer@realm.com"
                  placeholderTextColor="#475569"
                  className="w-full bg-slate-900/80 text-slate-100 px-5 py-4 rounded-xl border border-slate-800 font-bold shadow-inner font-sans"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wider ml-1 font-pixel-bold">Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  className="w-full bg-slate-900/80 text-slate-100 px-5 py-4 rounded-xl border border-slate-800 font-bold shadow-inner font-sans"
                />
              </View>

              <TouchableOpacity 
                onPress={handleLogin}
                disabled={isLoading}
                className={`w-full bg-white py-4 rounded-xl mt-8 shadow-lg ${isLoading ? 'opacity-50' : ''}`}
              >
                <Text className="text-black text-center font-bold text-lg tracking-wide font-sans">
                  {isLoading ? 'Entering...' : 'Enter Realm'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="text-slate-500 font-sans">New traveler? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-white font-bold underline font-sans">Forge an account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

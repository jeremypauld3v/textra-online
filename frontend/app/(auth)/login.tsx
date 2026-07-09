import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { authApi, LoginSchema } from "../../api/auth";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const validatedData = LoginSchema.parse({ email, password });
      setIsLoading(true);
      const data = await authApi.login(validatedData);
      await login(data.token, data.characterId, data.userId);
      router.replace("/(tabs)/adventure");
    } catch (err: any) {
      if (err.name === "ZodError") {
        Alert.alert("Validation Error", err.errors[0].message);
      } else if (err.response?.data?.error === "ACCOUNT_BANNED") {
        Alert.alert("Account Banned", err.response.data.message || "Your account has been banned.");
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
          <Animated.View entering={FadeIn.duration(800)} className="absolute top-[0px] left-[-50px] w-96 h-96 bg-white/[0.01] rounded-full blur-3xl opacity-30" />
          
          <Animated.View entering={FadeInDown.delay(100).duration(300)} className="z-10 py-10">
            <Text className="text-4xl text-white text-center tracking-widest mb-1.5 font-pixel-bold text-shadow">
              SPRITEHERO
            </Text>
            <Text className="text-center text-white/40 tracking-widest mb-10 uppercase text-[8px] font-sans">
              The Infinite Realm
            </Text>

            <Animated.View entering={FadeInDown.delay(200).duration(300)} className="space-y-4">
              <View>
                <Text className="text-white/40 text-[9px] mb-1.5 uppercase tracking-wider ml-0.5 font-pixel-bold">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="wanderer@realm.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  className="w-full bg-white/[0.04] text-white px-5 py-4 rounded-xl border border-white/10 shadow-inner font-sans"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mt-4">
                <Text className="text-white/40 text-[9px] mb-1.5 uppercase tracking-wider ml-0.5 font-pixel-bold">Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry
                  className="w-full bg-white/[0.04] text-white px-5 py-4 rounded-xl border border-white/10 shadow-inner font-sans"
                />
              </View>

              <TouchableOpacity 
                onPress={handleLogin}
                disabled={isLoading}
                className={`w-full bg-white py-4 rounded-xl mt-8 active:opacity-90 ${isLoading ? 'opacity-50' : ''}`}
              >
                <Text className="text-black text-center text-base tracking-wide font-sans font-bold">
                  {isLoading ? 'Entering...' : 'Enter Realm'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(300)} className="flex-row justify-center mt-8">
              <Text className="text-white/30 font-sans text-xs">New traveler? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-white underline font-sans text-xs">Forge an account</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

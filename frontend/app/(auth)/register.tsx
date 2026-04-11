import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { authApi, RegisterSchema } from "../../api/auth";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charName, setCharName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const validatedData = RegisterSchema.parse({ email, password, characterName: charName });
      
      setIsLoading(true);
      await authApi.register(validatedData);
      
      Alert.alert("Hero Forged!", `Welcome to the realm, ${charName}. Please sign in to journey.`);
      router.replace("/(auth)/login");
    } catch (err: any) {
      if (err.name === "ZodError") {
        Alert.alert("Validation Error", err.errors[0].message);
      } else if (err.response?.data?.error) {
        Alert.alert("Registration Failed", err.response.data.error);
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
          <View className="absolute bottom-[-100px] right-[-50px] w-96 h-96 bg-slate-100/10 rounded-full blur-3xl opacity-30" />
          
          <View className="z-10 py-10">
            <Text className="text-4xl font-bold text-white mb-2 font-sans">
              Forge Legacy
            </Text>
            <Text className="text-slate-400 font-bold mb-10 text-[10px] font-sans">
              Create your hero and claim your destiny.
            </Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wider ml-1 font-sans">Email</Text>
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
                <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wider ml-1 font-sans">Character Name</Text>
                <TextInput
                  value={charName}
                  onChangeText={setCharName}
                  placeholder="E.g., Arthas"
                  placeholderTextColor="#475569"
                  className="w-full bg-slate-900/80 text-slate-100 px-5 py-4 rounded-xl border border-slate-800 font-bold shadow-inner font-sans"
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-wider ml-1 font-sans">Password</Text>
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
                onPress={handleRegister}
                disabled={isLoading}
                className={`w-full bg-white py-4 rounded-xl mt-8 shadow-lg ${isLoading ? 'opacity-50' : ''}`}
              >
                <Text className="text-black text-center font-bold text-lg tracking-wide font-sans">
                  {isLoading ? 'Forging...' : 'Create Hero'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="text-slate-500 font-sans">Already a legend? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-white font-bold underline font-sans">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

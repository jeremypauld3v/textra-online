import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";

export default function CharacterScreen() {
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-slate-950 justify-center items-center px-6">
      <Text className="text-3xl font-black text-white mb-2 font-serif">Character</Text>
      <Text className="text-slate-400 text-center mb-8">Your stats and progression will be displayed here.</Text>
      
      <TouchableOpacity onPress={handleLogout} className="bg-rose-500/10 px-8 py-3 rounded-xl border border-rose-500/30">
        <Text className="text-rose-500 font-bold uppercase tracking-widest text-sm">Logout / Abandon Realm</Text>
      </TouchableOpacity>
    </View>
  );
}

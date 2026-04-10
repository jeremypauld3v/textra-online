import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AdventureScreen() {
  return (
    <View className="flex-1 bg-slate-950 pt-16 px-6">
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-slate-400 font-semibold tracking-wider uppercase text-xs">Current Zone</Text>
          <Text className="text-3xl font-black text-white font-serif">Valoria City</Text>
        </View>
        <View className="bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-800">
          <Text className="text-emerald-400 font-bold text-xs uppercase">Safe Zone</Text>
        </View>
      </View>

      <Text className="text-slate-300 text-lg mb-8 leading-relaxed">
        The bustling capital of the realm. Merchants hawk their wares while travelers rest before venturing into the unknown.
      </Text>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="text-indigo-400 font-black tracking-widest uppercase mb-4 text-sm mt-4">Available Destinations</Text>
        
        {/* Placeholder Destination Card */}
        <TouchableOpacity className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 mb-4 shadow-lg shadow-black flex-row justify-between items-center">
          <View>
            <Text className="text-white font-bold text-xl mb-1">Whispering Woods</Text>
            <Text className="text-slate-400 text-sm">Distance: 1 Node (2 Min)</Text>
          </View>
          <View className="bg-indigo-600/20 p-3 rounded-full">
            <Ionicons name="footsteps-outline" size={24} color="#818cf8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity className="bg-slate-900/80 p-5 rounded-2xl border border-rose-900/50 mb-4 shadow-lg shadow-black flex-row justify-between items-center">
          <View>
            <Text className="text-rose-400 font-bold text-xl mb-1 flex-row items-center">
              Crimson Peaks <Ionicons name="skull" size={14} color="#f43f5e" />
            </Text>
            <Text className="text-slate-400 text-sm">Distance: 4 Nodes (15 Min)</Text>
          </View>
          <View className="bg-rose-900/20 p-3 rounded-full">
            <Ionicons name="footsteps-outline" size={24} color="#f43f5e" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

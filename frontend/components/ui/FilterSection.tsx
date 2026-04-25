import React from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FilterSectionProps {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedRarity?: string;
  setSelectedRarity?: (rarity: string) => void;
  showRarity?: boolean;
}

const CATEGORIES = [
  { label: "All Types", value: "ALL" },
  { label: "Gear", value: "EQUIPMENT" },
  { label: "Materials", value: "MATERIAL" },
  { label: "Potions", value: "CONSUMABLE" },
];

const RARITIES = [
  { label: "All Rarity", value: "ALL" },
  { label: "Common", value: "COMMON", color: "#64748b" },
  { label: "Uncommon", value: "UNCOMMON", color: "#10b981" },
  { label: "Rare", value: "RARE", color: "#f59e0b" },
  { label: "Epic", value: "EPIC", color: "#a855f7" },
  { label: "Legendary", value: "LEGENDARY", color: "#f97316" },
  { label: "Mythic", value: "MYTHIC", color: "#ef4444" },
];

export default function FilterSection({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedRarity = "ALL",
  setSelectedRarity,
  showRarity = true,
}: FilterSectionProps) {
  return (
    <View>
      {/* Search Bar */}
      <View className="bg-slate-950 border border-slate-800 rounded-2xl flex-row items-center px-4 py-2.5 mb-4">
        <Ionicons name="search" size={16} color="#475569" />
        <TextInput
          className="flex-1 ml-3 text-white text-xs"
          placeholder="Search by name..."
          placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 h-10">
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            onPress={() => setSelectedType(cat.value)}
            className={`mr-3 px-6 rounded-full justify-center border ${
              selectedType === cat.value ? "bg-indigo-600 border-indigo-400" : "bg-slate-900 border-slate-800"
            }`}
          >
            <Text
              className={`text-[10px] uppercase tracking-widest ${
                selectedType === cat.value ? "text-white" : "text-slate-500"
              }`}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rarity Filters */}
      {showRarity && setSelectedRarity && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row h-10">
          {RARITIES.map((rar) => (
            <TouchableOpacity
              key={rar.value}
              onPress={() => setSelectedRarity(rar.value)}
              className={`mr-3 px-6 rounded-full justify-center border ${
                selectedRarity === rar.value 
                  ? "bg-slate-800 border-slate-400" 
                  : "bg-slate-950 border-slate-900"
              }`}
              style={selectedRarity === rar.value && rar.color ? { borderColor: rar.color + "80", backgroundColor: rar.color + "20" } : {}}
            >
              <Text
                className={`text-[10px] uppercase tracking-widest ${
                  selectedRarity === rar.value ? "text-white" : "text-slate-700"
                }`}
                style={selectedRarity === rar.value && rar.color ? { color: rar.color } : {}}
              >
                {rar.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

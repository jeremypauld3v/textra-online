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
  { label: "Common", value: "COMMON" },
  { label: "Uncommon", value: "UNCOMMON" },
  { label: "Rare", value: "RARE" },
  { label: "Epic", value: "EPIC" },
  { label: "Legendary", value: "LEGENDARY" },
  { label: "Mythic", value: "MYTHIC" },
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
      <View className="bg-white/[0.04] border border-white/10 rounded-xl flex-row items-center px-4 py-2.5 mb-4">
        <Ionicons name="search" size={14} color="rgba(255,255,255,0.2)" />
        <TextInput
          className="flex-1 ml-3 text-white text-xs py-0.5"
          placeholder="Search by name..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 h-9">
        {CATEGORIES.map((cat) => {
          const isActive = selectedType === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setSelectedType(cat.value)}
              className={`mr-2.5 px-5 rounded-lg justify-center border ${
                isActive ? "bg-white border-white" : "bg-white/[0.04] border-white/5"
              }`}
            >
              <Text
                className={`text-[8px] font-pixel-bold uppercase tracking-widest ${
                  isActive ? "text-black" : "text-white/30"
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Rarity Filters */}
      {showRarity && setSelectedRarity && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row h-9">
          {RARITIES.map((rar) => {
            const isActive = selectedRarity === rar.value;
            return (
              <TouchableOpacity
                key={rar.value}
                onPress={() => setSelectedRarity(rar.value)}
                className={`mr-2.5 px-5 rounded-lg justify-center border ${
                  isActive 
                    ? "bg-white border-white" 
                    : "bg-white/[0.04] border-white/5"
                }`}
              >
                <Text
                  className={`text-[8px] font-pixel-bold uppercase tracking-widest ${
                    isActive ? "text-black" : "text-white/30"
                  }`}
                >
                  {rar.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

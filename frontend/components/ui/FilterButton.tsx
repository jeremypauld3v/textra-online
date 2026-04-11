import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BaseModal from "./BaseModal";
import FilterSection from "./FilterSection";
import StandardButton from "./StandardButton";

interface FilterButtonProps {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedRarity?: string;
  setSelectedRarity?: (rarity: string) => void;
  showRarity?: boolean;
}

export default function FilterButton(props: FilterButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const isActive = 
    props.searchQuery.length > 0 || 
    props.selectedType !== "ALL" || 
    (props.selectedRarity && props.selectedRarity !== "ALL");

  const clearFilters = () => {
    props.setSearchQuery("");
    props.setSelectedType("ALL");
    if (props.setSelectedRarity) props.setSelectedRarity("ALL");
  };

  const activeCount = [
    props.searchQuery.length > 0,
    props.selectedType !== "ALL",
    props.selectedRarity && props.selectedRarity !== "ALL"
  ].filter(Boolean).length;

  return (
    <View className="mb-6">
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          className={`flex-row items-center px-5 py-2.5 rounded-2xl border ${
            isActive ? "bg-indigo-600/10 border-indigo-500/50" : "bg-slate-900 border-slate-800"
          }`}
        >
          <Ionicons name="options-outline" size={18} color={isActive ? "#818cf8" : "#94a3b8"} />
          <Text className={`font-black uppercase text-[10px] tracking-widest ml-3 ${
            isActive ? "text-white" : "text-slate-500"
          }`}>
            Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </Text>
          {isActive && (
            <View className="ml-2 w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity 
            onPress={clearFilters}
            className="ml-4"
          >
            <Text className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <BaseModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Filter Listings"
        position="bottom"
      >
        <FilterSection {...props} />
        
        <View className="mt-6">
          <StandardButton 
            label="Apply Filters"
            variant="primary"
            onPress={() => setIsModalVisible(false)}
          />
        </View>
      </BaseModal>
    </View>
  );
}

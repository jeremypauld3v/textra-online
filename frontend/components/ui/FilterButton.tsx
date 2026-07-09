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
    <View className="mb-4">
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          className={`flex-row items-center px-4 py-2 rounded-xl border ${
            isActive ? "bg-white/10 border-white/30" : "bg-white/[0.04] border-white/10"
          }`}
        >
          <Ionicons name="options-outline" size={16} color={isActive ? "#ffffff" : "rgba(255, 255, 255, 0.4)"} />
          <Text className={`uppercase text-[8px] font-pixel-bold tracking-widest ml-2.5 ${
            isActive ? "text-white" : "text-white/30"
          }`}>
            Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </Text>
          {isActive && (
            <View className="ml-1.5 w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity 
            onPress={clearFilters}
            className="ml-3"
          >
            <Text className="text-white/40 text-[8px] font-pixel-bold uppercase tracking-widest">Clear</Text>
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

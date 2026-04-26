import { View, Text, ActivityIndicator, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, InventoryItem } from "../../api/game";
import { useGameStore } from "../../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

// UI Components
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";
import TabBar from "../../components/ui/TabBar";
import Card from "../../components/ui/Card";
import SearchBar from "../../components/ui/SearchBar";

const CATEGORIES = ["ALL", "EQUIPMENT", "CONSUMABLE", "MATERIAL"];

export default function CraftingScreen() {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const itemTemplates = useGameStore((s) => s.items);

  const fetchData = useCallback(async () => {
    try {
      const [rData, iData] = await Promise.all([
        gameApi.getRecipes(),
        gameApi.getInventory()
      ]);
      setRecipes(rData.recipes);
      setInventory(iData.inventory);
    } catch {
      Toast.show({ type: "error", text1: "Forge Cold" });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  const getOwnedQuantity = (itemCode: string) => {
    const item = inventory.find((i: InventoryItem) => i.itemCode === itemCode);
    return item ? item.quantity : 0;
  };

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (selectedType !== "ALL") {
      list = list.filter((r: any) => itemTemplates[r.resultItemCode]?.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r: any) => {
        const meta = itemTemplates[r.resultItemCode];
        return meta?.name.toLowerCase().includes(q) || r.resultItemCode.toLowerCase().includes(q);
      });
    }
    return list;
  }, [recipes, selectedType, itemTemplates, searchQuery]);

  const handleCraft = async (recipeId: string) => {
    Alert.alert(
      "Forge Confirmation",
      "Consume materials to forge this item?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Forge", 
          onPress: async () => {
            try {
              await gameApi.craft(recipeId);
              Toast.show({ type: "success", text1: "Item Forged!" });
              fetchData();
            } catch (e: any) {
              Alert.alert("Forge Error", e.response?.data?.error || "Insufficient Materials");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator color="#f472b6" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617]">
      <View 
        className="flex-1 px-6"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        
        <ScreenHeader 
          title="Forge" 
          subtitle="Ancient Artifice" 
          badge={`${recipes.length} Blueprints`}
        />

        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter blueprints..."
        />

        <TabBar 
          tabs={CATEGORIES} 
          activeTab={selectedType} 
          onTabChange={setSelectedType} 
          className="mb-8"
        />

        {/* 📜 RECIPE LIST */}
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: r, index }) => {
            const meta = itemTemplates[r.resultItemCode];
            const canCraft = r.ingredients.every((ing: any) => getOwnedQuantity(ing.itemCode) >= ing.quantity);
            return (
              <Card delay={index * 20} variant="flat" padding="default" className="mb-4">
                
                <View className="flex-row items-center mb-4">
                   <View className="w-12 h-12 bg-black/40 rounded-xl items-center justify-center border border-white/10 mr-4">
                      <Text className="text-2xl">{meta?.emoji || "⚒️"}</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-white text-base font-pixel-bold leading-tight mb-0.5">{meta?.name?.toUpperCase()}</Text>
                      <Text className="text-slate-600 text-[8px] font-pixel-bold uppercase tracking-[2px]">{meta?.type}</Text>
                   </View>
                   <StandardButton 
                     label={canCraft ? "FORGE" : "LOCKED"}
                     onPress={() => handleCraft(r.id)}
                     variant={canCraft ? "primary" : "secondary"}
                     disabled={!canCraft}
                     size="sm"
                   />
                </View>

                {/* 🎒 INGREDIENTS GRID */}
                <View className="bg-black/20 p-3 rounded-xl border border-white/5 flex-row flex-wrap">
                   {r.ingredients.map((ing: any, idx: number) => {
                     const ingMeta = itemTemplates[ing.itemCode];
                     const owned = getOwnedQuantity(ing.itemCode);
                     const hasEnough = owned >= ing.quantity;
                     return (
                       <View key={idx} className="flex-row items-center mr-6 mb-2">
                          <Text className="text-lg mr-2">{ingMeta?.emoji || "📦"}</Text>
                          <Text className={`text-[9px] font-pixel-bold ${hasEnough ? "text-slate-400" : "text-rose-500"}`}>
                             {owned} / {ing.quantity}
                          </Text>
                       </View>
                     );
                   })}
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 opacity-30">
               <Ionicons name="hammer-outline" size={64} color="#475569" />
               <Text className="text-slate-600 text-sm font-pixel-bold uppercase tracking-widest mt-6">Anvil is Cold</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

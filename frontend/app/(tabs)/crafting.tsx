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
      // Silently fail — retry on next focus
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
      <View className="flex-1 bg-void justify-center items-center">
        <ActivityIndicator color="#A78BFA" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <View 
        className="flex-1 px-6"
        style={{ paddingTop: Math.max(insets.top, 12) }}
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
          className="mb-4"
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
              <Card delay={index * 15} variant="flat" padding="default" className="mb-3">
                
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-mystic/10 rounded-xl items-center justify-center border border-mystic/20 mr-3">
                     <Text className="text-xl">{meta?.emoji || "⚒️"}</Text>
                  </View>
                  <View className="flex-1">
                     <Text className="text-frost text-sm font-pixel-bold leading-tight mb-0.5">{meta?.name?.toUpperCase()}</Text>
                     <Text className="text-frost-muted text-[8px] font-pixel-bold uppercase tracking-[1px]">{meta?.type}</Text>
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
                <View className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] flex-row flex-wrap">
                   {r.ingredients.map((ing: any, idx: number) => {
                     const ingMeta = itemTemplates[ing.itemCode];
                     const owned = getOwnedQuantity(ing.itemCode);
                     const hasEnough = owned >= ing.quantity;
                     return (
                       <View key={idx} className="flex-row items-center mr-4 mb-1">
                          <Text className="text-base mr-1.5">{ingMeta?.emoji || "📦"}</Text>
                          <Text className={`text-[8px] font-pixel-bold ${hasEnough ? "text-white/60" : "text-white/20"}`}>
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
            <View className="items-center justify-center py-20 opacity-20">
               <Ionicons name="hammer-outline" size={48} color="#ffffff" />
               <Text className="text-white/40 text-[9px] font-pixel-bold uppercase tracking-widest mt-4">Anvil is Cold</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

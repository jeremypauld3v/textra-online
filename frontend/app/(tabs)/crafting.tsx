import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi } from "../../api/game";
import { useGameStore } from "../../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

// UI Components
import FilterButton from "../../components/ui/FilterButton";
import ScreenHeader from "../../components/ui/ScreenHeader";

export default function CraftingScreen() {
  const itemTemplates = useGameStore((state) => state.items);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCrafting, setIsCrafting] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedRarity, setSelectedRarity] = useState("ALL");

  const fetchData = useCallback(async () => {
    try {
      const [recipeData, invData] = await Promise.all([
        gameApi.getRecipes(),
        gameApi.getInventory()
      ]);
      setRecipes(recipeData.recipes);
      setInventory(invData.inventory);
    } catch (e) {
      console.error("Failed to fetch crafting data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredRecipes = useMemo(() => {
    let list = recipes;

    if (searchQuery) {
      list = list.filter((r) => {
        const meta = itemTemplates[r.resultItemCode];
        return meta?.name?.toLowerCase()?.includes(searchQuery.toLowerCase());
      });
    }

    if (selectedType !== "ALL") {
      list = list.filter((r) => {
        const meta = itemTemplates[r.resultItemCode];
        return meta?.type === selectedType;
      });
    }

    if (selectedRarity !== "ALL") {
       list = list.filter((r) => {
          const meta = itemTemplates[r.resultItemCode];
          return meta?.rarityId === selectedRarity;
       });
    }

    return list;
  }, [recipes, searchQuery, selectedType, selectedRarity, itemTemplates]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const getOwnedQuantity = (itemCode: string) => {
    const item = inventory.find(i => i.itemCode === itemCode);
    return item ? item.quantity : 0;
  };

  const handleCraft = async (recipeId: string) => {
    try {
      setIsCrafting(true);
      const res = await gameApi.craft(recipeId);
      Toast.show({ type: "success", text1: "Forgery Complete!", text2: res.message });
      fetchData();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Forgery Failed", text2: e.response?.data?.error || "Missing materials" });
    } finally {
      setIsCrafting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 px-6 pt-10">
        {/* Header */}
        <ScreenHeader 
          title="The Forge"
          subtitle="Ancient Blueprints"
          rightElement={
             <View className="bg-slate-900 w-12 h-12 rounded-2xl border border-slate-800 items-center justify-center">
                <Ionicons name="hammer" size={20} color="#6366f1" />
             </View>
          }
        />

        <FilterButton 
           searchQuery={searchQuery}
           setSearchQuery={setSearchQuery}
           selectedType={selectedType}
           setSelectedType={setSelectedType}
           selectedRarity={selectedRarity}
           setSelectedRarity={setSelectedRarity}
        />

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text className="text-slate-600 font-bold uppercase text-[10px] tracking-widest mb-6 border-l-2 border-white pl-4 py-1 font-sans">Available Blueprints ({filteredRecipes.length})</Text>
          )}
          renderItem={({ item: recipe }) => {
            const resultMeta = itemTemplates[recipe.resultItemCode];
            const canCraft = recipe.ingredients.every((ing: any) => getOwnedQuantity(ing.itemCode) >= ing.quantity);

            return (
              <View className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 mb-2 flex-row items-center">
                {/* Result Icon */}
                <View className="w-10 h-10 bg-slate-950 rounded-xl items-center justify-center border border-slate-800 mr-4">
                   <Text className="text-xl">{resultMeta?.emoji || "📦"}</Text>
                </View>

                {/* Details Column */}
                <View className="flex-1">
                   <Text className="text-white font-bold text-xs italic uppercase tracking-tight leading-tight font-sans" numberOfLines={1}>{resultMeta?.name}</Text>
                   
                   {/* Mini Ingredients Row */}
                   <View className="flex-row flex-wrap mt-1.5">
                     {recipe.ingredients.map((ing: any) => {
                       const ingMeta = itemTemplates[ing.itemCode];
                       const owned = getOwnedQuantity(ing.itemCode);
                       const hasEnough = owned >= ing.quantity;
                       
                       return (
                         <View key={ing.id} className="mr-2 flex-row items-center">
                           <Text className="mr-1 text-[8px]">{ingMeta?.emoji || "📦"}</Text>
                           <Text className={`font-black text-[8px] ${hasEnough ? 'text-slate-400' : 'text-slate-600'}`}>
                             {owned}/{ing.quantity}
                           </Text>
                         </View>
                       );
                     })}
                   </View>
                </View>

                {/* Compact Craft Button */}
                <TouchableOpacity 
                   onPress={() => handleCraft(recipe.id)}
                   disabled={!canCraft || isCrafting}
                   className={`px-4 py-2 rounded-xl border ${
                     canCraft ? 'bg-white border-white' : 'bg-slate-800 border-slate-700 opacity-40'
                   }`}
                >
                   {isCrafting ? (
                     <ActivityIndicator size="small" color="#000000" />
                   ) : (
                     <Text className={`font-black text-[8px] uppercase tracking-widest ${canCraft ? 'text-black' : 'text-slate-500'}`}>
                       {canCraft ? "Forge" : "Locked"}
                     </Text>
                   )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
               <Ionicons name="construct-outline" size={64} color="#1e293b" />
               <Text className="text-slate-600 mt-4 font-bold italic font-sans">No recipes discovered yet...</Text>
            </View>
          }
          ListFooterComponent={<View className="h-20" />}
        />
      </View>
    </SafeAreaView>
  );
}

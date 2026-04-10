import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi } from "../../api/game";
import { useGameStore } from "../../store/useGameStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

export default function CraftingScreen() {
  const itemTemplates = useGameStore((state) => state.items);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCrafting, setIsCrafting] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

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
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-1">Ancient Blueprints</Text>
            <Text className="text-4xl font-black text-white italic uppercase tracking-tighter">The Forge</Text>
          </View>
          <View className="bg-slate-900 w-12 h-12 rounded-2xl border border-slate-800 items-center justify-center">
             <Ionicons name="hammer" size={20} color="#6366f1" />
          </View>
        </View>

        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text className="text-slate-600 font-bold uppercase text-[10px] tracking-widest mb-6 border-l-2 border-indigo-600 pl-4 py-1">Available Blueprints</Text>
          )}
          renderItem={({ item: recipe }) => {
            const resultMeta = itemTemplates[recipe.resultItemCode];
            const canCraft = recipe.ingredients.every((ing: any) => getOwnedQuantity(ing.itemCode) >= ing.quantity);

            return (
              <View className="bg-slate-900 border border-slate-800 rounded-[40px] p-6 mb-6 shadow-2xl">
                {/* Result Title */}
                <View className="flex-row items-center mb-6">
                  <View className="w-16 h-16 bg-slate-950 rounded-2xl items-center justify-center border border-slate-800 shadow-inner">
                     <Text className="text-3xl">{resultMeta?.emoji || "📦"}</Text>
                  </View>
                  <View className="ml-5 flex-1">
                     <Text className="text-white font-black text-xl italic uppercase tracking-tighter">{resultMeta?.name}</Text>
                     <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{resultMeta?.rarity} {resultMeta?.type}</Text>
                  </View>
                </View>

                {/* Ingredients List */}
                <View className="mb-8">
                  <Text className="text-slate-600 font-black uppercase text-[8px] tracking-widest mb-4">Required Materials</Text>
                  <View className="flex-row flex-wrap">
                    {recipe.ingredients.map((ing: any) => {
                      const ingMeta = itemTemplates[ing.itemCode];
                      const owned = getOwnedQuantity(ing.itemCode);
                      const hasEnough = owned >= ing.quantity;
                      
                      return (
                        <View key={ing.id} className="mr-3 mb-3 bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl flex-row items-center">
                          <Text className="mr-2 text-xs">{ingMeta?.emoji || "📦"}</Text>
                          <Text className={`font-black text-[10px] ${hasEnough ? 'text-slate-300' : 'text-slate-600'}`}>
                            {owned}/{ing.quantity}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Craft Button */}
                <TouchableOpacity 
                   onPress={() => handleCraft(recipe.id)}
                   disabled={!canCraft || isCrafting}
                   className={`p-5 rounded-3xl items-center shadow-lg ${canCraft ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-slate-800'}`}
                >
                  <Text className={`font-black uppercase tracking-widest ${canCraft ? 'text-white' : 'text-slate-600'}`}>
                    {isCrafting ? "Forging..." : canCraft ? "Forge Item" : "Missing Materials"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
               <Ionicons name="construct-outline" size={64} color="#1e293b" />
               <Text className="text-slate-600 mt-4 font-bold italic">No recipes discovered yet...</Text>
            </View>
          }
          ListFooterComponent={<View className="h-20" />}
        />
      </View>
    </SafeAreaView>
  );
}

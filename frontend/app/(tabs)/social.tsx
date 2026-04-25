import { View, Text, TextInput, Pressable, FlatList, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { useState, useEffect, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { gameApi } from "../../api/game";
import BaseModal from "../../components/ui/BaseModal";
import StandardButton from "../../components/ui/StandardButton";
import Toast from "react-native-toast-message";

type ChatTab = "global" | "trade" | "whispers";

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<ChatTab>("global");
  const [input, setInput] = useState("");
  const [isFriendListVisible, setIsFriendListVisible] = useState(false);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const { socket, connected, requestTrade } = useSocket();
  const characterId = useAuthStore(s => s.characterId);
  const flatListRef = useRef<FlatList>(null);

  // Friends State
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [friendNameInput, setFriendNameInput] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string, name: string, userId?: string } | null>(null);
  const [whisperTarget, setWhisperTarget] = useState<{ id: string, name: string } | null>(null);
  const [whisperPartners, setWhisperPartners] = useState<any[]>([]);

  useEffect(() => {
    // Initial history fetch
    const fetchHistory = async () => {
       try {
          let messages = [];
          if (activeTab === "global") {
             const data = await gameApi.getWorldChatHistory();
             messages = data.messages;
          } else if (activeTab === "trade") {
             const data = await gameApi.getTradeChatHistory();
             messages = data.messages;
          }
          setChatLogs(messages);
       } catch (e) {
          console.error("Failed to fetch chat history", e);
       }
    };
    fetchHistory();
  }, [activeTab]);

  const fetchWhisperPartners = async () => {
    try {
       const data = await gameApi.getRecentWhisperPartners();
       setWhisperPartners(data.partners);
    } catch (e) {
       console.error("Failed to load whisper partners", e);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleMessage = (msg: any) => {
        setChatLogs(prev => [...prev, msg]);
        
        // If it's a whisper and we are in the whispers tab, refresh partners list
        if (msg.channel === "whispers") {
           fetchWhisperPartners();
        }

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      };
      socket.on("chat_message", handleMessage);
      return () => { socket.off("chat_message", handleMessage); };
    }
  }, [socket]);

  useEffect(() => {
    if (activeTab === "whispers") {
      if (whisperTarget) {
         const fetchPrivateHistory = async () => {
            try {
               const data = await gameApi.getPrivateChatHistory(whisperTarget.id);
               setChatLogs(prev => {
                  const otherLogs = prev.filter(l => l.channel !== "whispers");
                  return [...otherLogs, ...data.messages];
               });
               setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            } catch (e) {
               console.error("Failed to fetch private chat", e);
            }
         };
         fetchPrivateHistory();
      } else {
         fetchWhisperPartners();
      }
    }
  }, [activeTab, whisperTarget]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
       const data = await gameApi.getFriends();
       setFriends(data.friends);
       setPending(data.pending);
    } catch (e) {
       console.error("Failed to load friends", e);
    } finally {
       setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (isFriendListVisible) loadFriends();
  }, [isFriendListVisible]);

  const submitChat = () => {
    if (!input.trim() || !socket) return;
    
    const payload: any = { 
      channel: activeTab === "whispers" ? "global" : activeTab, 
      message: input.trim() 
    };

    // If we are in whispers and have a target selected
    if (activeTab === "whispers" && whisperTarget) {
      payload.channel = "whispers";
      payload.targetUserId = whisperTarget.id;
    }

    socket.emit("chat_message", payload);
    setInput("");
  };

  const handleAddFriend = async () => {
    if (!friendNameInput.trim()) return;
    try {
       const res = await gameApi.addFriend(friendNameInput.trim());
       Toast.show({ type: 'success', text1: 'Nexus Link Requested', text2: res.message });
       setFriendNameInput("");
       loadFriends();
    } catch (e: any) {
       Toast.show({ type: 'error', text1: 'Link Failed', text2: e.response?.data?.error || "User not found" });
    }
  };

  const handleAcceptFriend = async (id: string) => {
    try {
       await gameApi.acceptFriend(id);
       Toast.show({ type: 'success', text1: 'Link Established' });
       loadFriends();
    } catch (e) {
       console.error("Failed to accept friend", e);
    }
  };

  const handleRemoveFriend = async (id: string) => {
    try {
       await gameApi.removeFriend(id);
       Toast.show({ type: 'info', text1: 'Link Severed' });
       loadFriends();
       setSelectedPlayer(null);
    } catch (e) {
       console.error("Failed to remove friend", e);
    }
  };

  const openPlayerOptions = (player: { id: string, name: string, userId?: string }) => {
    if (player.id === characterId) return;
    setSelectedPlayer(player);
  };

  const filteredLogs = useMemo(() => {
    return chatLogs.filter(l => {
      if (activeTab === "global") return l.channel === "global" || !l.channel;
      if (activeTab === "trade") return l.channel === "trade";
      if (activeTab === "whispers") {
        if (!whisperTarget) return false;
        // Show message if I am the sender AND it was sent to current target
        // OR if current target is the sender
        const isFromMe = l.senderId === characterId;
        if (isFromMe) return l.channel === "whispers" && (l.targetId === whisperTarget.id || l.recipientId === whisperTarget.id);
        return l.channel === "whispers" && l.senderId === whisperTarget.id;
      }
      return false;
    });
  }, [chatLogs, activeTab, whisperTarget, characterId]);

  const renderWhisperPartners = () => {
    return (
      <FlatList
        data={whisperPartners}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable 
            onPress={() => setWhisperTarget({ id: item.id, name: item.name })}
            className="flex-row items-center bg-slate-900/50 border border-white/5 p-4 rounded-2xl mb-3"
          >
             <View className="w-10 h-10 bg-indigo-500/20 rounded-full items-center justify-center mr-4">
                <Ionicons name="person" size={20} color="#818cf8" />
             </View>
             <View className="flex-1">
                <Text className="text-white text-sm font-pixel-bold">{item.name}</Text>
                <Text className="text-slate-600 text-[10px] font-pixel-bold uppercase">Level {item.level}</Text>
             </View>
             <Ionicons name="chevron-forward" size={16} color="#475569" />
          </Pressable>
        )}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20 opacity-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#475569" />
            <Text className="text-slate-500 text-[10px] font-pixel-bold uppercase mt-4">No active conversations</Text>
          </View>
        )}
      />
    );
  };

  const renderLogs = () => {
    return (
      <FlatList
        ref={flatListRef}
        data={filteredLogs}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: l }) => (
          <Pressable onPress={() => openPlayerOptions({ id: l.senderId, name: l.senderName, userId: l.senderUserId })} className="mb-4">
             <View className="flex-row items-center mb-1">
                <Text className={`text-[10px] font-pixel-bold uppercase mr-2 ${l.senderId === characterId ? "text-amber-400" : "text-indigo-400"}`}>
                   {l.senderName}
                </Text>
                <Text className="text-slate-700 text-[8px] font-pixel-bold">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
             </View>
             <Text className="text-slate-300 text-xs font-sans leading-relaxed">{l.message}</Text>
          </Pressable>
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-[#020617]">
      <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(129, 140, 248, 0.05)' }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="flex-1 pt-20 px-8">
          <View className="flex-row justify-between items-end mb-10">
             <View>
                <Text className="text-white text-xl font-pixel-bold tracking-tighter">COMMUNAL</Text>
                <View className="flex-row items-center mt-1">
                   <View className={`w-1.5 h-1.5 rounded-full mr-2 ${connected ? "bg-emerald-500" : "bg-rose-500"}`} />
                   <Text className="text-slate-600 text-[10px] font-pixel-bold uppercase tracking-[4px]">{connected ? "Nexus Active" : "Nexus Severed"}</Text>
                </View>
             </View>
             <Pressable onPress={() => setIsFriendListVisible(true)} className="w-12 h-12 bg-slate-900 rounded-2xl items-center justify-center border border-white/10">
                <Ionicons name="people" size={20} color="#fbbf24" />
                {pending.length > 0 && <View className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full items-center justify-center border-2 border-[#020617]"><Text className="text-[8px] text-white font-pixel-bold">{pending.length}</Text></View>}
             </Pressable>
          </View>

          <View className="flex-row space-x-3 mb-10">
             {(["global", "trade", "whispers"] as ChatTab[]).map(tab => (
               <Pressable 
                 key={tab} 
                 onPress={() => setActiveTab(tab)} 
                 className={`px-6 py-2.5 rounded-xl border-2 ${activeTab === tab ? "bg-amber-600 border-amber-400" : "bg-slate-900 border-white/5"}`}
               >
                  <Text className={`text-[10px] font-pixel-bold uppercase tracking-widest ${activeTab === tab ? "text-white" : "text-slate-600"}`}>{tab}</Text>
               </Pressable>
             ))}
          </View>

          <View className="flex-1 border-t border-white/5 pt-6">
            {activeTab === "whispers" && !whisperTarget ? (
               renderWhisperPartners()
            ) : (
               <>
                 {activeTab === "whispers" && !whisperTarget && chatLogs.filter(l => l.channel === "whispers").length === 0 && (
                    <View className="flex-1 items-center justify-center opacity-30">
                       <Ionicons name="chatbubbles-outline" size={32} color="#475569" />
                       <Text className="text-slate-500 text-[10px] font-pixel-bold uppercase mt-4">Select a friend to whisper</Text>
                    </View>
                 )}
                 {renderLogs()}
               </>
            )}
          </View>

          <View className="py-6">
             {activeTab === "whispers" && whisperTarget && (
               <View className="flex-row items-center mb-2 px-2">
                  <Text className="text-amber-500 text-[8px] font-pixel-bold uppercase">To: {whisperTarget.name}</Text>
                  <Pressable onPress={() => setWhisperTarget(null)} className="ml-2">
                     <Ionicons name="close-circle" size={12} color="#475569" />
                  </Pressable>
               </View>
             )}
             <TextInput
               className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm font-sans"
               placeholder={activeTab === "whispers" ? (whisperTarget ? "Type whisper..." : "Select someone...") : "Transmit message..."} 
               placeholderTextColor="#334155" 
               value={input} 
               onChangeText={setInput} 
               onSubmitEditing={submitChat}
               returnKeyType="send"
               editable={activeTab !== "whispers" || !!whisperTarget}
             />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 👥 FRIENDS MODAL */}
      <BaseModal 
        visible={isFriendListVisible} 
        onClose={() => setIsFriendListVisible(false)}
        title="SOCIAL NEXUS"
        position="bottom"
      >
         <View className="h-[500px] px-2">
            {/* ADD FRIEND INPUT */}
            <View className="flex-row items-center bg-slate-900 border border-white/5 rounded-2xl px-4 py-2 mb-6">
               <TextInput 
                  className="flex-1 text-white text-xs font-sans"
                  placeholder="PLAYER NAME..."
                  placeholderTextColor="#334155"
                  value={friendNameInput}
                  onChangeText={setFriendNameInput}
               />
               <Pressable onPress={handleAddFriend} className="bg-amber-600 px-4 py-2 rounded-xl">
                  <Text className="text-white text-[10px] font-pixel-bold">LINK</Text>
               </Pressable>
            </View>

            {loadingFriends ? (
               <ActivityIndicator color="#fbbf24" />
            ) : (
               <FlatList 
                  data={[...pending.map(p => ({ ...p, type: 'pending' })), ...friends.map(f => ({ ...f, type: 'friend' }))]}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                     <View className="flex-row items-center justify-between bg-slate-900/50 border border-white/5 p-4 rounded-2xl mb-3">
                        <View className="flex-row items-center">
                           <View className={`w-2 h-2 rounded-full mr-3 ${item.actionStatus === "IDLE" ? "bg-emerald-500" : "bg-amber-500"}`} />
                           <View>
                              <Text className="text-white text-sm font-pixel-bold">{item.name}</Text>
                              <Text className="text-slate-600 text-[10px] font-pixel-bold uppercase">Level {item.level} • {item.actionStatus}</Text>
                           </View>
                        </View>
                        
                        {item.type === 'pending' ? (
                           <Pressable onPress={() => handleAcceptFriend(item.id)} className="bg-emerald-600 px-3 py-1.5 rounded-lg">
                              <Text className="text-white text-[8px] font-pixel-bold uppercase">Accept</Text>
                           </Pressable>
                        ) : (
                           <Pressable onPress={() => { setIsFriendListVisible(false); openPlayerOptions(item); }} className="w-8 h-8 bg-slate-800 rounded-full items-center justify-center">
                              <Ionicons name="ellipsis-vertical" size={16} color="#475569" />
                           </Pressable>
                        )}
                     </View>
                  )}
                  ListEmptyComponent={() => (
                     <View className="items-center justify-center py-20 opacity-20">
                        <Ionicons name="people-outline" size={48} color="#475569" />
                        <Text className="text-slate-500 text-[10px] font-pixel-bold uppercase mt-4">No active links found</Text>
                     </View>
                  )}
               />
            )}
         </View>
      </BaseModal>

      {/* 🛠️ PLAYER ACTIONS MODAL */}
      <BaseModal
         visible={!!selectedPlayer}
         onClose={() => setSelectedPlayer(null)}
         title={selectedPlayer?.name || "PLAYER"}
         position="bottom"
      >
         <View className="space-y-4 pb-10">
            <StandardButton 
               label="WHISPER" 
               variant="primary" 
               onPress={() => {
                  if (selectedPlayer) {
                    setWhisperTarget({ id: selectedPlayer.id, name: selectedPlayer.name });
                    setActiveTab("whispers");
                    setSelectedPlayer(null);
                  }
               }} 
            />
            <StandardButton 
               label="TRADE" 
               variant="secondary" 
               onPress={() => {
                  if (selectedPlayer) {
                     requestTrade(selectedPlayer.userId || selectedPlayer.id);
                     setSelectedPlayer(null);
                  }
               }} 
            />
            <StandardButton 
               label="UNLINK FRIEND" 
               variant="secondary" 
               onPress={() => {
                  if (selectedPlayer) handleRemoveFriend(selectedPlayer.id);
               }} 
            />
         </View>
      </BaseModal>
    </View>
  );
}

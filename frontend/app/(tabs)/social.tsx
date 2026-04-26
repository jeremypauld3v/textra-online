import { View, Text, TextInput, Pressable, FlatList, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { useSocialStore } from "../../store/useSocialStore";
import { gameApi } from "../../api/game";
import Animated, { FadeIn } from "react-native-reanimated";
import BaseModal from "../../components/ui/BaseModal";
import StandardButton from "../../components/ui/StandardButton";
import ScreenHeader from "../../components/ui/ScreenHeader";
import TabBar from "../../components/ui/TabBar";
import Toast from "react-native-toast-message";

type ChatTab = "global" | "trade" | "whispers";

// 🧩 MEMOIZED MESSAGE COMPONENT
const ChatMessage = memo(({ l, isMe, onPress }: { l: any, isMe: boolean, onPress: () => void }) => (
  <Animated.View entering={FadeIn.duration(200)} className="mb-4">
    <Pressable onPress={onPress}>
       <View className="flex-row items-center mb-1">
          <Text className={`text-[10px] font-pixel-bold uppercase mr-2 ${isMe ? "text-amber-400" : "text-indigo-400"}`}>
             {l.senderName}
          </Text>
          <Text className="text-slate-700 text-[8px] font-pixel-bold">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
       </View>
       <Text className="text-slate-300 text-xs font-sans leading-relaxed">{l.message}</Text>
    </Pressable>
  </Animated.View>
));
ChatMessage.displayName = "ChatMessage";

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ChatTab>("global");
  const [input, setInput] = useState("");
  const [isFriendListVisible, setIsFriendListVisible] = useState(false);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const { socket, connected, requestTrade } = useSocket();
  const characterId = useAuthStore(s => s.characterId);
  const hasUnreadWhispers = useSocialStore(s => s.hasUnreadWhispers);
  const setHasUnreadWhispers = useSocialStore(s => s.setHasUnreadWhispers);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
     if (activeTab === "whispers") {
        setHasUnreadWhispers(false);
     }
  }, [activeTab, setHasUnreadWhispers]);

  // Friends State
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [friendNameInput, setFriendNameInput] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string, name: string, userId?: string } | null>(null);
  const [whisperTarget, setWhisperTarget] = useState<{ id: string, name: string } | null>(null);
  const [whisperPartners, setWhisperPartners] = useState<any[]>([]);

  useEffect(() => {
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
          // Reverse history for inverted list (newest first)
          setChatLogs([...messages].reverse());
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
        // Prepend new messages for inverted list
        setChatLogs(prev => [msg, ...prev]);
        
        if (msg.channel === "whispers") {
           fetchWhisperPartners();
           if (activeTab === "whispers") {
              setHasUnreadWhispers(false);
           }
        }
      };
      socket.on("chat_message", handleMessage);
      return () => { socket.off("chat_message", handleMessage); };
    }
  }, [socket, activeTab, setHasUnreadWhispers]);

  const showWhisperTabRedDot = useMemo(() => {
    if (activeTab === "whispers") {
       return whisperPartners.some(p => p.hasUnread);
    }
    return hasUnreadWhispers;
  }, [activeTab, whisperPartners, hasUnreadWhispers]);

  useEffect(() => {
    if (activeTab === "whispers") {
      if (whisperTarget) {
         const fetchPrivateHistory = async () => {
            try {
               const data = await gameApi.getPrivateChatHistory(whisperTarget.id);
               // Filter out old whispers and add new history (reversed)
               const reversedHistory = [...data.messages].reverse();
               setChatLogs(prev => {
                  const otherLogs = prev.filter(l => l.channel !== "whispers");
                  return [...reversedHistory, ...otherLogs];
               });
               fetchWhisperPartners();
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
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn.delay(index * 50).duration(300)}>
            <Pressable 
              onPress={() => setWhisperTarget({ id: item.id, name: item.name })}
              className={`flex-row items-center bg-slate-900/40 p-5 rounded-[24px] border mb-3 ${item.hasUnread ? "border-amber-500/50 bg-amber-500/5" : "border-white/5"}`}
            >
               <View className="w-10 h-10 bg-indigo-500/20 rounded-full items-center justify-center mr-4">
                  <Ionicons name="person" size={20} color={item.hasUnread ? "#fbbf24" : "#818cf8"} />
                  {item.hasUnread && (
                    <View className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#020617]" />
                  )}
               </View>
               <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                     <Text className={`text-sm font-pixel-bold ${item.hasUnread ? "text-amber-400" : "text-white"}`}>{item.name}</Text>
                     {item.lastMessageAt && (
                        <Text className="text-slate-600 text-[8px] font-pixel-bold">
                           {new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                     )}
                  </View>
                  <Text className="text-slate-500 text-[10px] font-sans mt-1" numberOfLines={1}>
                     {item.lastMessage || `Level ${item.level}`}
                  </Text>
               </View>
               <Ionicons name="chevron-forward" size={16} color="#475569" className="ml-2" />
            </Pressable>
          </Animated.View>
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
        inverted={true}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item: l }) => (
          <ChatMessage 
            l={l} 
            isMe={l.senderId === characterId} 
            onPress={() => openPlayerOptions({ id: l.senderId, name: l.senderName, userId: l.senderUserId })} 
          />
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-[#020617]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View 
          className="flex-1 px-8"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        >
          <ScreenHeader 
            title="COMMUNAL" 
            subtitle={connected ? "Nexus Active" : "Nexus Severed"} 
            rightElement={
              <Pressable onPress={() => setIsFriendListVisible(true)} className="w-12 h-12 bg-slate-900 rounded-2xl items-center justify-center border border-white/10">
                <Ionicons name="people" size={20} color="#fbbf24" />
                {pending.length > 0 && <View className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full items-center justify-center border-2 border-[#020617]"><Text className="text-[8px] text-white font-pixel-bold">{pending.length}</Text></View>}
              </Pressable>
            }
          />

          <TabBar 
            tabs={["global", "trade", "whispers"] as ChatTab[]} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            badgeCounts={{ whispers: showWhisperTabRedDot }}
            className="mb-8"
          />

          <View className="flex-1 border-t border-white/5 pt-6">
            {activeTab === "whispers" && !whisperTarget ? (
               renderWhisperPartners()
            ) : (
               renderLogs()
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

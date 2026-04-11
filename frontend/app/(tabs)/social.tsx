import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { gameApi } from "../../api/game";

interface ChatMessage {
  id: string;
  userId: string;
  characterName: string;
  message: string;
  timestamp: string;
}

interface Friend {
  id: string;
  userId: string;
  name: string;
  level: number;
}

interface PrivateMessage {
  fromUserId: string;
  fromCharacterName: string;
  message: string;
  timestamp: string;
}

export default function SocialScreen() {
  const { socket, connected, onlineUserIds, requestTrade, showAlert, hideAlert, hasPendingRequest } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [targetIGN, setTargetIGN] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUserId = useAuthStore((state) => state.userId);

  // 👥 Social State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ userId: string, name: string } | null>(null);
  const [isFriendListVisible, setIsFriendListVisible] = useState(false);
  const [activePmUser, setActivePmUser] = useState<Friend | null>(null);
  const [pmInput, setPmInput] = useState("");
  const [privateHistory, setPrivateHistory] = useState<Record<string, PrivateMessage[]>>({});

  const fetchFriends = useCallback(async () => {
    try {
      const data = await gameApi.getFriends();
      setFriends(data.friends);
    } catch (e) {
      console.error("Failed to fetch friends", e);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const fetchWorldHistory = useCallback(async () => {
    try {
      const data = await gameApi.getWorldChatHistory();
      setMessages(data.messages);
    } catch (e) {
      console.error("Failed to fetch world chat history", e);
    }
  }, []);

  const fetchPrivateHistory = useCallback(async (targetUserId: string) => {
    try {
      const data = await gameApi.getPrivateChatHistory(targetUserId);
      setPrivateHistory(prev => ({
        ...prev,
        [targetUserId]: data.messages
      }));
    } catch (e) {
      console.error("Failed to fetch private chat history", e);
    }
  }, []);

  useEffect(() => {
    fetchWorldHistory();
  }, [fetchWorldHistory]);

  useEffect(() => {
    if (activePmUser) {
      fetchPrivateHistory(activePmUser.userId);
    }
  }, [activePmUser, fetchPrivateHistory]);

  useEffect(() => {
    if (!socket) return;

    socket.on("chat_broadcast", (data: any) => {
      setMessages((prev) => {
         // Prevent duplicates
         if (prev.find(m => m.id === data.id)) return prev;
         return [...prev, data].slice(-100);
      });
    });

    socket.on("private_broadcast", (data: PrivateMessage) => {
      const partnerId = data.fromUserId === currentUserId ? activePmUser?.userId : data.fromUserId;
      if (!partnerId) return;

      setPrivateHistory(prev => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), data].slice(-50)
      }));
    });

    return () => {
      socket.off("chat_broadcast");
      socket.off("private_broadcast");
    };
  }, [socket, activePmUser, currentUserId]);

  const handleAddFriend = async (name: string) => {
    if (!name.trim()) return;
    try {
      setIsAddingFriend(true);
      await gameApi.addFriend(name.trim());
      showAlert({
         title: "Success",
         message: `${name} has been added to your friends.`,
         type: 'success',
         onConfirm: hideAlert
      });
      setTargetIGN("");
      fetchFriends();
      setSelectedUser(null);
    } catch (e: any) {
      showAlert({
         title: "Error",
         message: e.response?.data?.error || "Failed to add friend",
         type: 'error',
         onConfirm: hideAlert
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit("chat_message", input);
    setInput("");
  };

  const sendPrivateMessage = () => {
    if (!pmInput.trim() || !socket || !activePmUser) return;
    socket.emit("private_message", { targetUserId: activePmUser.userId, message: pmInput });
    setPmInput("");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-950"
    >
      <View className="flex-1 px-4 pt-16">
        <View className="flex-row items-center justify-between mb-6">
           <View>
              <Text className="text-3xl font-black text-white italic uppercase tracking-tighter">Social</Text>
              <View className="flex-row items-center mt-1">
                 <View className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                 <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    {connected ? `${onlineUserIds.length} Players Online` : 'Connecting...'}
                 </Text>
              </View>
           </View>
           <TouchableOpacity 
            onPress={() => setIsFriendListVisible(true)}
            className="bg-slate-900 p-3 rounded-2xl border border-slate-800"
           >
              <Ionicons name="people" size={20} color="#38bdf8" />
           </TouchableOpacity>
        </View>

        {/* 💬 CHAT AREA */}
        <View className="flex-1 bg-slate-900/50 rounded-[40px] border border-white/5 overflow-hidden p-4">
           <FlatList
             ref={flatListRef}
             data={messages}
             keyExtractor={(item) => item.id || Math.random().toString()}
             onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
             renderItem={({ item }) => (
                <TouchableOpacity 
                   onPress={() => item.userId !== currentUserId && setSelectedUser({ userId: item.userId, name: item.characterName })}
                   className={`mb-4 max-w-[80%] ${item.userId === currentUserId ? 'self-end items-end' : 'self-start items-start'}`}
                >
                   <Text className="text-[10px] text-slate-500 mb-1 font-bold uppercase ml-1">
                      {item.userId === currentUserId ? 'You' : `${item.characterName || `Player ${item.userId.substring(0, 4)}`}`}
                   </Text>
                   <View className={`p-4 rounded-3xl ${item.userId === currentUserId ? 'bg-sky-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none'}`}>
                      <Text className="text-white font-medium">{item.message}</Text>
                   </View>
                </TouchableOpacity>
             )}
             ListEmptyComponent={
                <View className="flex-1 justify-center items-center py-20">
                   <Ionicons name="chatbubbles-outline" size={48} color="#1e293b" />
                   <Text className="text-slate-600 italic mt-4">Welcome to World Chat!</Text>
                </View>
             }
           />
        </View>

        {/* ⌨️ INPUT AREA */}
        <View className="flex-row items-center py-6 space-x-3">
           <View className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4 flex-row items-center">
              <TextInput
                placeholder="Message world..."
                placeholderTextColor="#475569"
                className="flex-1 text-white"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
              />
           </View>
           <TouchableOpacity 
             onPress={sendMessage}
             disabled={!input.trim()}
             className={`w-14 h-14 rounded-full justify-center items-center ${input.trim() ? 'bg-sky-500' : 'bg-slate-800'}`}
           >
              <Ionicons name="send" size={20} color={input.trim() ? "white" : "#475569"} />
           </TouchableOpacity>
        </View>
      </View>

      {/* 🛠️ PLAYER ACTION MODAL */}
      <Modal visible={!!selectedUser} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-center items-center px-6"
          activeOpacity={1}
          onPress={() => setSelectedUser(null)}
        >
          <View className="bg-slate-900 w-full rounded-[40px] p-6 border border-white/10">
            <Text className="text-white text-xl font-bold mb-6 text-center italic uppercase">Interaction: {selectedUser?.name}</Text>
            
            <View className="space-y-3">
              <TouchableOpacity 
                onPress={() => selectedUser && handleAddFriend(selectedUser.name)}
                className="bg-sky-500/20 py-4 rounded-2xl flex-row items-center justify-center border border-sky-500/30"
              >
                <Ionicons name="person-add" size={20} color="#0ea5e9" className="mr-3" />
                <Text className="text-sky-400 font-bold ml-2">Add Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                   if (selectedUser) {
                      requestTrade(selectedUser.userId);
                      setSelectedUser(null);
                   }
                }}
                disabled={hasPendingRequest}
                className={`py-4 rounded-2xl flex-row items-center justify-center border ${hasPendingRequest ? 'bg-slate-800/50 border-slate-700 opacity-40' : 'bg-emerald-500/20 border-emerald-500/30'}`}
              >
                <Ionicons name="swap-horizontal" size={20} color="#10b981" className="mr-3" />
                <Text className="text-emerald-400 font-bold ml-2">{hasPendingRequest ? 'Request Pending...' : 'Request Trade'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  if (selectedUser) {
                    const friendObj = friends.find(f => f.userId === selectedUser.userId) || { userId: selectedUser.userId, name: selectedUser.name, id: '', level: 1 };
                    setActivePmUser(friendObj);
                    setSelectedUser(null);
                  }
                }}
                className="bg-violet-500/20 py-4 rounded-2xl flex-row items-center justify-center border border-violet-500/30"
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#8b5cf6" className="mr-3" />
                <Text className="text-violet-400 font-bold ml-2">Private Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 👥 FRIEND LIST MODAL */}
      <Modal visible={isFriendListVisible} animationType="slide">
        <View className="flex-1 bg-slate-950 px-6 pt-16">
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-2xl font-black text-white italic uppercase">Friends</Text>
            <TouchableOpacity onPress={() => setIsFriendListVisible(false)}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mb-8 bg-slate-900 rounded-3xl p-2 border border-white/5">
            <TextInput
              className="flex-1 text-white px-4 py-3 font-bold"
              placeholder="Enter IGN..."
              placeholderTextColor="#475569"
              value={targetIGN}
              onChangeText={setTargetIGN}
              autoCapitalize="none"
              onSubmitEditing={() => handleAddFriend(targetIGN)}
            />
            <TouchableOpacity 
              onPress={() => handleAddFriend(targetIGN)}
              disabled={isAddingFriend}
              className={`bg-indigo-600 px-6 py-3 rounded-2xl ${isAddingFriend ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-black text-xs uppercase">Add</Text>
            </TouchableOpacity>
          </View>

          <FlatList 
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isOnline = onlineUserIds.includes(item.userId);
              return (
                <View className="bg-slate-900 p-5 rounded-3xl border border-white/5 flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className={`w-3 h-3 rounded-full mr-3 ${isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-700'}`} />
                    <View>
                      <Text className="text-white font-bold text-lg">{item.name}</Text>
                      <Text className="text-slate-500 text-xs font-bold uppercase">Level {item.level} • {isOnline ? 'Active' : 'Offline'}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row space-x-2">
                    <TouchableOpacity 
                      onPress={() => {
                        setActivePmUser(item);
                        setIsFriendListVisible(false);
                      }}
                      className="bg-slate-800 w-12 h-12 rounded-2xl justify-center items-center"
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#38bdf8" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => requestTrade(item.userId)}
                      disabled={hasPendingRequest}
                      className={`w-12 h-12 rounded-2xl justify-center items-center ${hasPendingRequest ? 'bg-slate-700 opacity-40' : 'bg-slate-800'}`}
                    >
                      <Ionicons name="swap-horizontal" size={20} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-slate-600 italic">No friends yet. Find players in chat!</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* ✉️ PRIVATE CHAT MODAL */}
      <Modal visible={!!activePmUser} animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-slate-950"
        >
          <View className="flex-1 px-6 pt-16">
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Private Conversation</Text>
                <Text className="text-2xl font-black text-sky-400 italic uppercase underline">{activePmUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setActivePmUser(null)}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 mb-4">
              {(privateHistory[activePmUser?.userId || ''] || []).map((msg, idx) => (
                <View 
                  key={idx}
                  className={`mb-4 max-w-[80%] ${msg.fromUserId === currentUserId ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <View className={`p-4 rounded-3xl ${msg.fromUserId === currentUserId ? 'bg-sky-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none'}`}>
                    <Text className="text-white font-medium">{msg.message}</Text>
                  </View>
                  <Text className="text-[8px] text-slate-600 mt-1 uppercase font-bold">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View className="flex-row items-center py-6 space-x-3">
              <View className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4">
                <TextInput
                  placeholder="Private message..."
                  placeholderTextColor="#475569"
                  className="text-white"
                  value={pmInput}
                  onChangeText={setPmInput}
                  onSubmitEditing={sendPrivateMessage}
                />
              </View>
              <TouchableOpacity 
                onPress={sendPrivateMessage}
                className="w-14 h-14 bg-sky-500 rounded-full justify-center items-center"
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BaseModal from "./ui/BaseModal";
import { gameApi } from "../api/game";
import Toast from "react-native-toast-message";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReportModal({ visible, onClose }: ReportModalProps) {
  const [category, setCategory] = useState<"BUG" | "PLAYER">("BUG");
  const [reportedName, setReportedName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Required Field", "Please enter a description for the report.");
      return;
    }

    if (category === "PLAYER" && !reportedName.trim()) {
      Alert.alert("Required Field", "Please enter the name of the player you are reporting.");
      return;
    }

    setSubmitting(true);
    try {
      await gameApi.submitReport(category, reportedName, description);
      Toast.show({
        type: "success",
        text1: "🛡️ Report Transmitted",
        text2: "Thank you, the administrator has been notified.",
        visibilityTime: 4000
      });
      setDescription("");
      setReportedName("");
      onClose();
    } catch (e: any) {
      const errMsg = e.response?.data?.error || "Failed to submit report. Please try again.";
      Alert.alert("Submission Failed", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal visible={visible} onClose={onClose} title="Transmit Signal">
      <View className="space-y-4 pt-1">
        {/* Category Tabs */}
        <View className="flex-row bg-white/[0.04] p-1 rounded-xl border border-white/5">
          <Pressable 
            onPress={() => setCategory("BUG")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg space-x-2 border ${category === "BUG" ? "bg-white/10 border-white/20" : "border-transparent"}`}
          >
            <Ionicons name="bug" size={14} color={category === "BUG" ? "#ffffff" : "rgba(255,255,255,0.25)"} />
            <Text className={`font-pixel-bold text-[8px] uppercase ${category === "BUG" ? "text-white" : "text-white/30"}`}>
              Report Bug
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => setCategory("PLAYER")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg space-x-2 border ${category === "PLAYER" ? "bg-white/10 border-white/20" : "border-transparent"}`}
          >
            <Ionicons name="alert-circle-outline" size={14} color={category === "PLAYER" ? "#ffffff" : "rgba(255,255,255,0.25)"} />
            <Text className={`font-pixel-bold text-[8px] uppercase ${category === "PLAYER" ? "text-white" : "text-white/30"}`}>
              Report Player
            </Text>
          </Pressable>
        </View>

        {/* Input Target Character Name if PLAYER */}
        {category === "PLAYER" && (
          <View>
            <Text className="text-white/40 text-[8px] font-pixel-bold uppercase mb-1.5 tracking-wider ml-0.5">Reported Player Name</Text>
            <TextInput
              value={reportedName}
              onChangeText={setReportedName}
              placeholder="Enter exact character name..."
              placeholderTextColor="rgba(255,255,255,0.15)"
              className="bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-sans"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Description Field */}
        <View>
          <Text className="text-white/40 text-[8px] font-pixel-bold uppercase mb-1.5 tracking-wider ml-0.5">Report Details / Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={category === "BUG" ? "Describe the bug, steps to reproduce, or issue..." : "Describe the player's misconduct (e.g. cheating, verbal abuse)..."}
            placeholderTextColor="rgba(255,255,255,0.15)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-sans h-24"
          />
        </View>

        {/* Action Button */}
        <Pressable 
          onPress={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 bg-white rounded-xl items-center justify-center ${submitting ? "opacity-60" : ""}`}
        >
          {submitting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text className="text-black font-pixel-bold uppercase tracking-widest text-sm font-bold">
              Submit Report
            </Text>
          )}
        </Pressable>
      </View>
    </BaseModal>
  );
}

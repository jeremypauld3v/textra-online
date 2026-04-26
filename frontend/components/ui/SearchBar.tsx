import React from 'react';
import { TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = "Search items...",
  className = "" 
}: SearchBarProps) {
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      className={`flex-row items-center bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-2 mb-4 ${className}`}
    >
      <Ionicons name="search" size={16} color="#475569" className="mr-3" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#334155"
        className="flex-1 text-white text-xs font-sans py-1"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} className="ml-2">
          <Ionicons name="close-circle" size={16} color="#475569" />
        </Pressable>
      )}
    </Animated.View>
  );
}

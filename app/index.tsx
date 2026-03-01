import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { killAllCameraStreams } from '../utils/cameraCleanup';
import '../src/global.css';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function App() {
  const router = useRouter();
  const [selectedVideo, setSelectedVideo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Kill any lingering camera streams when home page is displayed
  useFocusEffect(
    useCallback(() => {
      killAllCameraStreams();
    }, [])
  );

  const handleUploadVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
      if (!result.canceled && result.assets.length > 0) {
        setIsUploading(true);
        setTimeout(() => {
          setSelectedVideo(result.assets[0]);
          setIsUploading(false);
        }, 1500);
      }
    } catch (err) {
      console.log('Error picking video:', err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">

        {/* ── Nav ── */}
        <View className="flex-row items-center justify-between px-5 py-4 mx-3 mt-3 bg-[#171717] rounded-2xl">
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-lg bg-indigo-500 items-center justify-center">
              <MaterialCommunityIcons name="vector-triangle" size={18} color="#fff" />
            </View>
            <Text className="text-white font-bold text-lg">LiftLens</Text>
          </View>
          {isDesktop && (
            <View className="flex-row gap-5">
              <Text className="text-zinc-500 text-sm">Platform</Text>
              <Text className="text-zinc-500 text-sm">Science</Text>
            </View>
          )}
        </View>

        {/* ── Bento Grid ── */}
        <View className={`px-3 pt-4 gap-3 ${isDesktop ? 'flex-row max-w-5xl self-center w-full' : ''}`}>

          {/* Upload Card */}
          <TouchableOpacity
            onPress={handleUploadVideo}
            activeOpacity={0.85}
            className={`bg-[#171717] rounded-2xl p-8 items-center justify-center ${isDesktop ? 'flex-1' : 'w-full'}`}
            style={{ minHeight: isDesktop ? 360 : 280 }}
          >
            {isUploading ? (
              <View className="items-center">
                <Feather name="loader" size={36} color="#818cf8" />
                <Text className="text-white font-semibold text-base mt-5 mb-1">Processing...</Text>
                <Text className="text-zinc-600 text-xs">Extracting frames</Text>
              </View>
            ) : selectedVideo ? (
              <View className="items-center w-full">
                <View className="w-14 h-14 bg-indigo-500/15 rounded-xl items-center justify-center mb-5">
                  <Feather name="check" size={28} color="#818cf8" />
                </View>
                <Text className="text-white font-bold text-lg mb-1">Ready</Text>
                <Text className="text-zinc-600 text-xs mb-8 font-mono">{selectedVideo.name}</Text>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/dashboard', params: { videoUri: selectedVideo.uri } })}
                  className="bg-indigo-500 py-3 px-6 rounded-xl flex-row items-center gap-2 w-full justify-center"
                >
                  <Feather name="arrow-right" size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm">Analyze</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center">
                <View className="w-14 h-14 bg-indigo-500/15 rounded-xl items-center justify-center mb-5">
                  <Feather name="upload" size={24} color="#818cf8" />
                </View>
                <Text className="text-white font-bold text-lg mb-1">Upload Video</Text>
                <Text className="text-zinc-600 text-xs mb-6">MP4 or MOV</Text>
                <View className="flex-row gap-2.5">
                  <View className="bg-zinc-800 px-4 py-2 rounded-lg flex-row items-center gap-1.5">
                    <Feather name="folder" size={14} color="#a5b4fc" />
                    <Text className="text-zinc-300 text-xs font-medium">Browse</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => router.push('/live')}
                    className="bg-zinc-800 px-4 py-2 rounded-lg flex-row items-center gap-1.5"
                  >
                    <Feather name="camera" size={14} color="#a5b4fc" />
                    <Text className="text-zinc-300 text-xs font-medium">Live</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Right side — stacked info blocks (desktop) / single tagline (mobile) */}
          <View className={`gap-3 ${isDesktop ? 'flex-1' : ''}`}>
            {/* Tagline Block */}
            <View className="bg-[#171717] rounded-2xl p-6">
              <Text className="text-white font-bold text-2xl leading-snug mb-2">
                Analyze. <Text className="text-indigo-400">Adapt.</Text> Overcome.
              </Text>
              <Text className="text-zinc-600 text-sm leading-relaxed">
                Neural tracking maps your joint kinematics and delivers instant LLM coaching.
              </Text>
            </View>

            {/* Stats Row */}
            {isDesktop && (
              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#171717] rounded-2xl p-5 items-center">
                  <Text className="text-indigo-400 font-bold text-2xl">33</Text>
                  <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">Joints</Text>
                </View>
                <View className="flex-1 bg-[#171717] rounded-2xl p-5 items-center">
                  <Text className="text-indigo-400 font-bold text-2xl">60</Text>
                  <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">FPS</Text>
                </View>
                <View className="flex-1 bg-[#171717] rounded-2xl p-5 items-center">
                  <Text className="text-indigo-400 font-bold text-2xl">AI</Text>
                  <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">Coach</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Feature Blocks ── */}
        <View className={`px-3 py-3 gap-3 ${isDesktop ? 'flex-row max-w-5xl self-center w-full' : ''}`}>
          <View className="flex-1 bg-[#171717] rounded-2xl p-5">
            <View className="w-9 h-9 bg-indigo-500/15 rounded-lg items-center justify-center mb-3">
              <MaterialCommunityIcons name="run" size={20} color="#818cf8" />
            </View>
            <Text className="text-white font-semibold text-sm mb-1">Pose Tracking</Text>
            <Text className="text-zinc-600 text-xs leading-relaxed">Markerless 33-point CV at 60fps</Text>
          </View>
          <View className="flex-1 bg-[#171717] rounded-2xl p-5">
            <View className="w-9 h-9 bg-violet-500/15 rounded-lg items-center justify-center mb-3">
              <Feather name="activity" size={18} color="#a78bfa" />
            </View>
            <Text className="text-white font-semibold text-sm mb-1">Waveforms</Text>
            <Text className="text-zinc-600 text-xs leading-relaxed">Joint angle & velocity graphs</Text>
          </View>
          <View className="flex-1 bg-[#171717] rounded-2xl p-5">
            <View className="w-9 h-9 bg-sky-500/15 rounded-lg items-center justify-center mb-3">
              <Feather name="message-circle" size={18} color="#7dd3fc" />
            </View>
            <Text className="text-white font-semibold text-sm mb-1">LLM Coach</Text>
            <Text className="text-zinc-600 text-xs leading-relaxed">AI-powered form corrections</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View className="mx-3 mb-4 py-5 bg-[#171717] rounded-2xl items-center">
          <Text className="text-zinc-700 text-xs">© 2026 LiftLens</Text>
        </View>

      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

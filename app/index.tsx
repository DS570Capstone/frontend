import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import '../src/global.css';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = width > 768;

export default function App() {
  const router = useRouter();
  const [selectedVideo, setSelectedVideo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  const handleUploadVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
      });
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
    <SafeAreaView className="flex-1 bg-[#0a0f0d]">
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.15)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 800 }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">

        {/* Navbar */}
        <View className="flex-row items-center justify-between px-8 py-5 mt-4 mx-6 max-w-7xl w-full self-center bg-white/5 border border-white/10 rounded-2xl" style={Platform.OS === 'web' ? { backdropFilter: 'blur(16px)' } as any : undefined}>
          <View className="flex-row items-center gap-3">
            <LinearGradient colors={['#10b981', '#14b8a6']} className="w-10 h-10 rounded-xl items-center justify-center scale-110">
              <MaterialCommunityIcons name="vector-triangle" size={24} color="#fff" />
            </LinearGradient>
            <Text className="text-white font-black text-2xl tracking-tighter">Axiom</Text>
          </View>
          <View className="flex-row gap-8 items-center">
            {isDesktop && (
              <>
                <Text className="text-slate-300 font-medium hover:text-emerald-400 transition-colors duration-200 cursor-pointer">Platform</Text>
                <Text className="text-slate-300 font-medium hover:text-emerald-400 transition-colors duration-200 cursor-pointer">Science</Text>
              </>
            )}
          </View>
        </View>

        {/* Hero & Upload Split Section */}
        <View className={`pt-24 pb-16 px-6 max-w-7xl self-center w-full relative z-10 flex-col ${isDesktop ? 'md:flex-row items-center gap-12' : 'items-center'}`}>

          <View className={`flex-1 ${isDesktop ? 'pr-8 items-start' : 'items-center text-center mb-16'}`}>
            <View className="bg-emerald-500/10 px-5 py-2.5 rounded-full mb-6 flex-row items-center border border-emerald-500/20">
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-3 animate-pulse" />
              <Text className="text-emerald-300 font-bold text-xs tracking-widest uppercase">Motion Intelligence</Text>
            </View>

            <Text className={`text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-tight ${!isDesktop ? 'text-center' : ''}`}>
              Analyze. <Text className="text-emerald-400">Adapt.</Text> Overcome.
            </Text>

            <Text className={`text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-10 font-light ${!isDesktop ? 'text-center' : ''}`}>
              Drop your raw workout footage into Axiom. Our advanced neural tracking instantly maps 3D joint kinematics and provides actionable LLM diagnostics.
            </Text>

            {isDesktop && (
              <View className="flex-row gap-4 items-center">
                <View className="flex-row -space-x-3">
                  {[1, 2, 3].map(i => (
                    <View key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0a0f0d] items-center justify-center">
                      <Feather name="user" color="#10b981" size={16} />
                    </View>
                  ))}
                </View>
                <Text className="text-sm font-medium text-slate-500">Trusted by pro athletes</Text>
              </View>
            )}
          </View>

          {/* Interactive Video Upload Zone */}
          <View className="flex-1 w-full max-w-md relative z-20 mt-8 md:mt-0">
            {Platform.OS === 'web' && (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="absolute -inset-2 bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 rounded-[40px] blur-2xl" />
            )}
            <TouchableOpacity
              onPress={handleUploadVideo}
              activeOpacity={0.9}
              className="w-full bg-[#0d1411]/90 rounded-[32px] border border-emerald-500/20 overflow-hidden shadow-2xl items-center justify-center p-10 min-h-[420px]"
              style={Platform.OS === 'web' ? { backdropFilter: 'blur(24px)' } as any : undefined}
            >
              {isUploading ? (
                <View className="items-center">
                  <Ionicons name="scan-outline" size={56} color="#10b981" className="animate-pulse mb-6" />
                  <Text className="text-white font-bold text-xl mb-2 text-center">Extracting Kinematics...</Text>
                  <Text className="text-slate-400 text-center">Processing video frames</Text>
                </View>
              ) : selectedVideo ? (
                <View className="items-center w-full h-full justify-center">
                  <View className="w-24 h-24 bg-emerald-500/20 rounded-2xl items-center justify-center mb-8 rotate-3 border border-emerald-500/30">
                    <Feather name="check-circle" size={40} color="#34d399" />
                  </View>
                  <Text className="text-white font-black text-3xl mb-3 text-center tracking-tight">Ready</Text>
                  <Text className="text-emerald-400 text-center mb-10 font-mono text-xs">{selectedVideo.name}</Text>

                  <TouchableOpacity
                    onPress={() => router.push('/dashboard')}
                    className="bg-emerald-500 hover:bg-emerald-400 transition-all py-4 px-8 rounded-2xl flex-row items-center justify-center gap-3 shadow-lg shadow-emerald-500/25 w-full"
                  >
                    <Feather name="bar-chart-2" size={20} color="#064e3b" />
                    <Text className="text-[#064e3b] font-black text-lg">Launch Analytics</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center">
                  <View className="w-24 h-24 bg-emerald-500/10 rounded-3xl items-center justify-center mb-8 border border-emerald-500/20">
                    <MaterialCommunityIcons name="video-plus-outline" size={44} color="#34d399" />
                  </View>
                  <Text className="text-white font-black text-2xl mb-4 text-center tracking-tight">Upload Footage</Text>
                  <Text className="text-slate-400 text-center mb-10 text-sm leading-relaxed">
                    Drop your MP4 or MOV file here. Automatically tracks barbell and human pose.
                  </Text>

                  <View className="bg-white/10 hover:bg-white/20 transition-colors px-8 py-3.5 rounded-2xl flex-row items-center gap-3 border border-white/10 w-full justify-center">
                    <Feather name="upload" size={18} color="#10b981" />
                    <Text className="text-white font-bold text-sm tracking-wide">Browse Files</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Grid */}
        <View className="px-6 py-20 w-full relative border-t border-white/5 bg-[#080c0a]">
          <View className="max-w-7xl self-center w-full">
            <View className="flex-col md:flex-row gap-6">

              <View className="flex-1 bg-[#0a0f0d] border border-white/5 p-8 rounded-[28px]">
                <View className="w-12 h-12 bg-emerald-500/10 rounded-xl mb-6 items-center justify-center border border-emerald-500/20">
                  <MaterialCommunityIcons name="run" size={26} color="#34d399" />
                </View>
                <Text className="text-white font-bold text-xl mb-3">33-Point Tracking</Text>
                <Text className="text-slate-400 text-sm leading-relaxed">Markerless computer vision captures micro-movements at 60fps.</Text>
              </View>

              <View className="flex-1 bg-[#0a0f0d] border border-white/5 p-8 rounded-[28px]">
                <View className="w-12 h-12 bg-teal-500/10 rounded-xl mb-6 items-center justify-center border border-teal-500/20">
                  <Feather name="activity" size={24} color="#2dd4bf" />
                </View>
                <Text className="text-white font-bold text-xl mb-3">Sine Waveforms</Text>
                <Text className="text-slate-400 text-sm leading-relaxed">Velocity and joint angles graphed to spot concentric imbalances.</Text>
              </View>

              <View className="flex-1 bg-[#0a0f0d] border border-white/5 p-8 rounded-[28px]">
                <View className="w-12 h-12 bg-blue-500/10 rounded-xl mb-6 items-center justify-center border border-blue-500/20">
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#60a5fa" />
                </View>
                <Text className="text-white font-bold text-xl mb-3">LLM Coaching</Text>
                <Text className="text-slate-400 text-sm leading-relaxed">Raw data piped into our LLM for human-readable form corrections.</Text>
              </View>

            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="py-12 items-center justify-center bg-[#050806] px-6 text-center border-t border-white/5">
          <View className="flex-row items-center gap-2 mb-4">
            <MaterialCommunityIcons name="vector-triangle" size={20} color="#10b981" />
            <Text className="text-xl font-black text-white tracking-tighter">Axiom</Text>
          </View>
          <Text className="text-slate-600 text-xs font-medium">© 2026 Axiom Analytics. All rights reserved.</Text>
        </View>

      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

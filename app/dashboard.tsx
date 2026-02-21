import { Text, View, SafeAreaView, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useState, useRef, useEffect } from 'react';
import '../src/global.css';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;
const isWeb = Platform.OS === 'web';

export default function Dashboard() {
    const router = useRouter();
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<Video>(null);

    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
                Animated.timing(scanAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
            ])
        ).start();
    }, [scanAnim]);

    const togglePlayback = () => {
        if (isPlaying) {
            videoRef.current?.pauseAsync();
        } else {
            videoRef.current?.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#050806]">
            {/* Dashboard Top Area */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/5 z-50 bg-[#050806]/90" style={isWeb ? { backdropFilter: 'blur(16px)' } as any : undefined}>
                <View className="flex-row items-center gap-5">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-white/5 rounded-xl items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <Feather name="arrow-left" size={18} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white font-black tracking-tighter text-xl">Squat Analysis</Text>
                        <Text className="text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5">Session_8492 • 12 Reps</Text>
                    </View>
                </View>

                <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <Text className="text-emerald-400 font-mono text-[10px] uppercase">Engine Active</Text>
                    </View>
                    <TouchableOpacity className="w-10 h-10 bg-white/5 rounded-xl items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                        <Feather name="share" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
                <View className={`flex-1 gap-6 ${isDesktop ? 'flex-row' : 'flex-col'}`}>

                    {/* Left Column: Video & Tracker */}
                    <View className={`flex-[1.2] gap-6`}>
                        {/* Video Container */}
                        <View className="bg-[#0a0f0d] rounded-[24px] overflow-hidden border border-white/5 relative shadow-2xl aspect-video w-full">
                            {/* Mock Video Element Layer */}
                            <View className="absolute inset-0 bg-[#0d1411] items-center justify-center">
                                <MaterialCommunityIcons name="camera-metering-matrix" size={56} color="#10b981" style={{ opacity: 0.2 }} />
                                <Text className="text-emerald-500/50 mt-3 font-mono text-xs tracking-widest uppercase">Video Feed Missing</Text>
                            </View>

                            {/* Kinematic Overlay Layer */}
                            <View className="absolute inset-0 z-10 opacity-80 border border-emerald-500/20 rounded-[24px] pointer-events-none">
                                <Svg height="100%" width="100%">
                                    <Defs>
                                        <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                            <Stop offset="0" stopColor="#10b981" stopOpacity="1" />
                                            <Stop offset="1" stopColor="#14b8a6" stopOpacity="1" />
                                        </SvgGradient>
                                    </Defs>
                                    <Path d="M150,100 L180,180 L220,250 L200,320" stroke="url(#grad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M180,180 L140,240 L160,300" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                                    <Circle cx="150" cy="100" r="5" fill="#fff" />
                                    <Circle cx="180" cy="180" r="5" fill="#fff" />
                                    <Circle cx="220" cy="250" r="5" fill="#fff" />
                                    <Circle cx="200" cy="320" r="5" fill="#fff" />
                                </Svg>
                            </View>

                            {/* AI Scanning Line Animation */}
                            {isWeb && (
                                <Animated.View
                                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,1)] z-20 pointer-events-none"
                                    style={{
                                        top: scanAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                                    }}
                                />
                            )}

                            {/* Playback Controls Overlay */}
                            <View className="absolute bottom-4 left-4 right-4 flex-row items-center justify-between z-30 bg-[#050806]/80 p-2 rounded-xl border border-white/5" style={isWeb ? { backdropFilter: 'blur(12px)' } as any : undefined}>
                                <TouchableOpacity onPress={togglePlayback} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-lg items-center justify-center">
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#050806" style={{ marginLeft: isPlaying ? 0 : 2 }} />
                                </TouchableOpacity>

                                <View className="flex-1 mx-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <View className="h-full bg-emerald-400 w-[30%]" />
                                </View>

                                <Text className="text-emerald-400 font-mono text-[10px] px-2">00:04/00:15</Text>
                            </View>
                        </View>

                        {/* Waveform Metric Box */}
                        <View className="bg-[#0a0f0d] rounded-[24px] p-6 border border-white/5">
                            <View className="flex-row items-center justify-between mb-6">
                                <View className="flex-row items-center gap-3">
                                    <View className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
                                        <Feather name="bar-chart-2" size={16} color="#2dd4bf" />
                                    </View>
                                    <Text className="text-white font-black tracking-tight text-lg">Hip Kinematics</Text>
                                </View>
                                <Text className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Angle vs Time</Text>
                            </View>

                            <View className="h-40 w-full relative">
                                <Svg height="100%" width="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                                    <Defs>
                                        <SvgGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor="#10b981" stopOpacity="0.4" />
                                            <Stop offset="1" stopColor="#10b981" stopOpacity="0" />
                                        </SvgGradient>
                                    </Defs>
                                    <Path
                                        d="M0,50 Q40,10 80,50 T160,50 T240,50 T320,50 T400,50 L400,100 L0,100 Z"
                                        fill="url(#waveGrad)"
                                    />
                                    <Path
                                        d="M0,50 Q40,10 80,50 T160,50 T240,50 T320,50 T400,50"
                                        stroke="#10b981"
                                        strokeWidth="2.5"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </Svg>

                                {/* Overlay Axis Lines */}
                                <View className="absolute inset-0 justify-between py-2 border-l border-b border-white/5 pointer-events-none">
                                    <Text className="text-slate-600 text-[9px] ml-2 font-mono">180°</Text>
                                    <Text className="text-slate-600 text-[9px] ml-2 font-mono">90°</Text>
                                    <Text className="text-slate-600 text-[9px] ml-2 font-mono">0°</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: AI Terminal */}
                    <View className={`flex-[0.8] bg-[#080d0b] rounded-[24px] p-8 border border-white/5 relative overflow-hidden`}>
                        <LinearGradient colors={['rgba(16, 185, 129, 0.03)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

                        <View className="flex-row items-center gap-3 mb-8 pb-6 border-b border-white/5">
                            <Ionicons name="terminal-outline" size={20} color="#34d399" />
                            <Text className="text-white font-black tracking-tight text-xl">Axiom Engine Output</Text>
                        </View>

                        <View className="flex-1">
                            <View className="mb-6">
                                <Text className="text-teal-400 font-mono text-[10px] uppercase tracking-widest mb-3">{'>'} Parsing Frame 244...</Text>
                                <View className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <Text className="text-slate-300 font-mono text-xs leading-relaxed">
                                        <Text className="text-white font-bold">Deviation:</Text> Early knee shift observed in descent. Maximum dorsiflexion reached preemptively.
                                    </Text>
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-teal-400 font-mono text-[10px] uppercase tracking-widest mb-3">{'>'} Axiom LLM Synthesis...</Text>
                                <View className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20">
                                    <Text className="text-emerald-100 leading-relaxed text-sm font-medium">
                                        "Sit back into your hips before breaking at the knees. Imagine closing a car door with your glutes to ensure the load remains centered over mid-foot."
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-auto">
                                <View className="flex-row items-center justify-between border-t border-white/5 pt-6">
                                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Efficiency Score</Text>
                                    <Text className="text-emerald-400 font-black text-4xl">84<Text className="text-lg text-slate-500">/100</Text></Text>
                                </View>
                                <View className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                                    <View className="w-[84%] bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full" />
                                </View>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

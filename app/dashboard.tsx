import { Text, View, TouchableOpacity, ScrollView, Dimensions, Platform, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import Svg, { Path, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { killAllCameraStreams } from '../utils/cameraCleanup';
import { getVideoUrl, listVideos, deleteVideo, VideoItem } from '../utils/minioUpload';
import '../src/global.css';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

// ──────────────────────────────────────────────
//  REALISTIC BIOMECHANICS DATA GENERATOR
//  Generates SVG paths that mimic actual joint
//  angle measurements during exercise reps.
// ──────────────────────────────────────────────

// Seeded pseudo-random for deterministic "noise"
function seededRandom(seed: number) {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// Generate a realistic SVG path for a joint during an exercise
// restAngle / peakAngle in degrees, mapped to 0-100 SVG y
function generatePath(
    restAngle: number,
    peakAngle: number,
    yMinDeg: number,
    yMaxDeg: number,
    reps: number,
    seed: number
): string {
    const rand = seededRandom(seed);
    const points: [number, number][] = [];
    const totalWidth = 400;
    const fps = 60; // points
    const restPhase = 0.08; // 8% rest at start/end
    const repWidth = (totalWidth * (1 - restPhase * 2)) / reps;

    // Map degree to SVG Y (inverted: higher angle = lower y value)
    const degToY = (deg: number) => {
        const pct = (deg - yMinDeg) / (yMaxDeg - yMinDeg);
        return 100 - pct * 100; // invert so higher angles are up
    };

    // Initial rest
    const startX = 0;
    const restY = degToY(restAngle);
    points.push([startX, restY]);

    for (let r = 0; r < reps; r++) {
        const repStart = totalWidth * restPhase + r * repWidth;
        const noise = (rand() - 0.5) * 8; // ±4° variation per rep
        const repPeak = peakAngle + noise;
        const peakY = degToY(repPeak);
        const restYNoisy = degToY(restAngle + (rand() - 0.5) * 4);

        // Eccentric phase (going down) — slower, ~60% of rep
        const eccentricEnd = repStart + repWidth * 0.35;
        // Bottom hold — brief pause
        const holdEnd = eccentricEnd + repWidth * 0.08;
        // Concentric phase (going up) — faster, ~30% of rep
        const concentricEnd = holdEnd + repWidth * 0.35;
        // Rest between reps
        const restEnd = repStart + repWidth;

        // Smooth transition into eccentric
        points.push([repStart + repWidth * 0.05, restYNoisy - 2]);
        // Mid eccentric
        points.push([repStart + repWidth * 0.18, degToY(restAngle + (repPeak - restAngle) * 0.5 + (rand() - 0.5) * 3)]);
        // Bottom of rep
        points.push([eccentricEnd, peakY]);
        // Hold at bottom
        points.push([holdEnd, peakY + (rand() - 0.5) * 3]);
        // Mid concentric
        points.push([holdEnd + (concentricEnd - holdEnd) * 0.5, degToY(restAngle + (repPeak - restAngle) * 0.4 + (rand() - 0.5) * 3)]);
        // Back to rest
        points.push([concentricEnd, restYNoisy]);
        // Small rest between reps
        if (r < reps - 1) {
            points.push([restEnd - repWidth * 0.03, restYNoisy + (rand() - 0.5) * 2]);
        }
    }

    // Final rest
    points.push([totalWidth, restY + (rand() - 0.5) * 2]);

    // Build smooth SVG path using cubic bezier curves
    let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev[0] + (curr[0] - prev[0]) * 0.4;
        const cpx2 = prev[0] + (curr[0] - prev[0]) * 0.6;
        d += ` C${cpx1.toFixed(1)},${prev[1].toFixed(1)} ${cpx2.toFixed(1)},${curr[1].toFixed(1)} ${curr[0].toFixed(1)},${curr[1].toFixed(1)}`;
    }
    return d;
}

// Joint metadata
const JOINT_META: Record<string, { label: string; yMin: number; yMax: number }> = {
    back:            { label: 'Back Posture',   yMin: 0,  yMax: 60 },
    left_knee:       { label: 'Left Knee',      yMin: 40, yMax: 180 },
    right_knee:      { label: 'Right Knee',     yMin: 40, yMax: 180 },
    left_hip:        { label: 'Left Hip',       yMin: 40, yMax: 180 },
    right_hip:       { label: 'Right Hip',      yMin: 40, yMax: 180 },
    left_ankle:      { label: 'Left Ankle',     yMin: 60, yMax: 120 },
    right_ankle:     { label: 'Right Ankle',    yMin: 60, yMax: 120 },
    left_elbow:      { label: 'Left Elbow',     yMin: 40, yMax: 180 },
    right_elbow:     { label: 'Right Elbow',    yMin: 40, yMax: 180 },
    left_shoulder:   { label: 'Left Shoulder',  yMin: 0,  yMax: 180 },
    right_shoulder:  { label: 'Right Shoulder', yMin: 0,  yMax: 180 },
    left_wrist:      { label: 'Left Wrist',     yMin: 130, yMax: 190 },
    right_wrist:     { label: 'Right Wrist',    yMin: 130, yMax: 190 },
};

// Per-exercise joint angle profiles: [restAngle, peakAngle]
// These are based on real biomechanics literature
const EXERCISE_ANGLES: Record<string, Record<string, [number, number]>> = {
    squat:          { back: [10, 45],  left_knee: [170, 65],  left_hip: [170, 70] },
    deadlift:       { back: [10, 50],  left_hip: [170, 60],   left_knee: [170, 90] },
    bench_press:    { left_elbow: [165, 85], left_shoulder: [45, 70], left_wrist: [175, 165] },
    overhead_press: { left_shoulder: [40, 160], left_elbow: [80, 170], back: [5, 15] },
    bicep_curl:     { left_elbow: [160, 45],  left_wrist: [170, 155] },
    tricep_ext:     { left_elbow: [160, 55],  left_shoulder: [160, 155] },
    lunge:          { left_knee: [170, 75],   left_hip: [170, 85],  left_ankle: [90, 70] },
    pullup:         { left_shoulder: [165, 40], left_elbow: [170, 55], back: [5, 20] },
    pushup:         { left_elbow: [170, 80],  left_shoulder: [50, 75], left_wrist: [175, 160] },
    row:            { back: [25, 35],  left_elbow: [170, 70], left_shoulder: [30, 60] },
    plank:          { back: [5, 10],   left_hip: [170, 168],  left_shoulder: [80, 85] },
    leg_press:      { left_knee: [170, 70],   left_hip: [160, 75],  left_ankle: [90, 75] },
    calf_raise:     { left_ankle: [80, 115],  left_knee: [170, 168] },
    lat_pulldown:   { left_shoulder: [170, 50], left_elbow: [170, 60], back: [5, 15] },
    leg_curl:       { left_knee: [170, 55],   left_hip: [170, 165] },
    shoulder_raise: { left_shoulder: [15, 90], left_elbow: [165, 155] },
    hip_thrust:     { left_hip: [90, 170],    back: [10, 5],  left_knee: [90, 85] },
};

// ──────────────────────────────────────────────
//  EXERCISE → RELEVANT JOINTS (2-3 per exercise)
// ──────────────────────────────────────────────
const EXERCISE_MAP: Record<string, { label: string; joints: string[] }> = {
    squat:           { label: 'Squat',             joints: ['back', 'left_knee', 'left_hip'] },
    deadlift:        { label: 'Deadlift',          joints: ['back', 'left_hip', 'left_knee'] },
    bench_press:     { label: 'Bench Press',       joints: ['left_elbow', 'left_shoulder', 'left_wrist'] },
    overhead_press:  { label: 'Overhead Press',    joints: ['left_shoulder', 'left_elbow', 'back'] },
    bicep_curl:      { label: 'Bicep Curl',        joints: ['left_elbow', 'left_wrist'] },
    tricep_ext:      { label: 'Tricep Extension',  joints: ['left_elbow', 'left_shoulder'] },
    lunge:           { label: 'Lunge',             joints: ['left_knee', 'left_hip', 'left_ankle'] },
    pullup:          { label: 'Pull-up',           joints: ['left_shoulder', 'left_elbow', 'back'] },
    pushup:          { label: 'Push-up',           joints: ['left_elbow', 'left_shoulder', 'left_wrist'] },
    row:             { label: 'Barbell Row',       joints: ['back', 'left_elbow', 'left_shoulder'] },
    plank:           { label: 'Plank',             joints: ['back', 'left_hip', 'left_shoulder'] },
    leg_press:       { label: 'Leg Press',         joints: ['left_knee', 'left_hip', 'left_ankle'] },
    calf_raise:      { label: 'Calf Raise',        joints: ['left_ankle', 'left_knee'] },
    lat_pulldown:    { label: 'Lat Pulldown',      joints: ['left_shoulder', 'left_elbow', 'back'] },
    leg_curl:        { label: 'Leg Curl',          joints: ['left_knee', 'left_hip'] },
    shoulder_raise:  { label: 'Lateral Raise',     joints: ['left_shoulder', 'left_elbow'] },
    hip_thrust:      { label: 'Hip Thrust',        joints: ['left_hip', 'back', 'left_knee'] },
};

const EXERCISE_KEYS = Object.keys(EXERCISE_MAP);

// ──────────────────────────────────────────────

function Chart({ jointId, exerciseId }: { jointId: string; exerciseId: string }) {
    const meta = JOINT_META[jointId];
    const angles = EXERCISE_ANGLES[exerciseId]?.[jointId];
    if (!meta || !angles) return null;

    const [restAngle, peakAngle] = angles;
    const seed = jointId.length * 137 + exerciseId.length * 53;
    const reps = 4;
    const path = generatePath(restAngle, peakAngle, meta.yMin, meta.yMax, reps, seed);
    const yMid = Math.round((meta.yMin + meta.yMax) / 2);

    return (
        <View className="bg-black p-3 border-b border-zinc-800">
            <View className="flex-row items-center justify-between mb-2 px-1">
                <Text className="text-white text-sm font-semibold">{meta.label}</Text>
                <Text className="text-zinc-600 text-[9px] font-mono">{meta.yMin}° — {meta.yMax}°</Text>
            </View>
            <View className="flex-row">
                <View className="justify-between items-end pr-1.5 py-0.5" style={{ width: 36 }}>
                    <Text className="text-zinc-500 text-[8px] font-mono">{meta.yMax}°</Text>
                    <Text className="text-zinc-500 text-[8px] font-mono">{yMid}°</Text>
                    <Text className="text-zinc-500 text-[8px] font-mono">{meta.yMin}°</Text>
                </View>
                <View className="flex-1 h-28 border-l border-b border-zinc-700 bg-zinc-950/50 rounded-sm overflow-hidden">
                    <Svg height="100%" width="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                        <Defs>
                            <SvgGradient id={`grad_${jointId}`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#38bdf8" stopOpacity="0.15" />
                                <Stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                            </SvgGradient>
                        </Defs>
                        {/* Grid lines */}
                        <Line x1="0" y1="25" x2="400" y2="25" stroke="#222" strokeWidth="0.4" strokeDasharray="4,4" />
                        <Line x1="0" y1="50" x2="400" y2="50" stroke="#333" strokeWidth="0.4" strokeDasharray="4,4" />
                        <Line x1="0" y1="75" x2="400" y2="75" stroke="#222" strokeWidth="0.4" strokeDasharray="4,4" />
                        <Line x1="100" y1="0" x2="100" y2="100" stroke="#1a1a1a" strokeWidth="0.4" />
                        <Line x1="200" y1="0" x2="200" y2="100" stroke="#1a1a1a" strokeWidth="0.4" />
                        <Line x1="300" y1="0" x2="300" y2="100" stroke="#1a1a1a" strokeWidth="0.4" />
                        {/* Area fill under curve */}
                        <Path d={path + ` L400,100 L0,100 Z`} fill={`url(#grad_${jointId})`} />
                        {/* Data line */}
                        <Path d={path} stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </View>
            </View>
            <View className="flex-row justify-between mt-0.5" style={{ marginLeft: 36 }}>
                <Text className="text-zinc-600 text-[7px] font-mono">0s</Text>
                <Text className="text-zinc-600 text-[7px] font-mono">3s</Text>
                <Text className="text-zinc-600 text-[7px] font-mono">6s</Text>
                <Text className="text-zinc-600 text-[7px] font-mono">9s</Text>
                <Text className="text-zinc-600 text-[7px] font-mono">12s</Text>
            </View>
        </View>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const { videoUri, videoId } = useLocalSearchParams<{ videoUri?: string; videoId?: string }>();

    // Kill any lingering camera streams when dashboard is displayed
    useFocusEffect(
        useCallback(() => {
            killAllCameraStreams();
        }, [])
    );

    const [selectedExercise, setSelectedExercise] = useState('squat');
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(videoUri || null);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(videoId || null);

    // Video history state
    const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch presigned URL from MinIO if videoId is provided
    useEffect(() => {
        if (videoId) {
            getVideoUrl(videoId).then(url => {
                if (url) setResolvedVideoUrl(url);
                else console.warn('Could not fetch video from MinIO, falling back to local URI');
            });
        } else if (videoUri) {
            setResolvedVideoUrl(videoUri);
        }
    }, [videoId, videoUri]);

    // Fetch saved videos on mount
    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        const videos = await listVideos();
        setSavedVideos(videos);
        setLoadingHistory(false);
    }, []);

    useEffect(() => { fetchHistory(); }, []);

    // Load a video from history
    const handleLoadVideo = useCallback(async (vid: VideoItem) => {
        const url = await getVideoUrl(vid.videoId);
        if (url) {
            setResolvedVideoUrl(url);
            setActiveVideoId(vid.videoId);
            setShowHistory(false);
        }
    }, []);

    // Delete a video from history
    const handleDeleteVideo = useCallback(async (vid: VideoItem) => {
        const success = await deleteVideo(vid.videoId);
        if (success) {
            setSavedVideos(prev => prev.filter(v => v.videoId !== vid.videoId));
            if (activeVideoId === vid.videoId) {
                setResolvedVideoUrl(null);
                setActiveVideoId(null);
            }
        }
    }, [activeVideoId]);

    // expo-video player
    const player = useVideoPlayer(resolvedVideoUrl, player => {
        player.loop = true;
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

    // Track position/duration via timer (smooth, 4x/sec)
    const [positionMs, setPositionMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        trackingRef.current = setInterval(() => {
            if (player) {
                setPositionMs(Math.floor((player.currentTime || 0) * 1000));
                setDurationMs(Math.floor((player.duration || 0) * 1000));
            }
        }, 250);
        return () => { if (trackingRef.current) clearInterval(trackingRef.current); };
    }, [player]);

    const exercise = EXERCISE_MAP[selectedExercise];
    const activeJoints = exercise.joints;

    const togglePlayback = useCallback(() => {
        if (!player) return;
        if (player.playing) player.pause();
        else player.play();
    }, [player]);

    const skipBackward = useCallback(() => {
        if (!player) return;
        player.currentTime = Math.max(0, (player.currentTime || 0) - 5);
    }, [player]);

    const skipForward = useCallback(() => {
        if (!player) return;
        player.currentTime = Math.min(player.duration || 0, (player.currentTime || 0) + 5);
    }, [player]);

    const formatTime = (ms: number) => {
        const t = Math.floor(ms / 1000);
        return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
    };

    const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    const handleShare = async () => {
        try {
            if (Platform.OS === 'web') {
                if (navigator.share) { await navigator.share({ title: 'LiftLens', text: `${exercise.label} analysis` }); }
                else { Alert.alert('Share', `${exercise.label} analysis`); }
            } else {
                await Share.share({ message: `LiftLens: ${exercise.label} analysis` });
            }
        } catch { /* cancelled */ }
    };

    // Seek when tapping the progress bar
    const handleSeek = useCallback((e: any) => {
        if (!player || durationMs <= 0) return;
        const nativeEvent = e.nativeEvent;
        const tapX = nativeEvent.locationX || nativeEvent.offsetX || 0;
        const barWidth = nativeEvent.target?.offsetWidth || nativeEvent.layout?.width || 200;
        const pct = Math.max(0, Math.min(1, tapX / barWidth));
        player.currentTime = (pct * durationMs) / 1000;
    }, [player, durationMs]);

    // ── Shared components ──

    const ControlsBar = () => (
        <View className="flex-row items-center px-3 py-2 bg-zinc-950 border-t border-zinc-800">
            <TouchableOpacity onPress={skipBackward} activeOpacity={0.6} className="w-8 h-8 bg-zinc-800 rounded items-center justify-center mr-1.5">
                <Text className="text-zinc-400 text-[9px] font-bold">-5s</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlayback} activeOpacity={0.6} className="w-8 h-8 bg-zinc-800 rounded items-center justify-center">
                <Ionicons name={isPlaying ? "pause" : "play"} size={14} color="#fff" style={{ marginLeft: isPlaying ? 0 : 1 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={skipForward} activeOpacity={0.6} className="w-8 h-8 bg-zinc-800 rounded items-center justify-center ml-1.5">
                <Text className="text-zinc-400 text-[9px] font-bold">+5s</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={handleSeek}
                activeOpacity={0.8}
                className="flex-1 mx-3 h-4 justify-center"
            >
                <View className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                </View>
            </TouchableOpacity>
            <Text className="text-zinc-500 font-mono text-[10px]">{formatTime(positionMs)} / {formatTime(durationMs)}</Text>
        </View>
    );

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Format date
    const formatDate = (iso: string | null) => {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    };

    const Header = () => (
        <View className="flex-row items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-black">
            <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => router.replace('/')} className="w-8 h-8 bg-zinc-900 rounded items-center justify-center">
                    <Feather name="arrow-left" size={16} color="#aaa" />
                </TouchableOpacity>
                <Text className="text-white font-semibold text-sm">Exercise Analysis</Text>
            </View>
            <View className="flex-row items-center gap-3">
                <TouchableOpacity
                    onPress={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
                    className={`w-8 h-8 rounded items-center justify-center ${showHistory ? 'bg-indigo-500' : 'bg-zinc-900'}`}
                >
                    <Feather name="film" size={14} color={showHistory ? '#fff' : '#aaa'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} className="w-8 h-8 bg-zinc-900 rounded items-center justify-center">
                    <Feather name="share" size={14} color="#aaa" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const VideoHistory = () => {
        if (!showHistory) return null;
        return (
            <View className="bg-[#111] border-b border-zinc-800">
                <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-row items-center gap-2">
                        <Feather name="clock" size={14} color="#818cf8" />
                        <Text className="text-white font-semibold text-sm">Saved Videos</Text>
                    </View>
                    <Text className="text-zinc-600 text-[10px] font-mono">{savedVideos.length} videos</Text>
                </View>
                {loadingHistory ? (
                    <View className="px-4 pb-4 items-center">
                        <Text className="text-zinc-600 text-xs">Loading...</Text>
                    </View>
                ) : savedVideos.length === 0 ? (
                    <View className="px-4 pb-4 items-center">
                        <Text className="text-zinc-600 text-xs">No saved videos yet</Text>
                    </View>
                ) : (
                    <ScrollView style={{ maxHeight: 240 }} className="px-3 pb-3">
                        {savedVideos.map((vid) => {
                            const isActive = activeVideoId === vid.videoId;
                            return (
                                <View
                                    key={vid.videoId}
                                    className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 mb-1.5 ${
                                        isActive ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-zinc-900/50'
                                    }`}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleLoadVideo(vid)}
                                        className="flex-1 flex-row items-center gap-2.5"
                                        activeOpacity={0.7}
                                    >
                                        <View className={`w-8 h-8 rounded items-center justify-center ${
                                            isActive ? 'bg-indigo-500/25' : 'bg-zinc-800'
                                        }`}>
                                            <Feather
                                                name={isActive ? 'play' : 'film'}
                                                size={14}
                                                color={isActive ? '#818cf8' : '#666'}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-xs font-medium ${isActive ? 'text-indigo-300' : 'text-zinc-300'}`} numberOfLines={1}>
                                                {vid.objectName}
                                            </Text>
                                            <Text className="text-zinc-600 text-[9px] font-mono mt-0.5">
                                                {formatSize(vid.size)} · {vid.extension.toUpperCase()} · {formatDate(vid.uploadedAt)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteVideo(vid)}
                                        className="w-7 h-7 rounded items-center justify-center ml-2"
                                        activeOpacity={0.6}
                                    >
                                        <Feather name="trash-2" size={12} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        );
    };

    // Exercise selector dropdown
    const ExercisePicker = () => (
        <View className="bg-black border-b border-zinc-800">
            <TouchableOpacity
                onPress={() => setShowExercisePicker(!showExercisePicker)}
                className="flex-row items-center justify-between px-4 py-3"
            >
                <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="dumbbell" size={16} color="#818cf8" />
                    <Text className="text-white text-sm font-semibold">{exercise.label}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <Text className="text-zinc-600 text-[10px]">{activeJoints.length} joints tracked</Text>
                    <Feather name={showExercisePicker ? "chevron-up" : "chevron-down"} size={14} color="#666" />
                </View>
            </TouchableOpacity>

            {showExercisePicker && (
                <View className="px-3 pb-3">
                    <View className="flex-row flex-wrap gap-1.5">
                        {EXERCISE_KEYS.map((key) => {
                            const ex = EXERCISE_MAP[key];
                            const isActive = key === selectedExercise;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => { setSelectedExercise(key); setShowExercisePicker(false); }}
                                    className={`px-3 py-1.5 rounded-md ${isActive ? 'bg-indigo-500' : 'bg-zinc-900'}`}
                                >
                                    <Text className={`text-xs ${isActive ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                                        {ex.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );

    const RepStats = () => (
        <View className="bg-black p-4 border-b border-zinc-800">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white font-semibold text-sm">Rep Counter</Text>
                <View className="bg-indigo-500/15 px-3 py-1 rounded-md">
                    <Text className="text-indigo-400 font-mono font-bold text-sm">0 reps</Text>
                </View>
            </View>
            <View className="gap-2">
                <View className="flex-row items-center justify-between">
                    <Text className="text-zinc-400 text-xs">Avg rep time:</Text>
                    <Text className="text-white font-mono text-xs">--</Text>
                </View>
                <View className="flex-row items-center justify-between">
                    <Text className="text-zinc-400 text-xs">Fastest:</Text>
                    <Text className="text-white font-mono text-xs">--</Text>
                </View>
                <View className="flex-row items-center justify-between">
                    <Text className="text-zinc-400 text-xs">Slowest:</Text>
                    <Text className="text-white font-mono text-xs">--</Text>
                </View>
            </View>
        </View>
    );

    const Assessment = () => (
        <View className="bg-black p-4 border-b border-zinc-800">
            <View className="flex-row items-center gap-2 mb-2">
                <View className="w-6 h-6 rounded-full bg-green-600 items-center justify-center">
                    <Feather name="check" size={14} color="#fff" />
                </View>
                <Text className="text-green-400 text-sm font-semibold">Good Form</Text>
            </View>
            <Text className="text-zinc-500 text-xs leading-relaxed">
                Sit back into your hips before breaking at the knees. Keep the load centered over mid-foot.
            </Text>
        </View>
    );

    // Charts — only joints relevant to the selected exercise
    const Charts = () => (
        <>
            {activeJoints.map((jointId) => (
                <Chart key={jointId} jointId={jointId} exerciseId={selectedExercise} />
            ))}
        </>
    );

    // ── DESKTOP ──
    if (isDesktop) {
        return (
            <SafeAreaView className="flex-1 bg-black">
                <Header />
                <VideoHistory />
                <View className="flex-1 flex-row">
                    {/* LEFT: Video + controls */}
                    <View className="flex-1 bg-zinc-950">
                        <ScrollView className="flex-1">
                            {resolvedVideoUrl ? (
                                <VideoView
                                    player={player}
                                    style={{ width: '100%', aspectRatio: 16 / 9 }}
                                    contentFit="contain"
                                    nativeControls={false}
                                />
                            ) : (
                                <View className="w-full bg-zinc-950 items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
                                    <MaterialCommunityIcons name="camera-metering-matrix" size={48} color="#555" style={{ opacity: 0.2 }} />
                                    <Text className="text-zinc-700 mt-2 font-mono text-[9px] uppercase tracking-widest">Video Feed</Text>
                                </View>
                            )}
                            <ControlsBar />
                        </ScrollView>
                    </View>

                    {/* RIGHT: Exercise picker → stats → charts */}
                    <ScrollView className="flex-1 border-l border-zinc-800" contentContainerStyle={{ paddingBottom: 20 }}>
                        <ExercisePicker />
                        <RepStats />
                        <Assessment />
                        <Charts />
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    // ── MOBILE ──
    return (
        <SafeAreaView className="flex-1 bg-black">
            <Header />
            <VideoHistory />
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="bg-zinc-950">
                    {resolvedVideoUrl ? (
                        <VideoView
                            player={player}
                            style={{ width: '100%', aspectRatio: 16 / 9 }}
                            contentFit="contain"
                            nativeControls={false}
                        />
                    ) : (
                        <View className="w-full bg-zinc-950 items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
                            <MaterialCommunityIcons name="camera-metering-matrix" size={36} color="#555" style={{ opacity: 0.2 }} />
                            <Text className="text-zinc-700 mt-1 font-mono text-[9px] uppercase">Video Feed</Text>
                        </View>
                    )}
                    <ControlsBar />
                </View>
                <ExercisePicker />
                <RepStats />
                <Assessment />
                <Charts />
            </ScrollView>
        </SafeAreaView>
    );
}

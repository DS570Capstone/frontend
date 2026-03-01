import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, View, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { killAllCameraStreams, registerCameraStream } from '../utils/cameraCleanup';
import '../src/global.css';

const isWeb = Platform.OS === 'web';

export default function LiveCamera() {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const router = useRouter();

  // Preview playback state
  const [previewPos, setPreviewPos] = useState(0);
  const [previewDur, setPreviewDur] = useState(0);

  // Native camera ref
  const cameraRef = useRef<CameraView>(null);

  // Web-only refs
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<View>(null);

  // Shared refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allPermissionsGranted = isWeb
    ? camPermission?.granted
    : camPermission?.granted && micPermission?.granted;

  // ── Comprehensive camera killer (web only) ──
  const killCamera = useCallback(() => {
    if (isWeb) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
        mediaRecorderRef.current = null;
      }
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
        liveVideoRef.current.remove();
        liveVideoRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      registerCameraStream(null);
      killAllCameraStreams();
    }
    setCameraReady(false);
    setCameraActive(false);
  }, []);

  // Request both permissions
  const handleRequestPermissions = useCallback(async () => {
    await requestCamPermission();
    if (!isWeb) {
      await requestMicPermission();
    }
  }, [requestCamPermission, requestMicPermission]);

  // Auto-activate camera once permissions are granted
  useEffect(() => {
    if (allPermissionsGranted && !recordingDone) {
      setCameraActive(true);
      if (!isWeb) setCameraReady(true);
    }
  }, [allPermissionsGranted]);

  // ── Kill camera when leaving this screen ──
  useFocusEffect(
    useCallback(() => {
      return () => {
        killCamera();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
    }, [killCamera])
  );

  // ── Web: attach live camera stream ──
  useEffect(() => {
    if (!isWeb || !cameraActive || recordingDone) return;

    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        registerCameraStream(stream);

        const container = (containerRef.current as any);
        if (container) {
          const domNode: HTMLElement = container._nativeTag || container;
          if (domNode && domNode.appendChild) {
            const old = domNode.querySelector('video.live-preview');
            if (old) old.remove();

            const vid = document.createElement('video');
            vid.className = 'live-preview';
            vid.autoplay = true;
            vid.playsInline = true;
            vid.muted = true;
            vid.srcObject = stream;
            vid.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';
            domNode.style.position = 'relative';
            domNode.appendChild(vid);
            liveVideoRef.current = vid;
            setCameraReady(true);
          }
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    };

    const timeout = setTimeout(startCamera, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
        liveVideoRef.current.remove();
        liveVideoRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        registerCameraStream(null);
      }
      setCameraReady(false);
    };
  }, [cameraActive, recordingDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      killCamera();
    };
  }, [killCamera]);

  // Timer for elapsed seconds
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const fmtMs = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`; };
  const previewProgress = previewDur > 0 ? (previewPos / previewDur) * 100 : 0;

  // expo-video player for preview
  const previewPlayer = useVideoPlayer(recordedUri, player => {
    player.loop = true;
  });
  const { isPlaying: previewPlaying } = useEvent(previewPlayer, 'playingChange', { isPlaying: previewPlayer.playing });

  // Track preview position via timer
  const previewTrackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (recordingDone && previewPlayer) {
      previewTrackRef.current = setInterval(() => {
        setPreviewPos(Math.floor((previewPlayer.currentTime || 0) * 1000));
        setPreviewDur(Math.floor((previewPlayer.duration || 0) * 1000));
      }, 250);
    }
    return () => { if (previewTrackRef.current) clearInterval(previewTrackRef.current); };
  }, [recordingDone, previewPlayer]);

  // ── START RECORDING ──
  const handleStartRecording = useCallback(async () => {
    if (isWeb) {
      if (!streamRef.current) return;
      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUri(url);
        setRecordingDone(true);
        setCameraActive(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } else {
      if (!cameraRef.current) return;
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync();
        if (video?.uri) {
          setRecordedUri(video.uri);
          setRecordingDone(true);
          setCameraActive(false);
        }
      } catch (err) {
        console.error('Native recording error:', err);
      }
      setIsRecording(false);
    }
  }, []);

  // ── STOP RECORDING ──
  const handleStopRecording = useCallback(() => {
    if (isWeb) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      setIsRecording(false);
    } else {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
    }
  }, []);

  // ── TOGGLE RECORD ──
  const handleRecordPress = useCallback(() => {
    if (isRecording) handleStopRecording();
    else handleStartRecording();
  }, [isRecording, handleStartRecording, handleStopRecording]);

  // ── FLIP CAMERA ──
  const handleFlipCamera = useCallback(() => {
    setFacing(f => f === 'back' ? 'front' : 'back');
  }, []);

  // ── PREVIEW CONTROLS ──
  const togglePreview = useCallback(() => {
    if (!previewPlayer) return;
    if (previewPlayer.playing) previewPlayer.pause();
    else previewPlayer.play();
  }, [previewPlayer]);

  const handlePreviewSeek = useCallback((e: any) => {
    if (!previewPlayer || previewDur <= 0) return;
    const nativeEvent = e.nativeEvent;
    const tapX = nativeEvent.locationX || nativeEvent.offsetX || 0;
    const barWidth = nativeEvent.target?.offsetWidth || nativeEvent.layout?.width || 200;
    const pct = Math.max(0, Math.min(1, tapX / barWidth));
    previewPlayer.currentTime = (pct * previewDur) / 1000;
  }, [previewPlayer, previewDur]);

  // ── RECORD AGAIN ──
  const handleRecordAgain = useCallback(() => {
    if (recordedUri && isWeb) URL.revokeObjectURL(recordedUri);
    setRecordedUri(null);
    setRecordingDone(false);
    setIsRecording(false);
    setPreviewPos(0);
    setPreviewDur(0);
    setElapsed(0);
    setCameraActive(true);
    if (!isWeb) setCameraReady(true);
  }, [recordedUri]);

  // ── VIEW ANALYSIS ──
  const handleViewAnalysis = useCallback(() => {
    router.push(recordedUri
      ? { pathname: '/dashboard', params: { videoUri: recordedUri } }
      : '/dashboard'
    );
  }, [recordedUri, router]);

  if (!camPermission) return <View className="flex-1 bg-[#09090b]" />;

  // ── PERMISSION PROMPT ──
  if (!allPermissionsGranted) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b] items-center justify-center px-6" edges={['top', 'bottom']}>
        <View className="bg-[#171717] rounded-2xl p-8 items-center w-full max-w-xs">
          <View className="w-12 h-12 bg-indigo-500/15 rounded-xl items-center justify-center mb-5">
            <Feather name="camera" size={24} color="#818cf8" />
          </View>
          <Text className="text-white text-lg font-bold text-center mb-1">Camera & Mic Access</Text>
          <Text className="text-zinc-600 text-xs text-center mb-6 leading-relaxed">
            Camera and microphone access needed for recording.
          </Text>
          <TouchableOpacity onPress={handleRequestPermissions} className="bg-indigo-500 py-3 px-6 rounded-xl w-full items-center">
            <Text className="text-white font-semibold text-sm">Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="mt-3 py-1.5">
            <Text className="text-zinc-600 text-xs">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PREVIEW SCREEN (camera is OFF) ──
  if (recordingDone && !cameraActive) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b] items-center justify-center px-4" edges={['top', 'bottom']}>
        <View className="bg-[#171717] rounded-2xl overflow-hidden w-full" style={{ maxWidth: 480 }}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-800/50">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 bg-green-500/15 rounded-lg items-center justify-center">
                <Feather name="check" size={14} color="#22c55e" />
              </View>
              <Text className="text-white font-semibold text-sm">Preview</Text>
            </View>
            <Text className="text-zinc-600 font-mono text-[10px]">{fmt(elapsed)} recorded</Text>
          </View>

          {recordedUri ? (
            <View>
              <VideoView
                player={previewPlayer}
                style={{ width: '100%', aspectRatio: 16 / 9 }}
                contentFit="contain"
                nativeControls={false}
              />
              <View className="flex-row items-center px-3 py-2 bg-[#111] border-t border-zinc-800/50">
                <TouchableOpacity onPress={togglePreview} activeOpacity={0.6} className="w-7 h-7 bg-zinc-800 rounded items-center justify-center">
                  <Ionicons name={previewPlaying ? "pause" : "play"} size={12} color="#fff" style={{ marginLeft: previewPlaying ? 0 : 1 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePreviewSeek} activeOpacity={0.8} className="flex-1 mx-2.5 h-3.5 justify-center">
                  <View className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${previewProgress}%` }} />
                  </View>
                </TouchableOpacity>
                <Text className="text-zinc-600 font-mono text-[9px]">{fmtMs(previewPos)} / {fmtMs(previewDur)}</Text>
              </View>
            </View>
          ) : (
            <View className="items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
              <Feather name="film" size={32} color="#333" />
              <Text className="text-zinc-700 mt-2 text-[10px]">No preview available</Text>
            </View>
          )}

          <View className="p-4 gap-2.5">
            <TouchableOpacity onPress={handleViewAnalysis} className="bg-indigo-500 py-3 rounded-xl items-center flex-row justify-center gap-2">
              <Feather name="bar-chart-2" size={15} color="#fff" />
              <Text className="text-white font-semibold text-sm">View Analysis</Text>
            </TouchableOpacity>
            <View className="flex-row gap-2.5">
              <TouchableOpacity onPress={handleRecordAgain} className="flex-1 bg-zinc-800 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5">
                <Feather name="refresh-cw" size={12} color="#aaa" />
                <Text className="text-zinc-300 font-semibold text-xs">Record Again</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} className="flex-1 bg-zinc-800/50 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5">
                <Feather name="x" size={12} color="#666" />
                <Text className="text-zinc-500 font-semibold text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── CAMERA VIEW ──
  // Shared overlay (absolute positioned so it works on top of CameraView without being a child)
  const overlay = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity onPress={() => { killCamera(); router.back(); }} className="w-9 h-9 bg-black/40 rounded-lg items-center justify-center">
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>
          <View className="bg-indigo-500/20 px-3 py-1 rounded-full flex-row items-center gap-1.5">
            <View className={`w-1.5 h-1.5 rounded-full ${cameraReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <Text className="text-indigo-300 font-mono text-[9px] uppercase tracking-widest font-bold">
              {cameraReady ? 'Live' : 'Loading...'}
            </Text>
          </View>
          <View className="w-9" />
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Recording timer */}
        {isRecording && (
          <View className="items-center mb-4">
            <View className="bg-red-500/90 px-4 py-2 rounded-lg flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-white" />
              <Text className="text-white font-bold text-sm font-mono">{fmt(elapsed)}</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View className="px-10 pb-10 flex-row items-center justify-between">
          <View className="items-center">
            <TouchableOpacity className="w-11 h-11 rounded-full bg-black/30 items-center justify-center">
              <Ionicons name="flash-off" size={18} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white/30 text-[8px] mt-1 uppercase tracking-widest">Auto</Text>
          </View>

          <TouchableOpacity
            onPress={handleRecordPress}
            disabled={!cameraReady}
            className={`rounded-full items-center justify-center border-4 ${isRecording ? 'border-red-500/50' : 'border-white/20'}`}
            style={{ width: 68, height: 68, opacity: cameraReady ? 1 : 0.4 }}
          >
            {isRecording ? (
              <View className="bg-red-500 rounded-lg items-center justify-center" style={{ width: 28, height: 28 }} />
            ) : (
              <View className="bg-white rounded-full items-center justify-center" style={{ width: 50, height: 50 }}>
                <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </View>
            )}
          </TouchableOpacity>

          <View className="items-center">
            <TouchableOpacity onPress={handleFlipCamera} className="w-11 h-11 rounded-full bg-black/30 items-center justify-center">
              <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white/30 text-[8px] mt-1 uppercase tracking-widest">Flip</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );

  if (isWeb) {
    // Web: custom <video> element + overlay
    return (
      <View className="flex-1 bg-[#09090b]">
        <View ref={containerRef as any} style={{ flex: 1, backgroundColor: '#000' }}>
          {overlay}
        </View>
      </View>
    );
  }

  // Native: CameraView + absolute overlay (no children inside CameraView)
  return (
    <View className="flex-1 bg-[#09090b]">
      {cameraActive && (
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mode="video"
            onCameraReady={() => setCameraReady(true)}
          />
          {overlay}
        </View>
      )}
    </View>
  );
}

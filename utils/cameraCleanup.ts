// Utility to kill ALL active camera streams on web.
// Call this from any page that shouldn't have the camera running.
import { Platform } from 'react-native';

export function killAllCameraStreams() {
  if (Platform.OS !== 'web') return;

  // 1. Stop all video elements with live srcObject streams
  const videos = document.querySelectorAll('video');
  videos.forEach((vid) => {
    if (vid.srcObject && vid.srcObject instanceof MediaStream) {
      vid.srcObject.getTracks().forEach((t) => t.stop());
      vid.srcObject = null;
    }
    // Remove live-preview videos injected by the camera page
    if (vid.classList.contains('live-preview')) {
      vid.remove();
    }
  });

  // 2. If there's a global stream ref, stop it
  if ((globalThis as any).__liftlens_stream) {
    const stream = (globalThis as any).__liftlens_stream as MediaStream;
    stream.getTracks().forEach((t) => t.stop());
    (globalThis as any).__liftlens_stream = null;
  }
}

// Register the active stream globally so other pages can kill it
export function registerCameraStream(stream: MediaStream | null) {
  if (Platform.OS !== 'web') return;
  (globalThis as any).__liftlens_stream = stream;
}

import { Platform } from 'react-native';

// The Python Flask API server URL
// In development, Expo web runs on 8080 and Flask on 5050
const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5050'
  : 'http://localhost:5050'; // For native, use your machine's local IP if testing on device

/**
 * Upload a recorded video to MinIO via the Flask API.
 *
 * @param blobUrlOrUri - On web: a blob URL from MediaRecorder. On native: a file URI from CameraView.
 * @returns The video ID assigned by the server, or null if upload failed.
 */
export async function uploadVideoToMinio(blobUrlOrUri: string): Promise<string | null> {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: fetch the blob from the blob URL and attach it
      const response = await fetch(blobUrlOrUri);
      const blob = await response.blob();
      formData.append('video', blob, 'recording.webm');
    } else {
      // Native: use the file URI directly
      // React Native's FormData accepts { uri, type, name } objects
      formData.append('video', {
        uri: blobUrlOrUri,
        type: 'video/mp4',
        name: 'recording.mp4',
      } as any);
    }

    console.log('Uploading video to MinIO...');

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Upload failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    console.log('Upload successful:', data);
    return data.videoId;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

/**
 * Get a presigned playback URL for a video stored in MinIO.
 *
 * @param videoId - The video ID returned from uploadVideoToMinio.
 * @returns The presigned URL for playback, or null if retrieval failed.
 */
export async function getVideoUrl(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/video/${videoId}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error('Video retrieval failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error('Video retrieval error:', error);
    return null;
  }
}

/**
 * List all videos stored in MinIO.
 *
 * @returns Array of video metadata objects, or empty array on failure.
 */
export interface VideoItem {
  videoId: string;
  objectName: string;
  size: number;
  extension: string;
  uploadedAt: string | null;
}

export async function listVideos(): Promise<VideoItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/videos`);

    if (!res.ok) {
      console.error('List videos failed:', res.status);
      return [];
    }

    const data = await res.json();
    return data.videos || [];
  } catch (error) {
    console.error('List videos error:', error);
    return [];
  }
}

/**
 * Delete a video from MinIO.
 *
 * @param videoId - The video ID to delete.
 * @returns true if deleted successfully, false otherwise.
 */
export async function deleteVideo(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/video/${videoId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (error) {
    console.error('Delete video error:', error);
    return false;
  }
}

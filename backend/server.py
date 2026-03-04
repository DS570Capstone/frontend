import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from minio import Minio
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from Expo app

# ── MinIO Client ──
minio_client = Minio(
    endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
    secure=os.getenv("MINIO_USE_SSL", "false").lower() == "true",
)

BUCKET_NAME = os.getenv("MINIO_BUCKET", "videos")


def ensure_bucket():
    """Create the videos bucket if it doesn't exist."""
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)
        print(f"Created MinIO bucket: {BUCKET_NAME}")


# Ensure bucket exists on startup
ensure_bucket()


@app.route("/api/upload", methods=["POST"])
def upload_video():
    """
    Upload a video file to MinIO.
    Expects a multipart form with a 'video' file field.
    Returns the video ID for later retrieval.
    """
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Generate unique ID and determine extension
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
    video_id = str(uuid.uuid4())
    object_name = f"{video_id}.{ext}"

    # Read file data
    file_data = file.read()
    file_size = len(file_data)

    # Upload to MinIO
    from io import BytesIO

    minio_client.put_object(
        BUCKET_NAME,
        object_name,
        BytesIO(file_data),
        length=file_size,
        content_type=file.content_type or "video/webm",
    )

    print(f"Uploaded video: {object_name} ({file_size} bytes)")

    return jsonify({
        "videoId": video_id,
        "objectName": object_name,
        "size": file_size,
    }), 200


@app.route("/api/video/<video_id>", methods=["GET"])
def get_video(video_id):
    """
    Get a presigned URL for a video stored in MinIO.
    Tries common video extensions to find the file.
    Returns a presigned URL valid for 1 hour.
    """
    extensions = ["webm", "mp4", "mov"]
    object_name = None

    for ext in extensions:
        candidate = f"{video_id}.{ext}"
        try:
            minio_client.stat_object(BUCKET_NAME, candidate)
            object_name = candidate
            break
        except Exception:
            continue

    if not object_name:
        return jsonify({"error": "Video not found"}), 404

    # Generate presigned URL (1 hour)
    from datetime import timedelta

    presigned_url = minio_client.presigned_get_object(
        BUCKET_NAME,
        object_name,
        expires=timedelta(hours=1),
    )

    return jsonify({
        "videoId": video_id,
        "url": presigned_url,
        "objectName": object_name,
    }), 200


@app.route("/api/videos", methods=["GET"])
def list_videos():
    """
    List all videos stored in MinIO.
    Returns video metadata including name, size, and upload time.
    """
    try:
        objects = minio_client.list_objects(BUCKET_NAME)
        videos = []
        for obj in objects:
            # Extract video ID from object name (remove extension)
            name = obj.object_name
            video_id = name.rsplit(".", 1)[0] if "." in name else name
            ext = name.rsplit(".", 1)[-1] if "." in name else ""
            videos.append({
                "videoId": video_id,
                "objectName": name,
                "size": obj.size,
                "extension": ext,
                "uploadedAt": obj.last_modified.isoformat() if obj.last_modified else None,
            })

        # Sort by upload time, newest first
        videos.sort(key=lambda v: v["uploadedAt"] or "", reverse=True)

        return jsonify({"videos": videos, "count": len(videos)}), 200
    except Exception as e:
        print(f"List videos error: {e}")
        return jsonify({"error": "Failed to list videos", "details": str(e)}), 500


@app.route("/api/video/<video_id>", methods=["DELETE"])
def delete_video(video_id):
    """Delete a video from MinIO."""
    extensions = ["webm", "mp4", "mov"]
    for ext in extensions:
        candidate = f"{video_id}.{ext}"
        try:
            minio_client.stat_object(BUCKET_NAME, candidate)
            minio_client.remove_object(BUCKET_NAME, candidate)
            print(f"Deleted video: {candidate}")
            return jsonify({"deleted": candidate}), 200
        except Exception:
            continue
    return jsonify({"error": "Video not found"}), 404


@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "ok", "bucket": BUCKET_NAME}), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5050))
    print(f"Starting MinIO API server on port {port}...")
    print(f"MinIO endpoint: {os.getenv('MINIO_ENDPOINT', 'localhost:9000')}")
    print(f"Bucket: {BUCKET_NAME}")
    app.run(host="0.0.0.0", port=port, debug=True)

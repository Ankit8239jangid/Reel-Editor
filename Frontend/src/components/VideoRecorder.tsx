import React, { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideo } from '../api/client';
import { Video } from '../types';

interface VideoRecorderProps {
  onVideoRecorded: (video: Video) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onVideoRecorded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (err: any) {
      setError('Could not access camera. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordedBlob(null);
    setTimer(0);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setIsPreviewing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
        videoRef.current.play();
      }
    };

    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopCamera();
    }
  }, [isRecording, stopCamera]);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setIsPreviewing(false);
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    startCamera();
  }, [startCamera]);

  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const file = new File([recordedBlob], `recording_${Date.now()}.webm`, {
        type: 'video/webm',
      });
      const video = await uploadVideo(file, (p) => setUploadProgress(p));
      onVideoRecorded(video);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [recordedBlob, onVideoRecorded]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Video Preview */}
      <div className="relative bg-dark-800 rounded-2xl overflow-hidden aspect-[9/16] max-h-[400px] mx-auto">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          loop={isPreviewing}
        />

        {/* No camera state */}
        {!isCameraOn && !isPreviewing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800">
            <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-dark-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-dark-200 text-sm">Camera is off</p>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-dark-900/80 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-mono text-sm font-medium">{formatTime(timer)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-3">
        {!isCameraOn && !isPreviewing && (
          <button onClick={startCamera} className="btn-primary flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Start Camera</span>
          </button>
        )}

        {isCameraOn && !isRecording && (
          <>
            <button onClick={startRecording} className="btn-primary flex items-center space-x-2 !bg-red-500 !from-red-500 !to-red-600 hover:!from-red-400 hover:!to-red-500">
              <div className="w-4 h-4 rounded-full bg-white" />
              <span>Record</span>
            </button>
            <button onClick={stopCamera} className="btn-secondary">
              Cancel
            </button>
          </>
        )}

        {isRecording && (
          <button onClick={stopRecording} className="btn-primary flex items-center space-x-2 !bg-red-500 !from-red-500 !to-red-600">
            <div className="w-4 h-4 rounded-sm bg-white" />
            <span>Stop Recording</span>
          </button>
        )}

        {isPreviewing && recordedBlob && (
          <>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Use This Video</span>
                </>
              )}
            </button>
            <button onClick={retake} disabled={uploading} className="btn-secondary">
              Retake
            </button>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="animate-slide-up">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadVideo } from '../api/client';
import { Video } from '../types';

interface VideoUploaderProps {
  onVideoUploaded: (video: Video) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const video = await uploadVideo(file, (p) => setProgress(p));
        onVideoUploaded(video);
        setProgress(100);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onVideoUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="animate-fade-in">
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer border-2 border-dashed rounded-2xl p-10
          transition-all duration-300 ease-out
          ${isDragActive
            ? 'dropzone-active border-primary-500 bg-primary-500/5'
            : 'border-dark-400 hover:border-dark-300 bg-dark-700/30'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {/* Upload Icon */}
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${isDragActive 
              ? 'bg-primary-500/20 scale-110' 
              : 'bg-dark-500 group-hover:bg-dark-400 group-hover:scale-105'
            }
          `}>
            <svg
              className={`w-8 h-8 transition-colors duration-300 ${
                isDragActive ? 'text-primary-400' : 'text-dark-100'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          {isDragActive ? (
            <div>
              <p className="text-primary-400 font-semibold text-lg">Drop your video here</p>
              <p className="text-dark-200 text-sm mt-1">Release to start uploading</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-semibold text-lg">
                Drag & drop your video
              </p>
              <p className="text-dark-200 text-sm mt-1">
                or <span className="text-primary-400 underline underline-offset-2">browse files</span>
              </p>
              <p className="text-dark-300 text-xs mt-3">
                MP4, MOV, WebM • Max 500MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-4 animate-slide-up">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-dark-100">Uploading...</span>
            <span className="text-primary-400 font-medium">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;

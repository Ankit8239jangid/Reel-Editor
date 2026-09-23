import React from 'react';

interface VideoPreviewModalProps {
  url: string;
  onClose: () => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-dark-900/90 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm sm:max-w-md mx-auto animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-dark-800/80 hover:bg-dark-700 text-white flex items-center justify-center transition-colors border border-dark-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video container */}
        <div className="glass-card overflow-hidden aspect-[9/16] shadow-2xl ring-1 ring-white/10">
          <video
            src={url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            playsInline
          />
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewModal;

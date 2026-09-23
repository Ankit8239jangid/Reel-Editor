import React from 'react';
import { Video, Template } from '../types';

interface PreviewPanelProps {
  selectedVideo: Video | null;
  selectedTemplate: Template | null;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ selectedVideo, selectedTemplate }) => {
  if (!selectedVideo && !selectedTemplate) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mb-4 animate-pulse-slow">
          <svg className="w-8 h-8 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-dark-200 font-medium">Preview</p>
        <p className="text-dark-300 text-sm mt-1">Select a video and template to preview</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-semibold text-white flex items-center space-x-2">
          <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Preview</span>
        </h3>
        <div className="flex items-center space-x-2">
          {selectedVideo && <span className="badge-info">Video ✓</span>}
          {selectedTemplate && <span className="badge-success">Template ✓</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Main Video Preview */}
        <div className="space-y-2">
          <p className="text-xs text-dark-200 font-medium uppercase tracking-wider">Main Video</p>
          {selectedVideo ? (
            <div className="relative bg-dark-800 rounded-xl overflow-hidden aspect-[9/16]">
              <video
                key={selectedVideo.id}
                src={`/uploads/videos/${selectedVideo.filename}`}
                className="w-full h-full object-cover"
                controls
                muted
                loop
                playsInline
              />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs bg-dark-900/80 backdrop-blur-sm rounded-lg px-2 py-1 truncate">
                  {selectedVideo.originalName}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-dark-800 rounded-xl aspect-[9/16] flex items-center justify-center">
              <p className="text-dark-300 text-xs">No video selected</p>
            </div>
          )}
        </div>

        {/* Template Preview */}
        <div className="space-y-2">
          <p className="text-xs text-dark-200 font-medium uppercase tracking-wider">Template Overlay</p>
          {selectedTemplate ? (
            <div className="relative bg-dark-800 rounded-xl overflow-hidden aspect-[9/16]">
              <video
                key={selectedTemplate.id}
                src={`/uploads/templates/${selectedTemplate.filename}`}
                className="w-full h-full object-cover"
                controls
                muted
                loop
                playsInline
              />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs bg-dark-900/80 backdrop-blur-sm rounded-lg px-2 py-1 truncate">
                  {selectedTemplate.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-dark-800 rounded-xl aspect-[9/16] flex items-center justify-center">
              <p className="text-dark-300 text-xs">No template selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;

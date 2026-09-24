import React, { useState, useEffect, useCallback } from 'react';
import VideoUploader from '../components/VideoUploader';
import VideoRecorder from '../components/VideoRecorder';
import TemplateSelector from '../components/TemplateSelector';

import RenderButton from '../components/RenderButton';
import RenderHistory from '../components/RenderHistory';
import SlideUploader from '../components/SlideUploader';
import { Video, Template, Render } from '../types';
import {
  getVideos,
  getTemplates,
  getRenders,
  deleteVideo as deleteVideoApi,
} from '../api/client';

type InputTab = 'upload' | 'record';

const EditorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [videos, setVideos] = useState<Video[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [slideImages, setSlideImages] = useState<string[]>([]);

  // Determine effective media slots (mediaSlots > legacy slideDurations)
  const effectiveMediaSlots = selectedTemplate?.mediaSlots ?? 
    (selectedTemplate?.isSlideTemplate && selectedTemplate?.slideDurations 
      ? selectedTemplate.slideDurations.map((dur, i) => ({
          slotId: `legacy-${i}`,
          order: i + 1,
          mediaType: 'image_or_video' as const,
          startTime: selectedTemplate.slideDurations!.slice(0, i).reduce((a, b) => a + b, 0),
          endTime: selectedTemplate.slideDurations!.slice(0, i + 1).reduce((a, b) => a + b, 0),
          duration: dur,
        }))
      : undefined);

  const hasMediaSlots = effectiveMediaSlots && effectiveMediaSlots.length > 0;

  // Reset slide images when template changes
  useEffect(() => {
    if (hasMediaSlots) {
      setSlideImages(new Array(effectiveMediaSlots!.length).fill(''));
    } else {
      setSlideImages([]);
    }
  }, [selectedTemplate]);

  // Load data on mount
  const loadVideos = useCallback(async () => {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  const loadRenders = useCallback(async () => {
    try {
      const data = await getRenders();
      setRenders(data);
    } catch (err) {
      console.error('Failed to load renders:', err);
    }
  }, []);

  useEffect(() => {
    loadVideos();
    loadTemplates();
    loadRenders();
  }, [loadVideos, loadTemplates, loadRenders]);

  const handleVideoUploaded = (video: Video) => {
    setSelectedVideo(video);
    loadVideos();
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await deleteVideoApi(id);
      if (selectedVideo?.id === id) {
        setSelectedVideo(null);
      }
      loadVideos();
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="border-b border-dark-400/50 backdrop-blur-xl bg-dark-900/60 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 15.75h7.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white">Reel Editor</h1>
              <p className="text-xs text-dark-200">Create stunning vertical reels</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-sm text-dark-200">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Backend connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 h-[calc(100vh-73px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* ─── Left Panel: Sidebar (Templates) - 3 cols ─── */}
          <div className="lg:col-span-3 flex flex-col h-full space-y-6">
            <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col">
              <TemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                onTemplatesChange={loadTemplates}
              />
            </div>
          </div>

          {/* ─── Center Panel: Canvas (Preview) - 5 cols ─── */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="glass-card flex-1 flex flex-col overflow-hidden custom-scrollbar">
              <RenderHistory renders={renders} onRendersChange={loadRenders} />
            </div>
          </div>

          {/* ─── Right Panel: Properties (Media & Rendering) - 4 cols ─── */}
          <div className="lg:col-span-4 flex flex-col h-full space-y-4 overflow-y-auto custom-scrollbar pr-2">
            
            {/* Input Method */}
            <div className="glass-card overflow-hidden shrink-0">
              <div className="flex border-b border-dark-400/50">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'upload' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <span className="flex items-center justify-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>Upload Media</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'record' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <span className="flex items-center justify-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>Record Video</span>
                  </span>
                </button>
              </div>

              <div className="p-5">
                {hasMediaSlots ? (
                  <SlideUploader 
                    mediaSlots={effectiveMediaSlots!}
                    slideImages={slideImages}
                    setSlideImages={setSlideImages}
                  />
                ) : (
                  activeTab === 'upload' ? (
                    <VideoUploader onVideoUploaded={handleVideoUploaded} />
                  ) : (
                    <VideoRecorder onVideoRecorded={handleVideoUploaded} />
                  )
                )}
              </div>
            </div>

            {/* Video List (only shown if not a slide template, or if we have videos) */}
            {(!hasMediaSlots && videos.length > 0) && (
              <div className="glass-card p-4 shrink-0 animate-fade-in">
                <h3 className="text-xs font-display font-semibold text-white mb-2 flex items-center space-x-1.5">
                  <svg className="w-3.5 h-3.5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
                  </svg>
                  <span>Select Base Video</span>
                  <span className="text-dark-200 font-normal ml-1">({videos.length})</span>
                </h3>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`
                        group flex items-center justify-between p-2 rounded-lg cursor-pointer
                        transition-all duration-200
                        ${selectedVideo?.id === video.id
                          ? 'bg-primary-500/10 border border-primary-500/30'
                          : 'hover:bg-dark-500/30 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-8 h-8 rounded border border-dark-600 overflow-hidden bg-dark-700 flex-shrink-0">
                          {video.thumbnail ? (
                            <img
                              src={`/uploads/videos/${video.thumbnail}`}
                              alt={video.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-white truncate">{video.originalName}</p>
                          <p className="text-[9px] text-dark-300">
                            {video.duration ? `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}` : 'Unknown duration'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity btn-danger text-[10px] px-1.5 py-0.5"
                      >
                        Del
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Render Controls */}
            <div className="glass-card p-5 shrink-0">
              <RenderButton
                selectedVideo={selectedVideo}
                selectedTemplate={selectedTemplate}
                onRenderComplete={loadRenders}
                slideImages={slideImages.filter(img => img !== '')}
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default EditorPage;

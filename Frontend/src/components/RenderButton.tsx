import React, { useState, useEffect, useRef } from 'react';
import { startRender as startRenderApi, getRender } from '../api/client';
import { Video, Template, Render } from '../types';

interface RenderButtonProps {
  selectedVideo: Video | null;
  selectedTemplate: Template | null;
  onRenderComplete: () => void;
  slideImages?: string[];
}

const RenderButton: React.FC<RenderButtonProps> = ({
  selectedVideo,
  selectedTemplate,
  onRenderComplete,
  slideImages = [],
}) => {
  const [render, setRender] = useState<Render | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const expectedSlotCount = selectedTemplate?.mediaSlots?.length ?? selectedTemplate?.slideDurations?.length ?? 0;
  const hasMediaSlots = expectedSlotCount > 0 && selectedTemplate?.isSlideTemplate;

  const isSlideReady = hasMediaSlots && slideImages.length === expectedSlotCount;
  const isVideoReady = !hasMediaSlots && selectedVideo !== null;
  
  const canRender = selectedTemplate && (isSlideReady || isVideoReady) && !isRendering;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollRenderStatus = (renderId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const updated = await getRender(renderId);
        setRender(updated);

        if (updated.status === 'completed') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsRendering(false);
          onRenderComplete();
        } else if (updated.status === 'failed') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsRendering(false);
          setError(updated.error || 'Render failed');
        }
      } catch (err) {
        // Continue polling even if one request fails
      }
    }, 1500);
  };

  const handleRender = async () => {
    if (!selectedTemplate || !canRender) return;

    setIsRendering(true);
    setError(null);
    setRender(null);

    try {
      const renderJob = await startRenderApi(
        selectedTemplate.id,
        selectedVideo?.id,
        hasMediaSlots ? slideImages : undefined
      );
      setRender(renderJob);
      pollRenderStatus(renderJob.id);
    } catch (err: any) {
      setIsRendering(false);
      setError(err.response?.data?.error || err.message || 'Failed to start render');
    }
  };

  const getStatusText = (): string => {
    if (!render) return '';
    switch (render.status) {
      case 'pending':
        return 'Waiting...';
      case 'processing':
        return `Rendering ${render.progress || 0}%`;
      case 'completed':
        return 'Done!';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  const getStatusColor = (): string => {
    if (!render) return '';
    switch (render.status) {
      case 'pending':
        return 'text-amber-400';
      case 'processing':
        return 'text-primary-400';
      case 'completed':
        return 'text-emerald-400';
      case 'failed':
        return 'text-red-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Render Button */}
      <button
        onClick={handleRender}
        disabled={!canRender}
        className={`
          w-full py-4 px-6 rounded-2xl font-display font-bold text-lg
          flex items-center justify-center space-x-3
          transition-all duration-300 ease-out
          ${canRender
            ? 'bg-gradient-to-r from-primary-600 via-accent-violet to-accent-cyan text-white shadow-glow-lg hover:shadow-glow animate-gradient cursor-pointer active:scale-[0.98]'
            : 'bg-dark-600 text-dark-300 cursor-not-allowed'
          }
        `}
      >
        {isRendering ? (
          <>
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{getStatusText()}</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 15.75h7.5" />
            </svg>
            <span>Render Reel</span>
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isRendering && render && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-dark-100">Processing your reel...</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {render.progress || 0}%
            </span>
          </div>
          <div className="progress-bar h-2">
            <div
              className="progress-bar-fill"
              style={{ width: `${render.progress || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed */}
      {render?.status === 'completed' && render.downloadUrl && (
        <div className="glass-card-sm p-4 animate-slide-up border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Reel is ready!</p>
                <p className="text-dark-200 text-xs">Your reel has been rendered successfully</p>
              </div>
            </div>
            <a
              href={render.downloadUrl}
              download
              className="btn-primary text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download</span>
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Disabled hint */}
      {!canRender && !isRendering && (
        <p className="text-center text-dark-300 text-xs">
          {!selectedVideo && !selectedTemplate
            ? 'Upload a video and select a template to render'
            : !selectedVideo
            ? 'Upload or record a video first'
            : 'Select a template to continue'}
        </p>
      )}
    </div>
  );
};

export default RenderButton;

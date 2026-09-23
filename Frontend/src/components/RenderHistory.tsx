import React, { useState } from 'react';
import { Render } from '../types';
import { deleteRender as deleteRenderApi } from '../api/client';
import VideoPreviewModal from './VideoPreviewModal';

interface RenderHistoryProps {
  renders: Render[];
  onRendersChange: () => void;
}

const RenderHistory: React.FC<RenderHistoryProps> = ({ renders, onRendersChange }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteRenderApi(id);
      onRendersChange();
    } catch (err) {
      console.error('Failed to delete render', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: Render['status']) => {
    switch (status) {
      case 'completed':
        return <span className="badge-success">Completed</span>;
      case 'processing':
        return <span className="badge-info">Processing</span>;
      case 'pending':
        return <span className="badge-warning">Pending</span>;
      case 'failed':
        return <span className="badge-error">Failed</span>;
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (renders.length === 0) return null;

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center space-x-2">
        <svg className="w-5 h-5 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Render History</span>
        <span className="text-sm text-dark-200 font-normal">({renders.length})</span>
      </h3>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {renders.map((render) => (
          <div
            key={render.id}
            className="flex items-center justify-between p-3 bg-dark-600/30 rounded-xl hover:bg-dark-500/30 transition-colors duration-200 group"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${render.status === 'completed' ? 'bg-emerald-500/10' : 
                  render.status === 'processing' ? 'bg-primary-500/10' :
                  render.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'}
              `}>
                {render.status === 'completed' ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : render.status === 'processing' ? (
                  <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : render.status === 'failed' ? (
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-white font-medium truncate">
                    Render #{render.id.slice(0, 8)}
                  </p>
                  {getStatusBadge(render.status)}
                </div>
                <p className="text-xs text-dark-200 mt-0.5">{formatDate(render.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {render.status === 'completed' && render.downloadUrl && (
                <>
                  <button
                    onClick={() => setPreviewUrl(render.downloadUrl!)}
                    className="btn-primary text-xs flex items-center space-x-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
                    </svg>
                    <span>Preview</span>
                  </button>
                  <a
                    href={render.downloadUrl}
                    download
                    className="btn-secondary text-xs flex items-center space-x-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Save</span>
                  </a>
                </>
              )}
              <button
                onClick={() => handleDelete(render.id)}
                disabled={deletingId === render.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity btn-danger text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Video Preview Modal */}
      {previewUrl && (
        <VideoPreviewModal
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
};

export default RenderHistory;

import React, { useState } from 'react';
import { Template } from '../types';
import { deleteTemplate as deleteTemplateApi } from '../api/client';
import TemplateUploadModal from './TemplateUploadModal';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
  onTemplatesChange: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onTemplatesChange,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(id);
    try {
      await deleteTemplateApi(id);
      onTemplatesChange();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-lg font-display font-semibold text-white">
          Templates
          <span className="ml-2 text-sm text-dark-200 font-normal">({templates.length})</span>
        </h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-secondary text-sm flex items-center space-x-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Upload</span>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Template Grid */}
      <div className="overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-dark-600 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
              </svg>
            </div>
            <p className="text-dark-200 text-sm">No templates yet</p>
            <p className="text-dark-300 text-xs mt-1">Upload a green-screen template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`
                  group relative flex flex-col p-2 rounded-xl cursor-pointer
                  transition-all duration-300 hover:-translate-y-0.5
                  ${selectedTemplate?.id === template.id
                    ? 'bg-primary-500/15 border border-primary-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-primary-500/30'
                    : 'bg-dark-700/50 border border-dark-500/50 hover:bg-dark-600/80 hover:border-dark-400/80 shadow-sm'
                  }
                `}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden bg-dark-800 mb-2">
                  {template.thumbnail ? (
                    <img
                      src={`/uploads/templates/${template.thumbnail}`}
                      alt={template.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                      </svg>
                    </div>
                  )}

                  {/* Selected Indicator Overlay */}
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute inset-0 bg-primary-500/10 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-8 h-8 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50 flex items-center justify-center animate-scale-in">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); }}
                      className="w-7 h-7 rounded-full bg-dark-900/80 hover:bg-primary-500 text-dark-200 hover:text-white flex items-center justify-center backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l12.673-12.673z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, template.id)}
                      disabled={deletingId === template.id}
                      className="w-7 h-7 rounded-full bg-dark-900/80 hover:bg-red-500 text-dark-200 hover:text-white flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-dark-900/80 backdrop-blur-sm text-[10px] font-medium text-white">
                    {formatDuration(template.duration)}
                  </div>

                  {/* Slots badge */}
                  {(template.mediaSlots && template.mediaSlots.length > 0) && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-primary-500/80 backdrop-blur-sm text-[10px] font-bold text-white">
                      {template.mediaSlots.length} slots
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-1 pb-1 text-center">
                  <p className={`text-xs font-medium truncate ${
                    selectedTemplate?.id === template.id ? 'text-primary-300 font-semibold' : 'text-dark-100'
                  }`}>
                    {template.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload/Edit Modal */}
      {(showUploadModal || editingTemplate) && (
        <TemplateUploadModal
          onClose={() => { setShowUploadModal(false); setEditingTemplate(null); }}
          onUploaded={() => { onTemplatesChange(); setEditingTemplate(null); }}
          initialTemplate={editingTemplate || undefined}
          mode={editingTemplate ? 'edit' : 'upload'}
        />
      )}
    </div>
  );
};

export default TemplateSelector;

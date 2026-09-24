import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { MediaSlot } from '../types';
import { uploadTemplate as uploadTemplateApi } from '../api/client';

interface TemplateUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

let slotCounter = 0;
function nextSlotId(): string {
  slotCounter++;
  return `slot-${slotCounter}`;
}

const TemplateUploadModal: React.FC<TemplateUploadModalProps> = ({ onClose, onUploaded }) => {
  const [templateName, setTemplateName] = useState('');
  const [mediaSlots, setMediaSlots] = useState<MediaSlot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'file' | 'slots'>('file');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

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

  const addSlot = () => {
    const lastSlot = mediaSlots[mediaSlots.length - 1];
    const startTime = lastSlot ? lastSlot.endTime : 0;
    const duration = 3;
    const newSlot: MediaSlot = {
      slotId: nextSlotId(),
      order: mediaSlots.length + 1,
      mediaType: 'image_or_video',
      startTime,
      endTime: startTime + duration,
      duration,
    };
    setMediaSlots([...mediaSlots, newSlot]);
  };

  const removeSlot = (idx: number) => {
    const newSlots = mediaSlots.filter((_, i) => i !== idx);
    // Reorder
    newSlots.forEach((s, i) => { s.order = i + 1; });
    setMediaSlots(newSlots);
  };

  const updateSlot = (idx: number, field: string, value: number | string) => {
    const newSlots = [...mediaSlots];
    const slot = { ...newSlots[idx] };

    if (field === 'mediaType') {
      slot.mediaType = value as MediaSlot['mediaType'];
    } else if (field === 'startTime') {
      const v = Math.max(0, Number(value));
      slot.startTime = v;
      slot.endTime = v + slot.duration;
    } else if (field === 'duration') {
      const v = Math.max(0.1, Number(value));
      slot.duration = v;
      slot.endTime = slot.startTime + v;
    } else if (field === 'endTime') {
      const v = Math.max(slot.startTime + 0.1, Number(value));
      slot.endTime = v;
      slot.duration = +(v - slot.startTime).toFixed(2);
    }

    newSlots[idx] = slot;
    setMediaSlots(newSlots);
  };

  const autoFillStartTimes = () => {
    const newSlots = [...mediaSlots];
    for (let i = 1; i < newSlots.length; i++) {
      newSlots[i] = {
        ...newSlots[i],
        startTime: newSlots[i - 1].endTime,
        endTime: newSlots[i - 1].endTime + newSlots[i].duration,
      };
    }
    setMediaSlots(newSlots);
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (mediaSlots.length === 0) return errors;

    for (const slot of mediaSlots) {
      if (slot.startTime < 0) errors.push(`Slot ${slot.order}: Start time cannot be negative`);
      if (slot.endTime <= slot.startTime) errors.push(`Slot ${slot.order}: End time must be after start time`);
      if (slot.duration <= 0) errors.push(`Slot ${slot.order}: Duration must be positive`);
    }

    const sorted = [...mediaSlots].sort((a, b) => a.startTime - b.startTime);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime) {
        errors.push(`Slot ${sorted[i - 1].order} and Slot ${sorted[i].order} overlap`);
      }
    }

    return errors;
  };

  const totalDuration = mediaSlots.length > 0
    ? Math.max(...mediaSlots.map(s => s.endTime))
    : 0;

  const handleUpload = async () => {
    if (!selectedFile) return;

    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      await uploadTemplateApi(
        selectedFile,
        templateName || undefined,
        mediaSlots.length > 0 ? mediaSlots : undefined,
        (p: number) => setUploadProgress(p)
      );
      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col glass-card overflow-hidden animate-slide-up shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-500/50 shrink-0">
          <h2 className="text-lg font-display font-bold text-white">Upload Template</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-dark-600 hover:bg-dark-500 text-dark-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {step === 'file' && (
            <>
              <input
                type="text"
                placeholder="Template name (optional)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="input-field text-sm w-full"
              />

              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                  ${selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : isDragActive
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-dark-400 hover:border-dark-300'
                  }
                `}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="space-y-2">
                    <svg className="w-8 h-8 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-dark-300 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-8 h-8 text-dark-200 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-dark-200 text-sm">
                      Drop green-screen template video or <span className="text-primary-400">browse</span>
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <button
                  onClick={() => setStep('slots')}
                  className="btn-primary w-full text-sm py-2.5"
                >
                  Next: Configure Media Slots →
                </button>
              )}
            </>
          )}

          {step === 'slots' && (
            <>
              {/* Back button */}
              <button onClick={() => setStep('file')} className="text-dark-200 hover:text-white text-xs flex items-center space-x-1 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Back to file</span>
              </button>

              <p className="text-xs text-dark-300">
                Define media slots to tell the system where user-uploaded images/videos should appear in the timeline.
                <strong className="text-dark-200"> Leave empty</strong> for a standard overlay-only template.
              </p>

              {/* Slot list */}
              <div className="space-y-3">
                {mediaSlots.map((slot, idx) => (
                  <div key={slot.slotId} className="bg-dark-800/60 border border-dark-600 rounded-xl p-3.5 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Slot {slot.order}</span>
                      <button
                        onClick={() => removeSlot(idx)}
                        className="w-6 h-6 rounded-md bg-red-500/10 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Media Type */}
                    <div>
                      <label className="text-[10px] text-dark-300 uppercase tracking-wider mb-1 block">Media Type</label>
                      <select
                        value={slot.mediaType}
                        onChange={(e) => updateSlot(idx, 'mediaType', e.target.value)}
                        className="input-field text-xs !py-1.5 w-full"
                      >
                        <option value="image_or_video">Image or Video</option>
                        <option value="image">Image Only</option>
                        <option value="video">Video Only</option>
                      </select>
                    </div>

                    {/* Timing */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-300 uppercase tracking-wider mb-1 block">Start (s)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(idx, 'startTime', parseFloat(e.target.value) || 0)}
                          className="input-field text-xs !py-1.5 text-center w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-300 uppercase tracking-wider mb-1 block">Duration (s)</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={slot.duration}
                          onChange={(e) => updateSlot(idx, 'duration', parseFloat(e.target.value) || 0.1)}
                          className="input-field text-xs !py-1.5 text-center w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-300 uppercase tracking-wider mb-1 block">End (s)</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(idx, 'endTime', parseFloat(e.target.value) || 0.1)}
                          className="input-field text-xs !py-1.5 text-center w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add slot button */}
              <button
                onClick={addSlot}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Media Slot</span>
              </button>

              {mediaSlots.length > 1 && (
                <button
                  onClick={autoFillStartTimes}
                  className="text-primary-400 hover:text-primary-300 text-xs transition-colors underline underline-offset-2"
                >
                  Auto-fill start times sequentially
                </button>
              )}

              {/* Timeline visualization */}
              {mediaSlots.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] text-dark-300 uppercase tracking-wider block">Timeline Preview</label>
                  <div className="relative h-8 bg-dark-800 rounded-lg overflow-hidden border border-dark-600">
                    {mediaSlots.map((slot, idx) => {
                      const left = totalDuration > 0 ? (slot.startTime / totalDuration) * 100 : 0;
                      const width = totalDuration > 0 ? (slot.duration / totalDuration) * 100 : 0;
                      const colors = [
                        'bg-primary-500/60', 'bg-emerald-500/60', 'bg-amber-500/60',
                        'bg-rose-500/60', 'bg-cyan-500/60', 'bg-violet-500/60',
                      ];
                      return (
                        <div
                          key={slot.slotId}
                          className={`absolute top-0 bottom-0 ${colors[idx % colors.length]} border-r border-dark-800/50 flex items-center justify-center`}
                          style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                        >
                          <span className="text-[9px] text-white font-bold">{slot.order}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-dark-400">
                    <span>0s</span>
                    <span>{totalDuration.toFixed(1)}s</span>
                  </div>
                </div>
              )}

              {/* Total Duration */}
              {mediaSlots.length > 0 && (
                <div className="flex items-center justify-between bg-dark-800/50 border border-dark-600 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold text-dark-200">Total Template Duration</span>
                  <span className="text-sm font-display font-bold text-primary-400">{totalDuration.toFixed(1)}s</span>
                </div>
              )}

              {/* Validation errors */}
              {getValidationErrors().length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  {getValidationErrors().map((e, i) => (
                    <p key={i} className="text-red-400 text-xs">• {e}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-200">Uploading...</span>
                <span className="text-primary-400">{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-dark-500/50 shrink-0 flex items-center justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          {step === 'slots' && (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || getValidationErrors().length > 0}
              className="btn-primary text-sm px-6 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Template'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default TemplateUploadModal;

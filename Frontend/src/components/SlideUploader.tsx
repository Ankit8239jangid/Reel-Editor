import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '../api/client';
import { MediaSlot } from '../types';

interface SlideUploaderProps {
  mediaSlots: MediaSlot[];
  slideImages: string[];
  setSlideImages: (images: string[]) => void;
}

const SlideUploader: React.FC<SlideUploaderProps> = ({ mediaSlots, slideImages, setSlideImages }) => {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[], idx: number) => {
    if (acceptedFiles.length === 0) return;
    
    const newImages = [...slideImages];
    for (let i = 0; i < acceptedFiles.length; i++) {
      const targetIdx = idx + i;
      if (targetIdx >= mediaSlots.length) break;
      
      const file = acceptedFiles[i];
      setUploadingIdx(targetIdx);
      try {
        const filename = await uploadImage(file);
        newImages[targetIdx] = filename;
        setSlideImages([...newImages]);
      } catch (err) {
        console.error('Failed to upload image:', err);
      }
    }
    setUploadingIdx(null);
  }, [slideImages, setSlideImages, mediaSlots.length]);

  const getAcceptedTypes = (slot: MediaSlot): Record<string, string[]> => {
    if (slot.mediaType === 'image') {
      return {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
      };
    }
    if (slot.mediaType === 'video') {
      return {
        'video/mp4': ['.mp4'],
        'video/quicktime': ['.mov'],
        'video/webm': ['.webm'],
      };
    }
    // image_or_video
    return {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
    };
  };

  const mediaTypeLabel = (type: MediaSlot['mediaType']) => {
    switch (type) {
      case 'image': return 'Image';
      case 'video': return 'Video';
      default: return 'Image/Video';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">Upload Media for Template Slots</h3>
      <p className="text-xs text-dark-300">Upload one or multiple files. You can drop multiple files into a slot to fill subsequent slots automatically.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {mediaSlots.map((slot, idx) => {
          const currentImage = slideImages[idx];
          const isUploading = uploadingIdx === idx;

          const Dropzone = () => {
            const { getRootProps, getInputProps, isDragActive } = useDropzone({
              onDrop: (files) => onDrop(files, idx),
              accept: getAcceptedTypes(slot),
              maxSize: 50 * 1024 * 1024,
              multiple: true,
              disabled: isUploading,
            });

            return (
              <div
                {...getRootProps()}
                className={`
                  relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-dashed
                  transition-all duration-200 cursor-pointer
                  ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-500 hover:border-dark-400'}
                  ${currentImage ? 'border-none' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {currentImage ? (
                  <>
                    {/\.(mp4|mov|webm|avi)$/i.test(currentImage) ? (
                      <video src={`/uploads/images/${currentImage}`} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                    ) : (
                      <img src={`/uploads/images/${currentImage}`} className="w-full h-full object-cover" alt={`Slot ${slot.order}`} />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs font-semibold">Replace</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-3 text-center">
                    <svg className="w-6 h-6 text-dark-300 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-[10px] text-dark-200 font-medium">{mediaTypeLabel(slot.mediaType)}</span>
                    <span className="text-[10px] text-dark-400">{slot.startTime}s – {slot.endTime}s</span>
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-dark-900/80 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                  </div>
                )}

                <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-medium">
                  {slot.order}
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-dark-100 text-center font-medium">
                  {slot.duration.toFixed(1)}s
                </div>
              </div>
            );
          };

          return <Dropzone key={slot.slotId} />;
        })}
      </div>
    </div>
  );
};

export default SlideUploader;

export interface Video {
  id: string;
  originalName: string;
  filename: string;
  duration: number;
  thumbnail?: string;
  createdAt: string;
}

export interface MediaSlot {
  slotId: string;
  order: number;
  mediaType: 'image' | 'video' | 'image_or_video';
  startTime: number;
  endTime: number;
  duration: number;
  muted?: boolean;
}

export interface Template {
  id: string;
  name: string;
  filename: string;
  duration: number;
  thumbnail?: string;
  createdAt: string;
  // Legacy fields (backward compat)
  isSlideTemplate?: boolean;
  slideDurations?: number[];
  // New media slots system
  mediaSlots?: MediaSlot[];
}

export interface Render {
  id: string;
  videoId: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  outputFilename?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  slideImages?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

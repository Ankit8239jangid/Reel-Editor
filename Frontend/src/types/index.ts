export interface Video {
  id: string;
  originalName: string;
  filename: string;
  duration: number;
  thumbnail?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  filename: string;
  duration: number;
  thumbnail?: string;
  createdAt: string;
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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import axios from 'axios';
import { Video, Template, Render, ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

// ─── Videos ──────────────────────────────────────────────────────────────────

export async function getVideos(): Promise<Video[]> {
  const { data } = await api.get<ApiResponse<Video[]>>('/videos');
  return data.data || [];
}

export async function getVideo(id: string): Promise<Video> {
  const { data } = await api.get<ApiResponse<Video>>(`/videos/${id}`);
  return data.data!;
}

export async function uploadVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Video> {
  const formData = new FormData();
  formData.append('video', file);

  const { data } = await api.post<ApiResponse<Video>>('/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return data.data!;
}

export async function deleteVideo(id: string): Promise<void> {
  await api.delete(`/videos/${id}`);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  const { data } = await api.get<ApiResponse<Template[]>>('/templates');
  return data.data || [];
}

export async function getTemplate(id: string): Promise<Template> {
  const { data } = await api.get<ApiResponse<Template>>(`/templates/${id}`);
  return data.data!;
}

export async function uploadTemplate(
  file: File,
  name?: string,
  mediaSlots?: any[],
  onProgress?: (progress: number) => void
): Promise<Template> {
  const formData = new FormData();
  formData.append('template', file);
  if (name) formData.append('name', name);
  if (mediaSlots && mediaSlots.length > 0) {
    formData.append('mediaSlots', JSON.stringify(mediaSlots));
  }

  const { data } = await api.post<ApiResponse<Template>>('/templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return data.data!;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

// ─── Renders ─────────────────────────────────────────────────────────────────

export async function getRenders(): Promise<Render[]> {
  const { data } = await api.get<ApiResponse<Render[]>>('/renders');
  return data.data || [];
}

export async function getRender(id: string): Promise<Render> {
  const { data } = await api.get<ApiResponse<Render>>(`/renders/${id}`);
  return data.data!;
}

export async function startRender(
  templateId: string,
  videoId?: string,
  slideImages?: string[]
): Promise<Render> {
  const { data } = await api.post<ApiResponse<Render>>('/renders', { templateId, videoId, slideImages });
  return data.data!;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post<ApiResponse<{filename: string}>>('/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!.filename;
}

export async function deleteRender(id: string): Promise<void> {
  await api.delete(`/renders/${id}`);
}

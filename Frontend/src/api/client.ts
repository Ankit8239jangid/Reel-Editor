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
  onProgress?: (progress: number) => void
): Promise<Template> {
  const formData = new FormData();
  formData.append('template', file);
  if (name) formData.append('name', name);

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

export async function startRender(videoId: string, templateId: string): Promise<Render> {
  const { data } = await api.post<ApiResponse<Render>>('/renders', { videoId, templateId });
  return data.data!;
}

export async function deleteRender(id: string): Promise<void> {
  await api.delete(`/renders/${id}`);
}

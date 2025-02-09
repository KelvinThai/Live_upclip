import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

export interface UploadVideoRequest {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  isPrivate?: boolean;
}

export interface UploadVideoResponse {
  videoId: string;
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: string;
}

export interface ViralMomentAnalysis {
  timestamp: string;
  startTime: string;
  endTime: string;
  duration: string;
  description: string;
  viralPotential: number;
  suggestedTitle: string;
  suggestedHashtags: string[];
}

export interface EditVideoRequest {
  videoPath: string;
  moment: ViralMomentAnalysis;
  outputFormat: string;
  resolution?: string;
  customDuration?: string;
  includeCaption?: boolean;
  includeHashtags?: boolean;
}

export interface EditVideoResponse {
  outputPath: string;
  duration: number;
  format: string;
  resolution?: string;
  fileSize: number;
}

export const videoApi = {
  uploadOriginal: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/upfile/upload/video", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  analyzeVideo: async (videoPath: string) => {
    const response = await api.post<ViralMomentAnalysis[]>(
      "/analyzer/analyze",
      {
        videoPath,
      }
    );
    return response.data;
  },

  editVideo: async (request: EditVideoRequest) => {
    const response = await api.post<EditVideoResponse>(
      "/video-editor/edit",
      request
    );
    return response.data;
  },
};

export const youtubeApi = {
  getAuthUrl: async () => {
    const response = await api.get<string>("/youtube-shorts/auth");
    console.log("response", response);
    return response.data;
  },

  handleCallback: async (code: string) => {
    const response = await api.get<string>(
      `/youtube-shorts/callback?code=${code}`
    );
    return response.data;
  },

  setRefreshToken: async (refreshToken: string) => {
    await api.post("/youtube-shorts/set-token", { refreshToken });
  },

  uploadVideo: async (data: UploadVideoRequest) => {
    const response = await api.post<UploadVideoResponse>(
      "/youtube-shorts/upload",
      data
    );
    return response.data;
  },
};

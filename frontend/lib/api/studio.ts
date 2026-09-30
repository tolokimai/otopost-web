import type {
  CarouselPayload, CarouselProject, CarouselRender, CarouselSlide, ClipResult,
  HooksResponse, MediaAsset, RemakeJob, TranscriptResponse, TranscriptSegment,
  ViralSegment,
} from "../types";
import { http } from "../http/client";

export const studioApi = {
  carouselGenerate: (body: {
    topic: string; audience: string; goal: string; tone: string; slideCount: number;
  }) => http.post<{ title: string; slides: CarouselSlide[] }>("/carousel/generate", body),
  carouselRender: (body: CarouselPayload) => http.post<CarouselRender>("/carousel/render", body),
  carouselProjects: () => http.get<{ projects: CarouselProject[] }>("/carousel/projects"),
  carouselCreateProject: (body: CarouselPayload) =>
    http.post<CarouselProject>("/carousel/projects", body),
  carouselUpdateProject: (id: string, body: CarouselPayload) =>
    http.put<CarouselProject>(`/carousel/projects/${id}`, body),
  carouselRenderProject: (id: string) =>
    http.post<CarouselProject>(`/carousel/projects/${id}/render`, {}),
  carouselDeleteProject: (id: string) => http.delete<void>(`/carousel/projects/${id}`),
  transcript: (body: { url: string; langs?: string[] }) =>
    http.post<TranscriptResponse>("/transcript", body),
  getTranscript: (url: string, langs?: string[]) =>
    http.post<TranscriptResponse>("/transcript", { url, langs }),
  analyze: (body: {
    topic?: string; segments?: TranscriptSegment[]; transcript?: string; maxSegments?: number;
  }) => http.post<{ segments: ViralSegment[] }>("/ai/analyze-transcript", body),
  analyzeViral: (transcript: string) =>
    http.post<{ viralSegments: ViralSegment[] }>("/ai/viral-moments", { transcript }),
  generateHooks: (transcript: string, title?: string) =>
    http.post<HooksResponse>("/ai/hooks-captions", { transcript, title }),
  hooks: (body: { topic: string; style?: string }) =>
    http.post<HooksResponse>("/ai/hooks-captions", body),
  clipsAsync: (body: unknown) =>
    http.post<{ job: string; status: string }>("/clips-async", body),
  clipsSync: (body: unknown) => http.post<{ job: string; clips: ClipResult[] }>("/clips", body),
  clipsStatus: (job: string) => http.get<{
    job: string; status: string; clips: ClipResult[]; error?: string;
  }>(`/clips/status/${job}`),
  generateClips: (
    url: string,
    clips: Array<{ id: string; start: number; end: number; title: string }>,
    burnSubtitle = true,
  ) => http.post<{ clips: ClipResult[] }>("/clips", { url, clips, burnSubtitle }),
  remakeUpload: (kind: "video" | "photo" | "audio", file: File) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    return http.upload<MediaAsset>("/remake/upload", body);
  },
  remakeAssets: () => http.get<{ assets: MediaAsset[] }>("/remake/assets"),
  remakeDeleteAsset: (id: string) => http.delete<void>(`/remake/assets/${id}`),
  museTalkStatus: () =>
    http.get<Record<string, unknown> & { ready: boolean }>("/remake/musetalk-status"),
  remakeStart: (body: {
    mediaId: string; audioId: string; mode: "overlay" | "lipsync";
    aspectRatio: string; subtitleText: string; subtitleStyle: string;
    consentConfirmed: boolean;
  }) => http.post<RemakeJob>("/remake/jobs", body),
  remakeStatus: (job: string) => http.get<RemakeJob>(`/remake/jobs/${job}`),
};

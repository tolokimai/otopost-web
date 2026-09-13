export type TranscriptSegment = { startSec: number; text: string };

export type TranscriptResponse = {
  videoId?: string | null;
  title?: string | null;
  channelName?: string | null;
  durationSec?: number | null;
  hasTranscript: boolean;
  transcriptText: string;
  segments: TranscriptSegment[];
};

export type ViralSegment = {
  startSec: number;
  endSec: number;
  durationFormatted: string;
  title: string;
  hook: string;
  reasonWhyViral: string;
  transcriptSnippet: string;
};

export type ClipResult = {
  index: number;
  title: string;
  startSec: number;
  endSec: number;
  reframed: boolean;
  subtitled: boolean;
  downloadUrl: string;
};

export type HooksResponse = {
  viralHook: string;
  caption: string;
  hashtags: string;
  subtitles: string[];
};

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

export function mediaUrl(u: string): string {
  if (!u) return "";
  if (/^https?:\/\//.test(u)) return u;
  return apiUrl(u);
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { detail?: string }).detail || "";
    } catch {
      // ignore parse error
    }
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
  return (await res.json()) as T;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  transcript: (body: { url: string; langs?: string[] }) =>
    postJSON<TranscriptResponse>("/transcript", body),
  analyze: (body: {
    topic?: string;
    segments?: TranscriptSegment[];
    transcript?: string;
    maxSegments?: number;
  }) => postJSON<{ segments: ViralSegment[] }>("/ai/analyze-transcript", body),
  clipsAsync: (body: unknown) => postJSON<{ job: string; status: string }>("/clips-async", body),
  clipsSync: (body: unknown) => postJSON<{ job: string; clips: ClipResult[] }>("/clips", body),
  clipsStatus: (job: string) =>
    getJSON<{ job: string; status: string; clips: ClipResult[]; error?: string }>(
      `/clips/status/${job}`,
    ),
  hooks: (body: { topic: string; style?: string }) =>
    postJSON<HooksResponse>("/ai/hooks-captions", body),
  mediaUrl,
};

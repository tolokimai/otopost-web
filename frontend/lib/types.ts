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

export type UserOut = {
  id: string;
  email: string;
  name: string;
  plan: string;
  credits: number;
  planExpiresAt?: string | null;
  isAdmin: boolean;
};

export type TokenResponse = {
  accessToken: string;
  tokenType: string;
  user: UserOut;
};

export type ProviderStatus = { provider: string; configured: boolean };
export type CredentialsStatus = { providers: ProviderStatus[] };

export type Plan = {
  id: string;
  name: string;
  price: number;
  credits: number;
  durationDays?: number;
  features: string[];
  purchasable: boolean;
  highlight?: boolean;
};

export type CheckoutResponse = {
  orderId: string;
  plan: string;
  amount: number;
  redirectUrl: string;
  token?: string | null;
};

export type Order = {
  orderId: string;
  plan: string;
  amount: number;
  creditsGranted?: number;
  status: string;
  createdAt?: string | null;
};

export type OrdersResponse = { orders: Order[] };

export type StudioMenu = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  isEnabled: boolean;
  isReady: boolean;
  requiredPlan: string;
  sortOrder: number;
};

export type CarouselDesign = {
  aspectRatio: string;
  backgroundTheme: string;
  typographyStyle: string;
  fontFamily: string;
  textColorHex: string;
  accentColorHex: string;
  baseFontScale: number;
  textEffect: string;
  ctaText: string;
  watermarkText: string;
  showPageNumber: boolean;
  showSwipe: boolean;
};

export type CarouselSlide = {
  headline: string;
  body: string;
  subtext: string;
  imageBase64?: string;
};

export type CarouselPayload = {
  title: string;
  slides: CarouselSlide[];
  design: CarouselDesign;
};

export type CarouselProject = {
  id: string;
  title: string;
  status: string;
  payload: CarouselPayload;
  output: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CarouselRender = {
  images: string[];
  zipUrl: string;
};

export type MediaAsset = {
  id: string;
  kind: "video" | "photo" | "audio";
  name: string;
  url: string;
  sizeBytes: number;
  createdAt: string;
};

export type RemakeJob = {
  job: string;
  status: "processing" | "done" | "error";
  progress: number;
  mode: string;
  downloadUrl?: string;
  error?: string;
};

export type AdminPlan = {
  id: string;
  name: string;
  price: number;
  credits: number;
  durationDays: number;
  features: string[];
  purchasable: boolean;
  highlight: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type AdminSetting = {
  key: string;
  value: string;
  valueType: string;
  category: string;
  label: string;
  description: string;
  isSecret: boolean;
  hasValue?: boolean;
  updatedAt?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  credits: number;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: string | null;
};

export type AdminOverview = {
  users: number;
  activeUsers: number;
  paidUsers: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  menusEnabled: number;
};

// AUTOPOST STUDIO MASTER SPECIFICATION ENTITIES
export type DashboardStats = {
  scheduled: number;
  draft: number;
  posted: number;
  failed: number;
};

export type TimelineItem = {
  id: string;
  title: string;
  format: string;
  mediaUrl: string;
  caption: string;
  hashtags: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
  errorMessage?: string;
  postedAt?: string;
};

export type PostingLog = {
  id: string;
  postScheduleId?: string;
  platform: string;
  status: string;
  statusCode: number;
  responseDetail: string;
  createdAt: string;
};

export const CONTENT_FORMATS = ["CAROUSEL", "PODCAST_CLIP", "REMAKE", "REELS"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export type Persona = {
  id: string;
  name: string;
  niche: string;
  toneOfVoice: string;
  targetAudience: string;
  signatureHook: string;
  dos: string;
  donts: string;
  isDefault: boolean;
  createdAt?: string;
};

export type ContentPlanItem = {
  id: string;
  personaId?: string;
  persona_id?: string;
  dayNumber: number;
  scheduledDate?: string;
  topic: string;
  hook: string;
  outline: string;
  format: string;
  status: string;
  caption: string;
  hashtags: string;
  createdAt?: string;
};

export type ThemeIdea = {
  title: string;
  description: string;
  targetGoal: string;
};

export type IntegrationStatus = {
  service: string;
  configured: boolean;
};

export type SchedulePreferences = {
  defaultPostingTime: string;
  autoRetryFailed: boolean;
};

export type ConnectionTestResult = {
  success: boolean;
  latencyMs: number;
  message: string;
};

export type Team = {
  id: string;
  name: string;
  league?: string | null;
  country?: string | null;
};

export type MediaItem = {
  id: string;
  type: "VIDEO" | "IMAGE" | "AUDIO" | "TEXT";
  title: string;
  description?: string | null;
  url: string;
  thumbnail?: string | null;
  createdAt: string;
};

export type SocialEmbed = {
  id: string;
  provider: "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "TIKTOK" | "OTHER";
  url: string;
  createdAt: string;
};

export type Stadium = {
  id: string;
  name: string;
  city: string;
  country: string;
  location?: string | null;
  capacity?: number | null;
  openingDate?: string | null;
  architect?: string | null;
  surface?: string | null;
  roof?: string | null;
  pitchDimensions?: string | null;
  history?: string | null;
  wikiUrl?: string | null;
  wikiImage?: string | null;
  teams: { team: Team }[];
  media: MediaItem[];
  embeds: SocialEmbed[];
};

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: Element | undefined) => void } };
    instgrm?: { Embeds?: { process: () => void } };
  }
}

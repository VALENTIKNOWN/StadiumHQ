import { z } from "zod";

export const createStadiumSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(1),
  country: z.string().min(1),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  openingDate: z.string().datetime().optional(),
  architect: z.string().optional(),
  surface: z.string().optional(),
  roof: z.string().optional(),
  pitchDimensions: z.string().optional(),
  history: z.string().optional(),
  wikiUrl: z.string().url().optional(),
  wikiImage: z.string().url().optional(),
  teamIds: z.array(z.string()).optional()
});

export const updateStadiumSchema = createStadiumSchema.partial();

export const createTeamSchema = z.object({
  name: z.string().min(2),
  league: z.string().optional(),
  country: z.string().optional(),
  wikiUrl: z.string().url().optional()
});

export const createMediaSchema = z.object({
  type: z.enum(["VIDEO", "IMAGE", "AUDIO", "TEXT"]),
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  userId: z.string().optional()
});

export const createEmbedSchema = z.object({
  provider: z.enum(["YOUTUBE", "TWITTER", "INSTAGRAM", "TIKTOK", "OTHER"]),
  url: z.string().url()
});



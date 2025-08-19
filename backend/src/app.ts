import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { prisma } from "./prisma.js";
import { z } from "zod";
import {
  createStadiumSchema,
  updateStadiumSchema,
  createTeamSchema,
  createMediaSchema,
  createEmbedSchema,
} from "./validator";

dotenv.config();

export const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_: any, res: Response) => res.json({ ok: true }));

app.get("/api/stadiums", async (req: Request, res: Response) => {
  const q = String(req.query.q || "");
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 12);
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.stadium.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { teams: { include: { team: true } } },
    }),
    prisma.stadium.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

app.get("/api/stadiums/:id", async (req: Request, res: Response) => {
  const item = await prisma.stadium.findUnique({
    where: { id: req.params.id },
    include: {
      teams: { include: { team: true } },
      media: { orderBy: { createdAt: "desc" }, take: 24 },
      embeds: { orderBy: { createdAt: "desc" }, take: 24 },
    },
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

app.post("/api/stadiums", async (req: Request, res: Response) => {
  const data = createStadiumSchema.parse(req.body);
  const created = await prisma.stadium.create({
    data: {
      ...data,
      openingDate: data.openingDate ? new Date(data.openingDate) : undefined,
      teams: data.teamIds
        ? {
            createMany: {
              data: data.teamIds.map((teamId) => ({ teamId })),
            },
          }
        : undefined,
    },
  });
  res.status(201).json(created);
});

app.patch("/api/stadiums/:id", async (req: Request, res: Response) => {
  const data = updateStadiumSchema.parse(req.body);
  const updated = await prisma.stadium.update({
    where: { id: req.params.id },
    data: {
      ...data,
      openingDate: data.openingDate ? new Date(data.openingDate) : undefined,
    },
  });
  res.json(updated);
});

app.get("/api/teams", async (req: Request, res: Response) => {
  const items = await prisma.team.findMany({ orderBy: { name: "asc" } });
  res.json(items);
});

app.post("/api/teams", async (req: Request, res: Response) => {
  const data = createTeamSchema.parse(req.body);
  const created = await prisma.team.create({ data });
  res.status(201).json(created);
});

app.get("/api/stadiums/:id/media", async (req: Request, res: Response) => {
  const items = await prisma.mediaItem.findMany({
    where: { stadiumId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

app.post("/api/stadiums/:id/media", async (req: Request, res: Response) => {
  const parsed = createMediaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.mediaItem.create({
    data: { ...parsed.data, stadiumId: req.params.id },
  });
  res.status(201).json(created);
});

app.get("/api/stadiums/:id/embeds", async (req: Request, res: Response) => {
  const items = await prisma.socialEmbed.findMany({
    where: { stadiumId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

app.post("/api/stadiums/:id/embeds", async (req: Request, res: Response) => {
  const parsed = createEmbedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.socialEmbed.create({
    data: { ...parsed.data, stadiumId: req.params.id },
  });
  res.status(201).json(created);
});

app.use((err: unknown, _req: Request, res:Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json(err.flatten());
  res.status(500).json({ error: "Internal Server Error" });
});

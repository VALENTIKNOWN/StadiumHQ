import { Stadium } from "@/types/types";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  listStadiums: (q: string, page: number, pageSize: number) =>
    request<{ items: any[]; total: number; page: number; pageSize: number }>(
      `/api/stadiums?q=${encodeURIComponent(
        q
      )}&page=${page}&pageSize=${pageSize}`
    ),
  getStadium: (id: string) => request<Stadium>(`/api/stadiums/${id}`),
  listMedia: (id: string) => request(`/api/stadiums/${id}/media`),
  listEmbeds: (id: string) => request(`/api/stadiums/${id}/embeds`),
};

import dotenv from "dotenv";
dotenv.config();
import { fetch } from "undici";
import { prisma } from "../src/prisma.js";

type Summary = {
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page?: string } };
};

type WikibaseResp = {
  query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> };
};

type WbEntities = {
  entities?: Record<
    string,
    {
      labels?: Record<string, { value: string }>;
      claims?: Record<
        string,
        Array<{
          mainsnak?: {
            datavalue?: { value?: any; type?: string };
          };
        }>
      >;
    }
  >;
};

function pickLabel(labels: Record<string, { value: string }> | undefined) {
  return labels?.en?.value || Object.values(labels || {})[0]?.value || null;
}

function parseAmount(val: any) {
  if (!val) return null;
  const raw = typeof val === "string" ? val : val.amount || "";
  const n = Number(String(raw).replace(/[+,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseWikidataTime(v: any) {
  if (!v) return null;
  const t = typeof v === "string" ? v : v.time;
  if (!t) return null;
  const iso = t.replace(/^(\+?)(\d{4})-00-00T.*$/, "$2-01-01T00:00:00Z").replace(/^(\+?)(\d{4}-\d{2})-00T.*$/, "$2-01T00:00:00Z").replace(/^\+/, "");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

async function getQidFromTitle(title: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(
    title
  )}`;
  const j = (await (await fetch(url)).json()) as WikibaseResp;
  const page = j.query?.pages ? Object.values(j.query.pages)[0] : undefined;
  return page?.pageprops?.wikibase_item || null;
}

async function getSummary(title: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as Summary;
}

async function getEntity(qid: string) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels|claims&ids=${qid}`;
  const j = (await (await fetch(url)).json()) as WbEntities;
  return j.entities?.[qid] || null;
}

async function getLabels(qids: string[]) {
  if (!qids.length) return {};
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels&ids=${qids.join("|")}`;
  const j = (await (await fetch(url)).json()) as WbEntities;
  const out: Record<string, string> = {};
  for (const [id, ent] of Object.entries(j.entities || {})) {
    const label = pickLabel(ent.labels);
    if (label) out[id] = label;
  }
  return out;
}

function extractClaimIds(entity: any, pid: string) {
  const claims = entity?.claims?.[pid] || [];
  const ids: string[] = [];
  for (const c of claims) {
    const v = c.mainsnak?.datavalue?.value;
    if (typeof v === "object" && v?.id) ids.push(v.id);
  }
  return ids;
}

function extractFirstValue(entity: any, pid: string) {
  const c = entity?.claims?.[pid]?.[0]?.mainsnak?.datavalue?.value;
  return c ?? null;
}

async function upsertTeam(name: string, country: string | null) {
  const existing = await prisma.team.findFirst({
    where: { name, country: country || undefined }
  });
  if (existing) return existing;
  return prisma.team.create({ data: { name, country: country || undefined } });
}

async function ingestOne(title: string) {
  const qid = await getQidFromTitle(title);
  const summary = await getSummary(title);
  if (!qid && !summary) return null;
  const entity = qid ? await getEntity(qid) : null;

  const capacityRaw = entity ? extractFirstValue(entity, "P1083") : null;
  const capacity = parseAmount(capacityRaw);
  const inception = entity ? extractFirstValue(entity, "P571") : null;
  const openingDate = parseWikidataTime(inception);

  const cityIds = entity ? extractClaimIds(entity, "P131") : [];
  const countryId = entity ? extractFirstValue(entity, "P17")?.id || null : null;
  const architectId = entity ? extractFirstValue(entity, "P84")?.id || null : null;
  const occupantIds = entity ? extractClaimIds(entity, "P466") : [];

  const needed = [...cityIds, ...(countryId ? [countryId] : []), ...(architectId ? [architectId] : []), ...occupantIds];
  const labels = await getLabels(needed);

  const name = summary?.title || title;
  const city = labels[cityIds[0]] || "Unknown";
  const country = (countryId && labels[countryId]) || "Unknown";
  const architect = architectId ? labels[architectId] || null : null;
  const wikiUrl = summary?.content_urls?.desktop?.page || null;
  const wikiImage = summary?.originalimage?.source || summary?.thumbnail?.source || null;
  const history = summary?.extract || null;

  let stadium = await prisma.stadium.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, country: { equals: country, mode: "insensitive" } }
  });

  if (!stadium) {
    stadium = await prisma.stadium.create({
      data: {
        name,
        city,
        country,
        capacity: capacity || undefined,
        openingDate: openingDate || undefined,
        architect: architect || undefined,
        history: history || undefined,
        wikiUrl: wikiUrl || undefined,
        wikiImage: wikiImage || undefined
      }
    });
  } else {
    stadium = await prisma.stadium.update({
      where: { id: stadium.id },
      data: {
        city,
        capacity: capacity ?? stadium.capacity ?? undefined,
        openingDate: openingDate ?? stadium.openingDate ?? undefined,
        architect: architect ?? stadium.architect ?? undefined,
        history: stadium.history ? stadium.history : history || undefined,
        wikiUrl: stadium.wikiUrl ? stadium.wikiUrl : wikiUrl || undefined,
        wikiImage: stadium.wikiImage ? stadium.wikiImage : wikiImage || undefined
      }
    });
  }

  const teamNames = occupantIds.map((id) => labels[id]).filter(Boolean) as string[];
  for (const tn of teamNames) {
    const team = await upsertTeam(tn, null);
    const exists = await prisma.stadiumTeam.findUnique({
      where: { stadiumId_teamId: { stadiumId: stadium.id, teamId: team.id } }
    });
    if (!exists) {
      await prisma.stadiumTeam.create({ data: { stadiumId: stadium.id, teamId: team.id } });
    }
  }

  return stadium;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stdout.write("Usage: pnpm ingest:wikipedia \"Allianz Arena\" \"Camp Nou\"\n");
    process.exit(1);
  }
  for (const t of args) {
    try {
      const res = await ingestOne(t);
      if (res) process.stdout.write(`Ingested: ${res.name}\n`);
      else process.stdout.write(`Skipped: ${t}\n`);
    } catch (e) {
      process.stdout.write(`Failed: ${t}\n`);
    }
  }
  await prisma.$disconnect();
}

main();


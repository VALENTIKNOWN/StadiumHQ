import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";
import {
  resolveHierarchy,
  buildTokens,
  joinSearchText,
  derivePlaceFields,
  sanitizeHistoryHtml,
} from "./location";

const prisma = new PrismaClient();
const UA = "StadiumExplorer/1.0 (contact: dev@yourdomain.example)";

function enc(title: string) {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.text();
}

async function getSummary(title: string) {
  const data = await fetchJson<any>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${enc(
      title
    )}?redirect=true`
  );
  return {
    extract: typeof data?.extract === "string" ? data.extract : null,
    canonicalTitle: data?.titles?.canonical || data?.title || title,
    contentUrl: data?.content_urls?.desktop?.page || null,
    originalImage: data?.originalimage?.source || null,
    wikibase: data?.wikibase_item || null,
  };
}

async function getQidFromActionApi(title: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&titles=${enc(
    title
  )}&format=json&origin=*`;
  const j = await fetchJson<any>(url);
  const pages = j?.query?.pages || {};
  const first = Object.values(pages)[0] as any;
  return first?.pageprops?.wikibase_item || null;
}

function pickHistoryHtmlFromArticle(fullHtml: string) {
  const $ = cheerio.load(fullHtml);
  let html = "";

  const section = $("section")
    .filter((_, s) => {
      const t = $(s).find("h2,h3").first().text().trim().toLowerCase();
      return t.startsWith("history") || t.includes("history");
    })
    .first();

  if (section.length) {
    html = section.html() || "";
  } else {
    const heading = $("h2,h3")
      .filter((_, h) => $(h).text().trim().toLowerCase().includes("history"))
      .first();
    if (heading.length) {
      const parts: string[] = [];
      let n = heading.next();
      while (n.length && !/h2|h3/i.test(n[0].tagName || "")) {
        parts.push($.html(n) || "");
        n = n.next();
      }
      html = parts.join("");
    }
  }
  if (!html) return null;
  return sanitizeHistoryHtml(html);
}

async function getCoordsAndAdmin(qid: string) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels|claims&ids=${qid}`;
  const j = await fetchJson<any>(url);
  const ent = j?.entities?.[qid] || null;
  const coord = ent?.claims?.P625?.[0]?.mainsnak?.datavalue?.value || null;
  const latitude = typeof coord?.latitude === "number" ? coord.latitude : null;
  const longitude =
    typeof coord?.longitude === "number" ? coord.longitude : null;

  const adminPath = await resolveHierarchy(qid);
  return { latitude, longitude, adminPath };
}

async function ingestOne(title: string) {
  const summary = await getSummary(title);
  const canonical = summary.canonicalTitle || title;
  const qid = summary.wikibase || (await getQidFromActionApi(canonical));

  const html = await fetchText(
    `https://api.wikimedia.org/core/v1/wikipedia/en/page/${enc(canonical)}/html`
  );
  const historyHtml = pickHistoryHtmlFromArticle(html);
  const historySummary = summary.extract || null;
  const wikiUrl =
    summary.contentUrl || `https://en.wikipedia.org/wiki/${enc(canonical)}`;
  const wikiImage = summary.originalImage || null;

  let latitude: number | null = null;
  let longitude: number | null = null;
  let adminPath: string[] = [];
  let locality: string | null = null;
  let borough: string | null = null;
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;
  let countryCode: string | null = null;
  let metroArea: string | null = null;

  if (qid) {
    const geo = await getCoordsAndAdmin(qid);
    latitude = geo.latitude;
    longitude = geo.longitude;
    adminPath = geo.adminPath;
    const derived = derivePlaceFields(adminPath);
    locality = derived.locality;
    borough = derived.borough;
    city = derived.city;
    region = derived.region;
    country = derived.country;
    if (city === "London") metroArea = "South West London";
    if (country && /united kingdom/i.test(country)) countryCode = "GB";
    if (country && /united states/i.test(country)) countryCode = "US";
  }

  const tokens = buildTokens({
    locality,
    borough,
    city,
    metroArea,
    region,
    country,
    countryCode,
    postal: null,
  });
  const fullAdmin = [
    locality || undefined,
    borough || undefined,
    city || undefined,
    region || undefined,
    country || undefined,
  ].filter(Boolean) as string[];
  const searchLocationText = joinSearchText(fullAdmin, tokens);

  const rec = await prisma.stadium.upsert({
    where: { wikiTitle: canonical },
    create: {
      name: canonical,
      wikiTitle: canonical,
      wikiUrl,
      wikiImage,
      historySummary,
      historyHtml: historyHtml || null,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      locality: locality || undefined,
      borough: borough || undefined,
      city: city || undefined,
      metroArea: metroArea || undefined,
      region: region || undefined,
      country: country || undefined,
      countryCode: countryCode || undefined,
      adminPath: fullAdmin,
      locationTokens: tokens,
      searchLocationText,
    },
    update: {
      wikiUrl,
      wikiImage,
      historySummary,
      historyHtml: historyHtml || null,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      locality: locality || undefined,
      borough: borough || undefined,
      city: city || undefined,
      metroArea: metroArea || undefined,
      region: region || undefined,
      country: country || undefined,
      countryCode: countryCode || undefined,
      adminPath: fullAdmin,
      locationTokens: tokens,
      searchLocationText,
    },
  });

  return rec;
}

function parseArgs(argv: string[]) {
  const args = { file: "", titles: [] as string[] };
  for (const a of argv) {
    if (a.startsWith("--file=")) args.file = a.slice(7);
    else args.titles.push(a);
  }
  return args;
}

async function readTitlesFromFile(path: string) {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(path, "utf8");
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j.map(String);
  } catch {}
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let titles = args.titles;
  if (!titles.length && args.file) titles = await readTitlesFromFile(args.file);
  if (!titles.length) {
    console.error("No titles provided");
    process.exit(1);
    return;
  }
  for (const t of titles) {
    try {
      const rec = await ingestOne(t);
      console.log(`OK ${rec.name} ${rec.id}`);
    } catch (e: any) {
      console.error(`FAIL ${t} ${e?.message || e}`);
    }
  }
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import {
  resolveHierarchy,
  derivePlaceFields,
  buildTokens,
  joinSearchText,
} from "./location";

const prisma = new PrismaClient();

async function getQid(title: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(
    title.replace(/ /g, "_")
  )}&format=json&origin=*`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = (await r.json()) as any;
  const pages = j?.query?.pages || {};
  const first = Object.values(pages)[0] as any;
  return first?.pageprops?.wikibase_item || null;
}

async function run(batch = 50) {
  let cursor: string | null = null;
  for (;;) {
    const items = await prisma.stadium.findMany({
      where: {
        OR: [{ adminPath: { equals: [] } }, { searchLocationText: null }],
      },
      take: batch,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (!items.length) break;
    for (const s of items) {
      try {
        const qid = await getQid(s.wikiTitle || s.name);
        if (!qid) continue;
        const adminPath = await resolveHierarchy(qid);
        const derived = derivePlaceFields(adminPath);
        const tokens = buildTokens({
          locality: derived.locality,
          borough: derived.borough,
          city: derived.city,
          metroArea: derived.city === "London" ? "South West London" : null,
          region: derived.region,
          country: derived.country,
          countryCode:
            derived.country && /united kingdom/i.test(derived.country)
              ? "GB"
              : undefined,
          postal: null,
        });
        const fullAdmin = [
          derived.locality || undefined,
          derived.borough || undefined,
          derived.city || undefined,
          derived.region || undefined,
          derived.country || undefined,
        ].filter(Boolean) as string[];
        const searchLocationText = joinSearchText(fullAdmin, tokens);
        await prisma.stadium.update({
          where: { id: s.id },
          data: {
            adminPath: fullAdmin,
            locality: derived.locality || undefined,
            borough: derived.borough || undefined,
            city: derived.city || undefined,
            region: derived.region || undefined,
            country: derived.country || undefined,
            locationTokens: tokens,
            searchLocationText,
          },
        });
        console.log(`OK ${s.name}`);
      } catch (e: any) {
        console.error(`FAIL ${s.name} ${e?.message || e}`);
      }
    }
    cursor = items[items.length - 1].id;
  }
}

run().finally(() => prisma.$disconnect());

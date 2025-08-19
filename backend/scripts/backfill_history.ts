import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";
import { sanitizeHistoryHtml } from "./location";

const prisma = new PrismaClient();
const UA = "StadiumExplorer/1.0 (contact: dev@yourdomain.example)";

function enc(title: string) {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.text();
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

async function run(batch = 40) {
  let cursor: string | null = null;
  for (;;) {
    const items = await prisma.stadium.findMany({
      where: { OR: [{ historyHtml: null }, { historyHtml: "" }] },
      take: batch,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (!items.length) break;
    for (const s of items) {
      try {
        const title = s.wikiTitle || s.name;
        const html = await fetchText(
          `https://api.wikimedia.org/core/v1/wikipedia/en/page/${enc(
            title
          )}/html`
        );
        const historyHtml = pickHistoryHtmlFromArticle(html);
        if (!historyHtml) continue;
        await prisma.stadium.update({
          where: { id: s.id },
          data: { historyHtml },
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

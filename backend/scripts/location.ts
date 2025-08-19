import sanitizeHtml from "sanitize-html";

type Entity = {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<
    string,
    Array<{ mainsnak?: { datavalue?: { value?: any } } }>
  >;
};

const UA = "StadiumExplorer/1.0 (contact: dev@yourdomain.example)";

function labelOf(e?: Entity | null) {
  return (
    e?.labels?.en?.value ||
    (e && Object.values(e.labels || {})[0]?.value) ||
    null
  );
}

function firstClaimValue(e: Entity | null, pid: string) {
  return e?.claims?.[pid]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

async function wb(ids: string[]) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels|claims&ids=${ids.join(
    "|"
  )}`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const j = (await r.json()) as any;
  return j.entities as Record<string, Entity>;
}

export async function resolveHierarchy(qid: string, maxDepth = 8) {
  const out: string[] = [];
  const seen = new Set<string>();
  let curId: string | null = qid;
  let steps = 0;
  while (curId && steps < maxDepth) {
    const ents = await wb([curId]);
    const cur = ents[curId] || null;
    const next = firstClaimValue(cur, "P131");
    if (!next?.id || seen.has(next.id)) break;
    seen.add(next.id);
    const e = (await wb([next.id]))[next.id];
    const name = labelOf(e);
    if (name) out.push(name);
    curId = next.id;
    steps++;
  }
  return out;
}

export function buildTokens(inputs: {
  locality?: string | null;
  borough?: string | null;
  city?: string | null;
  metroArea?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  postal?: string | null;
}) {
  const base = [
    inputs.locality,
    inputs.borough,
    inputs.city,
    inputs.metroArea,
    inputs.region,
    inputs.country,
    inputs.countryCode,
    inputs.postal,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const syn = new Set(base);
  if (base.includes("united kingdom")) {
    syn.add("uk");
    syn.add("gb");
    syn.add("britain");
    syn.add("great britain");
  }
  if (base.includes("united states")) {
    syn.add("usa");
    syn.add("us");
    syn.add("u.s.");
    syn.add("america");
  }
  if (base.includes("london")) {
    syn.add("greater london");
    syn.add("south west london");
    syn.add("south-west london");
  }
  return Array.from(syn);
}

export function derivePlaceFields(adminPath: string[]) {
  let locality: string | null = null;
  let borough: string | null = null;
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;

  for (const name of adminPath) {
    const n = name.toLowerCase();
    if (!borough && /borough|district/.test(n)) borough = name;
    if (!city && (n === "london" || n === "greater london")) city = "London";
    if (
      !country &&
      /(united kingdom|united states|france|spain|italy|germany|portugal|netherlands|brazil|argentina|mexico)/.test(
        n
      )
    )
      country = name;
    if (
      !region &&
      /(england|scotland|wales|northern ireland|catalonia|lombardy|bavaria|ile-de-france|madrid|bayern)/.test(
        n
      )
    )
      region = name;
  }
  if (!country && adminPath.length)
    country = adminPath[adminPath.length - 1] || null;

  const cityFallback =
    adminPath.find((x) => /city|metropolitan|municipality/i.test(x)) || null;
  if (!city && cityFallback) city = cityFallback.replace(/^City of /, "");

  const localityGuess = adminPath[0] || null;
  if (!locality && localityGuess && !/borough|district/i.test(localityGuess))
    locality = localityGuess;

  return { locality, borough, city, region, country };
}

export function joinSearchText(adminPath: string[], extra: string[]) {
  return [...adminPath, ...extra].filter(Boolean).join(" ");
}

export function sanitizeHistoryHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "ul",
      "ol",
      "li",
      "a",
      "b",
      "strong",
      "i",
      "em",
      "blockquote",
      "h3",
      "h4",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "figure",
      "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      figure: ["class"],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" },
      }),
    },
  }).trim();
}

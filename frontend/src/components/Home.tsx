import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import StadiumCard from "@/components/StadiumCard";
import { SearchBar } from "@/components/ui/SearchBar";
import Hero from "@/components/Hero";

export default function Home() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const key = useMemo(() => ["stadiums", q, page, pageSize], [q, page]);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.listStadiums(q, page, pageSize)
  });

  return (
    <div className="space-y-10">
      <Hero
        title="Discover iconic arenas and hidden gems"
        subtitle="Explore facts, history, and fan-made media from stadiums around the world."
        actions={<SearchBar value={q} onChange={(v) => { setPage(1); setQ(v); }} placeholder="Search Wembley, Camp Nou, Allianz..." />}
        pills={
          <>
            <button className="pill hover:opacity-90" onClick={() => setQ("London")}>London</button>
            <button className="pill hover:opacity-90" onClick={() => setQ("Barcelona")}>Barcelona</button>
            <button className="pill hover:opacity-90" onClick={() => setQ("Munich")}>Munich</button>
          </>
        }
      />

      <section className="space-y-4">
        <div className="toolbar justify-between">
          <div className="text-sm opacity-80">Results{q ? ` for “${q}”` : ""}</div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <div className="text-sm opacity-70">Page {page}</div>
            <button
              className="btn-primary"
              disabled={!!data && data.items.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-video" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && <div className="text-red-600">Failed to load.</div>}

        {data && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((s: any) => (
              <div key={s.id} className="card card-raise overflow-hidden">
                <StadiumCard s={s} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

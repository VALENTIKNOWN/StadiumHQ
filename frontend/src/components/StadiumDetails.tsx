import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import MediaGrid from "@/components/MediaGrid";
import EmbedRenderer from "@/components/EmbedRenderer";
import { Calendar, MapPin, Ruler, Shield, User, Layers } from "lucide-react";


export default function StadiumDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stadium", id],
    queryFn: () => api.getStadium(id!),
    enabled: !!id
  });

  if (isLoading) return <div className="opacity-70">Loading...</div>;
  if (isError || !data) return <div className="text-red-600">Not found.</div>;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-default">
        <div className="relative h-72 md:h-96 bg-muted">
          {data.wikiImage && (
            <img src={data.wikiImage} alt={data.name} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-white">{data.name}</h1>
            <div className="mt-2 text-white/90 flex flex-wrap items-center gap-3 text-sm">
              <MapPin size={16} />
              <span>{data.city}, {data.country}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          {data.history && (
            <div className="card p-6 space-y-2">
              <h2>History</h2>
              <p className="opacity-90 leading-relaxed">{data.history}</p>
            </div>
          )}

          <div className="space-y-4">
            <h2>User Media</h2>
            <MediaGrid items={data.media || []} />
          </div>

          <div className="space-y-4">
            <h2>Social Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.embeds || []).map((e: any) => (
                <EmbedRenderer key={e.id} embed={e} />
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 h-max space-y-4">
          <div className="card p-6 space-y-4">
            <h3>Facts</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Capacity</span>
                <span>{data.capacity ? data.capacity.toLocaleString() : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Opened</span>
                <span>{data.openingDate ? new Date(data.openingDate).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Architect</span>
                <span>{data.architect || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Surface</span>
                <span>{data.surface || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Roof</span>
                <span>{data.roof || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="badge">Pitch</span>
                <span>{data.pitchDimensions || "—"}</span>
              </div>
            </div>
            {data.teams?.length ? (
              <div className="pt-2 text-sm">
                Tenants: {data.teams.map((t: any) => t.team.name).join(", ")}
              </div>
            ) : null}
            {data.wikiUrl ? (
              <a className="btn-primary w-full justify-center mt-2" href={data.wikiUrl} target="_blank" rel="noreferrer">
                Wikipedia Source
              </a>
            ) : null}
          </div>

          <div className="card p-4 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-1">
              <Calendar className="mx-auto opacity-70" size={18} />
              <div>Opened</div>
              <div className="font-medium">{data.openingDate ? new Date(data.openingDate).getFullYear() : "—"}</div>
            </div>
            <div className="space-y-1">
              <Ruler className="mx-auto opacity-70" size={18} />
              <div>Pitch</div>
              <div className="font-medium">{data.pitchDimensions || "—"}</div>
            </div>
            <div className="space-y-1">
              <Shield className="mx-auto opacity-70" size={18} />
              <div>Roof</div>
              <div className="font-medium">{data.roof || "—"}</div>
            </div>
            <div className="space-y-1">
              <User className="mx-auto opacity-70" size={18} />
              <div>Capacity</div>
              <div className="font-medium">{data.capacity ? data.capacity.toLocaleString() : "—"}</div>
            </div>
            <div className="space-y-1">
              <Layers className="mx-auto opacity-70" size={18} />
              <div>Surface</div>
              <div className="font-medium">{data.surface || "—"}</div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

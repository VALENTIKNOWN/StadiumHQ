import { Link } from "react-router-dom";
import { Stadium } from "../types/types";
import { MapPin, Users } from "lucide-react";

export default function StadiumCard({ s }: { s: Stadium }) {
  return (
    <Link to={`/stadiums/${s.id}`} className="group card overflow-hidden">
      <div className="relative aspect-video bg-muted">
        {s.wikiImage && (
          <img
            src={s.wikiImage}
            alt={s.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0" />
        <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-3">
          <h3 className="text-white text-lg font-semibold drop-shadow">{s.name}</h3>
          <span className="pill text-white/90">{s.capacity ? s.capacity.toLocaleString() : "—"}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <MapPin size={16} />
          <span>{s.city}, {s.country}</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Users size={14} />
          <span>{s.teams?.map(t => t.team.name).join(" • ") || "No listed tenants"}</span>
        </div>
      </div>
    </Link>
  );
}

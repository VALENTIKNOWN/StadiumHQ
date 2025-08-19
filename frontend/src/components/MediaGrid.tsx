import { MediaItem } from "@/types/types";

function Video({ url, title }: { url: string; title: string }) {
  let src = url;
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    if (id) src = `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
    src = `https://www.youtube.com/embed/${id}`;
  }
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full rounded-xl border border-default"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}

export default function MediaGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(m => (
        <div key={m.id} className="card overflow-hidden">
          {m.type === "IMAGE" && (
            <img src={m.url} alt={m.title} className="w-full h-48 object-cover" loading="lazy" />
          )}
          {m.type === "VIDEO" && (
            <div className="aspect-video">
              <Video url={m.url} title={m.title} />
            </div>
          )}
          {m.type === "TEXT" && (
            <div className="p-4">
              <h4 className="font-medium">{m.title}</h4>
              <p className="opacity-80">{m.description}</p>
            </div>
          )}
          {m.type === "AUDIO" && (
            <div className="p-4">
              <h4 className="font-medium">{m.title}</h4>
              <audio controls className="w-full">
                <source src={m.url} />
              </audio>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

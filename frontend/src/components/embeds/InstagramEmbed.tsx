import { useEffect } from "react";
import { loadExternalScript } from "../../lib/embedLoader";

export default function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    loadExternalScript("https://www.instagram.com/embed.js").then(() => {
      window.instgrm?.Embeds?.process();
    });
  }, [url]);
  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ background: "rgb(var(--background))", borderRadius: "0.75rem" }}
    ></blockquote>
  );
}

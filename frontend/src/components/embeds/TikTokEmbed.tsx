import { useEffect } from "react";
import { loadExternalScript } from "../../lib/embedLoader";

export default function TikTokEmbed({ url }: { url: string }) {
  useEffect(() => {
    loadExternalScript("https://www.tiktok.com/embed.js");
  }, [url]);
  return (
    <blockquote
      className="tiktok-embed"
      cite={url}
      data-video-id=""
      style={{ maxWidth: "605px", minWidth: "325px" }}
    >
      <a href={url} target="_blank" rel="noreferrer">{url}</a>
    </blockquote>
  );
}

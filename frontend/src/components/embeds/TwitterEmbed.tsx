import { useEffect, useRef } from "react";
import { loadExternalScript } from "../../lib/embedLoader";

export default function TwitterEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLQuoteElement | null>(null);
  useEffect(() => {
    loadExternalScript("https://platform.twitter.com/widgets.js").then(() => {
      window.twttr?.widgets?.load(ref.current || undefined);
    });
  }, [url]);
  return (
    <blockquote ref={ref} className="twitter-tweet">
      <a href={url} target="_blank" rel="noreferrer">{url}</a>
    </blockquote>
  );
}

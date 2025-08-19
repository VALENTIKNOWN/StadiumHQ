import { SocialEmbed } from "../types/types";
import TwitterEmbed from "./embeds/TwitterEmbed";
import InstagramEmbed from "./embeds/InstagramEmbed";
import TikTokEmbed from "./embeds/TikTokEmbed";

function YouTubeEmbed({ url }: { url: string }) {
  let id = "";
  if (url.includes("youtube.com/watch")) id = new URL(url).searchParams.get("v") || "";
  if (url.includes("youtu.be/")) id = url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (!id) return null;
  return (
    <iframe
      className="w-full aspect-video rounded-xl border border-default"
      src={`https://www.youtube.com/embed/${id}`}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="YouTube"
    />
  );
}

export default function EmbedRenderer({ embed }: { embed: SocialEmbed }) {
  if (embed.provider === "YOUTUBE") return <YouTubeEmbed url={embed.url} />;
  if (embed.provider === "TWITTER") return <TwitterEmbed url={embed.url} />;
  if (embed.provider === "INSTAGRAM") return <InstagramEmbed url={embed.url} />;
  if (embed.provider === "TIKTOK") return <TikTokEmbed url={embed.url} />;
  return (
    <a href={embed.url} target="_blank" rel="noreferrer" className="card p-4 block hover:opacity-90">
      <div className="text-sm font-medium">Open social post</div>
      <div className="text-xs opacity-70 break-words">{embed.url}</div>
    </a>
  );
}

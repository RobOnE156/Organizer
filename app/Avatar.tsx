import { initial } from "@/lib/timeline";

// Renders a member's avatar: their uploaded photo if present, otherwise the
// coloured initial. Pure/presentational — usable from server and client
// components. `className` picks the size (.ava / .cava / .ava-lg).
export default function Avatar({
  name,
  color,
  url,
  className = "ava",
}: {
  name: string;
  color: string;
  url?: string | null;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className + " avimg"} src={url} alt={name} />;
  }
  return (
    <span className={className} style={{ background: color }}>
      {initial(name)}
    </span>
  );
}

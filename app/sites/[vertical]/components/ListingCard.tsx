import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ListingCard(props: {
  href: string;
  title: string;
  priceLabel: string;
  meta?: string;
  coverUrl?: string | null;
  badges?: string[];
}) {
  const { href, title, priceLabel, meta, coverUrl, badges = [] } = props;

  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden rounded-2xl transition hover:shadow-md">
        <div className="aspect-[4/3] bg-muted">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-2 text-sm font-medium">{title}</div>
              {meta ? (
                <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
              ) : null}
            </div>

            <div className="shrink-0 text-sm font-semibold">{priceLabel}</div>
          </div>

          {badges.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.slice(0, 3).map((b) => (
                <Badge key={b} variant="secondary" className="rounded-full">
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
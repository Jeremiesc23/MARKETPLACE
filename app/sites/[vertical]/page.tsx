// app/sites/[vertical]/page.tsx
import { redirect } from "next/navigation";

export default async function SiteHomePage(props: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical } = await props.params;

  redirect(`/sites/${vertical}/listings`);
}
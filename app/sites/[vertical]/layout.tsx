// app/sites/[vertical]/layout.tsx
import { PublicHeader } from "@/components/public-header";
import { VerticalThemeProvider } from "./components/vertical-theme-provider";

export default async function SiteLayout(props: {
  children: React.ReactNode;
  params: Promise<{ vertical: string }>;
}) {
  const { vertical } = await props.params;

  return (
    <VerticalThemeProvider vertical={vertical}>
      <PublicHeader />
      {props.children}
    </VerticalThemeProvider>
  );
}
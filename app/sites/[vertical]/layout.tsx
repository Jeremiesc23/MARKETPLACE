// app/sites/[vertical]/layout.tsx
export default async function SiteLayout(props: {
  params: Promise<{ vertical: string }>;
  children: React.ReactNode;
}) {
  const { vertical } = await props.params;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>Sitio: {vertical}</div>
        <nav style={{ display: "flex", gap: 12 }}>
          <a href="/">Inicio</a>
          <a href="/listings">Listings</a>
          <a href="/login">Dashboard</a>
        </nav>
      </header>
      <hr style={{ margin: "16px 0" }} />
      {props.children}
    </div>
  );
}

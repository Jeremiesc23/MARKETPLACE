// app/sites/[vertical]/page.tsx
export default async function SiteHome(props: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await props.params;

  return (
    <main>
      <h1>{vertical}</h1>
      <p>Bienvenido al sitio.</p>
      <a href="/listings">Ver listings</a>
    </main>
  );
}

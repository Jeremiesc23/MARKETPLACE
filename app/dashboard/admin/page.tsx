import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FolderTree,
  ShieldCheck,
  Sparkles,
  Shapes,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const adminAreas = [
  {
    title: "Sitios",
    description:
      "Crea tenants, activa o desactiva subdominios y controla el acceso operativo de cada cliente.",
    href: "/admin/sites",
    cta: "Abrir sitios",
    icon: Building2,
    accent:
      "from-amber-100 via-white to-stone-100 text-amber-700 dark:from-amber-500/15 dark:via-zinc-900 dark:to-zinc-900 dark:text-amber-200",
    actions: [
      "Alta de nuevos tenants",
      "Edición de branding y datos del sitio",
      "Reset de credenciales del owner",
    ],
  },
  {
    title: "Categorías",
    description:
      "Organiza la taxonomía por vertical para mantener orden comercial y consistencia entre publicaciones.",
    href: "/admin/categories",
    cta: "Gestionar categorías",
    icon: FolderTree,
    accent:
      "from-sky-100 via-white to-slate-100 text-sky-700 dark:from-sky-500/15 dark:via-zinc-900 dark:to-zinc-900 dark:text-sky-200",
    actions: [
      "Estructura por vertical",
      "Slugs limpios para SEO y filtros",
      "Asignación de fields por categoría",
    ],
  },
  {
    title: "Fields",
    description:
      "Modela atributos reutilizables para que el catálogo escale sin improvisación ni deuda estructural.",
    href: "/admin/fields",
    cta: "Gestionar fields",
    icon: Shapes,
    accent:
      "from-emerald-100 via-white to-teal-100 text-emerald-700 dark:from-emerald-500/15 dark:via-zinc-900 dark:to-zinc-900 dark:text-emerald-200",
    actions: [
      "Definición de tipos y constraints",
      "Opciones reutilizables por vertical",
      "Aplicación masiva sobre categorías",
    ],
  },
];

const adminSteps = [
  {
    step: "01",
    title: "Crear tenant",
    description:
      "Da de alta el sitio, owner inicial y subdominio operativo antes de abrir catálogo.",
  },
  {
    step: "02",
    title: "Diseñar taxonomía",
    description:
      "Configura categorías y estructura comercial para que la búsqueda pública tenga sentido.",
  },
  {
    step: "03",
    title: "Modelar atributos",
    description:
      "Añade fields reutilizables para mantener calidad de datos y filtros más potentes.",
  },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-900/70 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_22%)]" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                Escovex Platform
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-zinc-300 bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300"
              >
                Root control plane
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                Centro de control para tenants, taxonomía y estructura del catálogo.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
                Este panel concentra la operación de plataforma. Desde aquí
                definimos qué sitios existen, cómo se organizan las categorías y
                qué fields sostienen la calidad del producto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-xl px-5 text-sm font-semibold">
                <Link href="/admin/sites/new">
                  Crear nuevo sitio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-zinc-300 bg-white/85 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Link href="/admin/sites">Ver tenants activos</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Área
                </div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Tenants
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Subdominios, owners y activación.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Área
                </div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Taxonomía
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Categorías limpias por vertical.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-zinc-950/60">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Área
                </div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Data model
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Fields y constraints reutilizables.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Operación recomendada
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Flujo limpio para escalar sin desorden.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {adminSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Paso {item.step}
                  </div>
                  <div className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/15 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <Sparkles className="h-4 w-4" />
                Buen patrón operativo
              </div>
              <p className="mt-1 text-sm leading-relaxed text-amber-700/90 dark:text-amber-100/90">
                Mantén el modelado de categorías y fields antes de abrir
                publicaciones masivas. Eso evita migraciones manuales después.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {adminAreas.map((area) => {
          const Icon = area.icon;

          return (
            <Card
              key={area.title}
              className="group overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_22px_60px_-50px_rgba(15,23,42,0.42)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-zinc-900/70"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${area.accent}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {area.title}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {area.description}
                </p>
              </div>

              <div className="mt-5 space-y-2">
                {area.actions.map((action) => (
                  <div
                    key={action}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-300"
                  >
                    {action}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between rounded-xl border-zinc-300 bg-white text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Link href={area.href}>
                    {area.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

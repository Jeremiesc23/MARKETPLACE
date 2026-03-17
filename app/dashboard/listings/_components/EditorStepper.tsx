"use client";

type StepItem = {
  label: string;
};

export function EditorStepper({
  steps,
  currentStep,
}: {
  steps: StepItem[];
  currentStep: number;
}) {
  const total = Math.max(steps.length, 1);
  const progress = Math.min(((currentStep + 1) / total) * 100, 100);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.9))] p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(39,39,42,0.96),rgba(24,24,27,0.98))]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-48 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            Flujo de publicacion
          </p>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
              Completa cada bloque antes de publicar
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Mantiene el contenido claro y evita pasos incompletos.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white" />
          Paso {Math.min(currentStep + 1, total)} de {total}
        </div>
      </div>

      <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-white"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const active = index === currentStep;
          const done = index < currentStep;

          return (
            <div
              key={step.label}
              className={[
                "flex items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-sm transition-all duration-200",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-900/15 dark:border-white dark:bg-white dark:text-zinc-950 dark:shadow-white/10"
                  : done
                    ? "border-zinc-200 bg-zinc-100/90 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                    : "border-zinc-200/80 bg-white/75 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-950"
                    : done
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
                ].join(" ")}
              >
                {done ? "OK" : String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                  Paso {index + 1}
                </div>
                <div className="truncate font-medium">{step.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
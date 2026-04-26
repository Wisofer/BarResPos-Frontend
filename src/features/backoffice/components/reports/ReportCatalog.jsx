import { ArrowRight, BarChart3 } from "lucide-react";
import { reportCards } from "../../utils/reportUtils.js";

export function ReportCatalog({ setActiveReport }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Reportes y exportación</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Elige un informe, aplica fechas y exporta a Excel cuando lo necesites.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const [iconBgClass, iconTextClass] = card.color.split(/\s+/);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveReport(card.id)}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-300 hover:shadow-md"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>
                <Icon className={`h-6 w-6 ${iconTextClass}`} />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{card.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
                <span>{card.button}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

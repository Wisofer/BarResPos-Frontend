import { Inbox } from "lucide-react";

export function EmptyState({ message, description, icon: Icon, action }) {
  const text = message != null ? message : "No tienes datos aún";
  const Ico = Icon || Inbox;
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Ico className="w-7 h-7" />
      </div>
      <p className="text-slate-700 dark:text-slate-200 font-medium">{text}</p>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

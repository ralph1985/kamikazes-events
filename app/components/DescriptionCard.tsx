type DescriptionCardProps = {
  subtitle: string;
  description?: string;
  chips?: string[];
};

export function DescriptionCard({ subtitle, description, chips = [] }: DescriptionCardProps) {
  return (
    <header className="space-y-3 bg-[#0b2447] border border-blue-500/70 rounded-2xl p-4 shadow-md text-slate-50">
      <h1 className="text-3xl font-bold text-slate-50 leading-tight">{subtitle}</h1>
      {description && <p className="text-slate-100/80 text-sm">{description}</p>}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-50">
          {chips.map((chip) => (
            <span key={chip} className="tag bg-white/10 border-blue-400 text-slate-50">
              {chip}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

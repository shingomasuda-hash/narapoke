export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1" aria-label={`ステップ ${step} / ${total}`}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-shu' : 'bg-sumi/15'}`} />
        ))}
      </div>
      <h1 className="font-serif text-xl font-bold text-sumi">{title}</h1>
    </div>
  );
}

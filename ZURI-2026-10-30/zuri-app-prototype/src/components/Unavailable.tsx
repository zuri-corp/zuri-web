export default function Unavailable({ title, detail, onBack }: { title: string; detail?: string; onBack: () => void }) {
  return <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center text-eco-text">
    <h2 className="font-display font-black text-xl">{title}</h2>
    {detail && <p className="font-body text-sm text-eco-muted">{detail}</p>}
    <button onClick={onBack} className="pressable px-5 py-3 rounded-xl bg-eco-surface2 font-body text-sm">Go back</button>
  </div>
}

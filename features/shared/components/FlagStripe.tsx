export function FlagStripe() {
  return (
    <div className="flex h-1.5 w-full" aria-hidden="true">
      <div className="flex-1 bg-ph-blue" />
      <div className="flex-1 bg-ph-red" />
      <div className="flex-1 bg-ph-gold" />
    </div>
  );
}

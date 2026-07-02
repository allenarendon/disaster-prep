export function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-ph-red/40 bg-ph-red-light p-4">
      <h3 className="font-semibold text-ph-red-dark">{title}</h3>
      <p className="mt-1 text-sm text-ph-red">{message}</p>
    </div>
  );
}

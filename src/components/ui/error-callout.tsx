export function ErrorCallout({ message }: { message: string }) {
  return (
    <div className="card">
      <p className="danger">{message}</p>
    </div>
  );
}

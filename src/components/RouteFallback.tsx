/** Fallback leve para chunks lazy — sem vinheta de boot (isso fica no ProtectedRoute). */
export default function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-label="Carregando">
      <span className="route-fallback__spin" aria-hidden />
    </div>
  );
}

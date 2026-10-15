import { useEffect, useState } from "react";
export default function CheckpointWindow({
  closesAt,
  offset = 0,
}: {
  closesAt?: string | null;
  offset?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [closesAt]);
  if (!closesAt) return null;
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(closesAt) - now - offset) / 1000),
  );
  return (
    <p role="timer" aria-label="Tempo restante da janela de presença">
      {seconds
        ? `Janela de registro: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} restantes`
        : "Janela encerrada. Novos registros serão recusados pelo servidor."}
    </p>
  );
}

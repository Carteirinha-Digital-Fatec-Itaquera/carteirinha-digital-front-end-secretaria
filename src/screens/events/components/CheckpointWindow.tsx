import { useEffect, useState } from "react";

function formatTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CheckpointWindow({
  closesAt,
  openedAt,
  isOpen,
  offset = 0,
}: {
  closesAt?: string | null;
  openedAt?: string | null;
  isOpen?: boolean;
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

  const formattedCloses = formatTime(closesAt);
  const formattedOpens = formatTime(openedAt);

  if (seconds === 0) {
    return (
      <p role="timer" aria-label="Tempo restante da janela de presença">
        Janela encerrada{formattedCloses ? ` às ${formattedCloses}` : ""}. Novos registros serão recusados pelo servidor.
      </p>
    );
  }

  const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} restantes`;

  return (
    <p role="timer" aria-label="Tempo restante da janela de presença">
      {isOpen
        ? `Janela de registro: ${remaining}${formattedCloses ? ` (até ${formattedCloses})` : ""}`
        : `Checkpoint fechado. ${formattedOpens ? `Aberto às ${formattedOpens}. ` : ""}Limite da janela: ${formattedCloses} (${remaining})`}
    </p>
  );
}

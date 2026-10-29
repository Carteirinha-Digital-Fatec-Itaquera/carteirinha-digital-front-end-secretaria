import { LoadingComp } from "../../../components/loading/LoadingComp";
import type { DraftRow } from "./participantDraftStore";
export default function CertificateBatchProgress({
  rows,
  busy,
  message,
  onPause,
}: {
  rows: DraftRow[];
  busy: boolean;
  message: string;
  onPause: () => void;
}) {
  const total = rows.filter(
    (row) => row.selected || row.status === "DONE",
  ).length;
  const done = rows.filter((row) =>
    ["DONE", "ERROR", "BLOCKED"].includes(row.status),
  ).length;
  return (
    <section
      className="regularization-progress"
      aria-label="Progresso das participações"
      aria-busy={busy}
    >
      <h3>Registro das participações</h3>
      {busy && <LoadingComp />}
      <p role="status">{message}</p>
      {total > 0 && (
        <>
          <progress
            aria-label="Registros processados"
            max={total}
            value={Math.min(done, total)}
          />
          <p>
            {done} de {total} registros processados ·{" "}
            {rows.filter((row) => row.status === "DONE").length} confirmados ·{" "}
            {rows.filter((row) => row.status === "ERROR").length} com falha.
          </p>
        </>
      )}
      {busy && (
        <button type="button" onClick={onPause}>
          Pausar após este registro
        </button>
      )}
      <p>
        A confirmação do registro não significa que o PDF esteja pronto ou que o
        e-mail tenha sido recebido.
      </p>
    </section>
  );
}

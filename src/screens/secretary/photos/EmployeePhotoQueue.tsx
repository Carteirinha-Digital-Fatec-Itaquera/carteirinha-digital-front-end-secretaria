import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../../../api/config/apiRequest";
import {
  getEmployeePhotos,
  getEmployeePhotoSummary,
  reviewEmployeePhoto,
  type PendingEmployeePhoto,
} from "../../../api/employee/employeePhotos";
import Modal from "../../../components/modal/Modal";
import EmployeePhotoPreview from "./EmployeePhotoPreview";
import styles from "./employeePhotos.module.css";

export default function EmployeePhotoQueue({
  onCount,
  onBusy,
}: {
  onCount: (count: number | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<PendingEmployeePhoto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selection, setSelection] = useState<{
    photo: PendingEmployeePhoto;
    approved: boolean;
  }>();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lifetime = useRef(new AbortController());

  const load = useCallback(
    async (next: string | null = null) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setError("");
      try {
        const [page, summary] = await Promise.all([
          getEmployeePhotos(next, request.signal),
          getEmployeePhotoSummary(request.signal),
        ]);
        if (request.signal.aborted) return;
        setItems((previous) =>
          next
            ? [
                ...previous,
                ...page.items.filter(
                  (item) =>
                    !previous.some((old) => old.photoId === item.photoId),
                ),
              ]
            : page.items,
        );
        setCursor(page.nextCursor);
        onCount(summary.pendingCount);
      } catch (cause) {
        if (!request.signal.aborted) {
          setError(
            (cause as Error).message || "Falha ao consultar as fotografias.",
          );
          onCount(null);
        }
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    },
    [onCount],
  );

  useEffect(() => {
    lifetime.current = new AbortController();
    void load();
    return () => {
      controller.current?.abort();
      lifetime.current.abort();
    };
  }, [load]);

  async function confirm() {
    if (!selection || inFlight.current) return;
    if (!selection.approved && reason.trim().length < 3) {
      setError("Informe um motivo de pelo menos 3 caracteres.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    setNotice("");
    try {
      await reviewEmployeePhoto(
        selection.photo,
        selection.approved,
        reason,
        lifetime.current.signal,
      );
      if (lifetime.current.signal.aborted) return;
      setNotice(
        selection.approved
          ? "Foto do funcionário aprovada."
          : "Foto do funcionário rejeitada.",
      );
      setSelection(undefined);
      await load();
    } catch (cause) {
      if (lifetime.current.signal.aborted) return;
      if (cause instanceof ApiRequestError && cause.status === 409) {
        setSelection(undefined);
        await load();
        setError(
          "A solicitação mudou. Confira a fila atualizada e confirme novamente.",
        );
      } else
        setError(
          (cause as Error).message || "Não foi possível avaliar a foto.",
        );
    } finally {
      inFlight.current = false;
      if (!lifetime.current.signal.aborted) {
        setBusy(false);
        onBusy(false);
      }
    }
  }

  return (
    <section
      aria-label="Fotografias de funcionários"
      className={styles.section}
    >
      <div className={styles.toolbar}>
        <h2>Funcionários</h2>
        <button
          className={styles.secondary}
          disabled={loading || busy}
          onClick={() => void load()}
        >
          {loading ? "Atualizando…" : "Atualizar pendências"}
        </button>
      </div>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {error && !selection && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={loading || busy} onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && <p role="status">Consultando fotografias de funcionários…</p>}
      {!loading && !error && items.length === 0 && (
        <p>Nenhuma fotografia de funcionário aguardando análise.</p>
      )}
      <div className={styles.grid}>
        {items.map((photo) => (
          <article className={styles.card} key={photo.photoId}>
            <EmployeePhotoPreview photo={photo} />
            <div className={styles.info}>
              <span className={styles.tag}>Funcionário · Em análise</span>
              <h3>{photo.displayName}</h3>
              {photo.employeeName !== photo.displayName && (
                <p>Nome completo: {photo.employeeName}</p>
              )}
              <dl>
                <div>
                  <dt>Matrícula funcional</dt>
                  <dd>{photo.registrationNumber || "Não informada"}</dd>
                </div>
                <div>
                  <dt>Enviada em</dt>
                  <dd>{new Date(photo.createdAt).toLocaleString("pt-BR")}</dd>
                </div>
              </dl>
              <Link
                to={"/funcionarios/" + encodeURIComponent(photo.employeeId)}
              >
                Consultar cadastro do funcionário
              </Link>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  disabled={busy || loading}
                  onClick={() => {
                    setError("");
                    setReason("");
                    setSelection({ photo, approved: true });
                  }}
                >
                  Aprovar foto
                </button>
                <button
                  className={styles.danger}
                  disabled={busy || loading}
                  onClick={() => {
                    setError("");
                    setReason("");
                    setSelection({ photo, approved: false });
                  }}
                >
                  Rejeitar foto
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {cursor && (
        <button
          className={styles.secondary}
          disabled={loading || busy}
          onClick={() => void load(cursor)}
        >
          Carregar mais fotografias
        </button>
      )}
      {selection && (
        <Modal
          label={
            selection.approved
              ? "Aprovar foto do funcionário"
              : "Rejeitar foto do funcionário"
          }
          onDismiss={
            busy
              ? undefined
              : () => {
                  setSelection(undefined);
                  setError("");
                }
          }
        >
          <form
            className={styles.confirmation}
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            <h2>
              {selection.approved
                ? "Aprovar fotografia?"
                : "Rejeitar fotografia?"}
            </h2>
            <p>
              <strong>{selection.photo.displayName}</strong>
            </p>
            <p>
              {selection.approved
                ? "A imagem passará a ser a foto aprovada da carteirinha. O QR continuará sujeito às demais regras do vínculo."
                : "A pessoa poderá consultar o motivo da rejeição e enviar outra imagem. Uma foto aprovada anteriormente será preservada."}
            </p>
            {!selection.approved && (
              <label>
                Motivo da rejeição
                <textarea
                  autoFocus
                  required
                  minLength={3}
                  maxLength={500}
                  disabled={busy}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            )}
            {error && <p role="alert">{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                autoFocus={selection.approved}
                disabled={busy}
                onClick={() => {
                  setSelection(undefined);
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button
                className={selection.approved ? styles.primary : styles.danger}
                disabled={busy}
              >
                {busy
                  ? "Salvando…"
                  : selection.approved
                    ? "Confirmar aprovação"
                    : "Confirmar rejeição"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

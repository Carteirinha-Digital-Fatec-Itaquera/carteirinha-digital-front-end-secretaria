import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../../../api/config/apiRequest";
import {
  getEmployeePhotos,
  getEmployeePhotoSummary,
  reviewEmployeePhoto,
  isOptionalPhotoReasonEnabled,
  type PendingEmployeePhoto,
} from "../../../api/employee/employeePhotos";
import { ButtonComp } from "../../../components/button/ButtonComp";
import MessageModal from "../../../components/messageModal/MessageModal";
import Modal from "../../../components/modal/Modal";
import EmployeePhotoPreview from "./EmployeePhotoPreview";
import studentStyles from "./style.module.css";
import styles from "./employeePhotos.module.css";
const keyOf = (photo: PendingEmployeePhoto) =>
  photo.employeeId + "/" + photo.photoId;
type Decision = {
  photos: PendingEmployeePhoto[];
  approved: boolean;
  batch: boolean;
};
type Outcome = {
  message: string;
  details: string[];
  tone: "success" | "warning" | "error";
};

export default function EmployeePhotoQueue({
  onCount,
  onBusy,
}: {
  onCount: (count: number | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const optionalPhotoReasonEnabled = isOptionalPhotoReasonEnabled();
  const [items, setItems] = useState<PendingEmployeePhoto[]>([]);
  const [selected, setSelected] = useState<Map<string, PendingEmployeePhoto>>(
    new Map(),
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<Decision>();
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<Outcome>();
  const pages = useRef(1),
    inFlight = useRef(false),
    restoreFocus = useRef(false);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null),
    lifetime = useRef(new AbortController());
  const load = useCallback(
    async (next: string | null = null) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setError("");
      try {
        const readPages = async () => {
          let page = await getEmployeePhotos(next, request.signal);
          const results = [...page.items];
          if (!next)
            for (let i = 1; i < pages.current && page.nextCursor; i++) {
              page = await getEmployeePhotos(page.nextCursor, request.signal);
              results.push(...page.items);
            }
          return { items: results, nextCursor: page.nextCursor };
        };
        const [page, summary] = await Promise.all([
          readPages(),
          getEmployeePhotoSummary(request.signal),
        ]);
        if (request.signal.aborted) return;
        if (next) pages.current++;
        setItems((previous) => {
          const merged = next ? [...previous, ...page.items] : page.items;
          return [
            ...new Map(merged.map((item) => [keyOf(item), item])).values(),
          ];
        });
        // Atualização completa relê o mesmo número de páginas; só versões confirmadas permanecem selecionadas.
        setSelected(
          (previous) =>
            new Map(
              [...previous].filter(([key, old]) => {
                const current = page.items.find((item) => keyOf(item) === key);
                return next && !current
                  ? true
                  : !!current &&
                      current.employeeVersion === old.employeeVersion;
              }),
            ),
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
  useEffect(() => {
    if (!outcome && !loading && !busy && restoreFocus.current) {
      restoreFocus.current = false;
      refreshButton.current?.focus({ preventScroll: true });
    }
  });
  const toggle = (photo: PendingEmployeePhoto) =>
    setSelected((previous) => {
      const next = new Map(previous);
      const key = keyOf(photo);
      if (next.has(key)) next.delete(key);
      else next.set(key, photo);
      return next;
    });
  const open = (
    photos: PendingEmployeePhoto[],
    approved: boolean,
    batch = false,
  ) => {
    if (busy || loading || !photos.length) return;
    setReason("");
    setError("");
    setDecision({ photos: [...photos], approved, batch });
  };
  async function confirm() {
    if (!decision || inFlight.current || outcome) return;
    if (!decision.approved && !reason.trim() && !optionalPhotoReasonEnabled) {
      setError(
        "Envio sem motivo temporariamente indisponível. Informe um motivo ou tente novamente mais tarde.",
      );
      return;
    }
    if (reason.trim() && reason.trim().length < 3) {
      setError("Quando informado, o motivo deve ter pelo menos 3 caracteres.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    const successes = new Set<string>();
    const failures: Array<{ photo: PendingEmployeePhoto; message: string }> =
      [];
    try {
      for (let index = 0; index < decision.photos.length; index++) {
        if (lifetime.current.signal.aborted) return;
        const photo = decision.photos[index];
        setProgress(
          "Avaliando " + (index + 1) + " de " + decision.photos.length + "…",
        );
        try {
          await reviewEmployeePhoto(
            photo,
            decision.approved,
            reason,
            lifetime.current.signal,
          );
          successes.add(keyOf(photo));
        } catch (cause) {
          if (lifetime.current.signal.aborted) return;
          const failure = cause as Error;
          failures.push({
            photo,
            message:
              cause instanceof ApiRequestError && cause.status === 409
                ? "Conflito de versão. Confira a fila atualizada e selecione novamente."
                : failure.message || "Falha na avaliação.",
          });
          if (
            cause instanceof ApiRequestError &&
            (cause.status === 401 || cause.status === 403)
          ) {
            failures.push(
              ...decision.photos.slice(index + 1).map((photo) => ({
                photo,
                message:
                  "Não enviada porque a sessão ou a permissão foi encerrada.",
              })),
            );
            break;
          }
        }
      }
      if (lifetime.current.signal.aborted) return;
      setItems((previous) =>
        previous.filter((item) => !successes.has(keyOf(item))),
      );
      setSelected(
        (previous) =>
          new Map([...previous].filter(([key]) => !successes.has(key))),
      );
      setDecision(undefined);
      onCount(null);
      await load();
      if (lifetime.current.signal.aborted) return;
      const all = successes.size === decision.photos.length;
      setOutcome({
        tone: all ? "success" : successes.size ? "warning" : "error",
        message: all
          ? decision.batch
            ? decision.approved
              ? "Fotos aprovadas com sucesso!"
              : "Fotos reprovadas com sucesso!"
            : decision.approved
              ? "Foto aprovada com sucesso!"
              : "Foto reprovada com sucesso!"
          : successes.size +
            " avaliação(ões) concluída(s); " +
            failures.length +
            " não concluída(s).",
        details: failures.map((f) => f.photo.displayName + ": " + f.message),
      });
    } finally {
      inFlight.current = false;
      if (!lifetime.current.signal.aborted) {
        setBusy(false);
        onBusy(false);
        setProgress("");
      }
    }
  }
  const disabled = busy || loading;
  return (
    <section
      aria-label="Fotografias de funcionários"
      className={styles.section}
    >
      <div className={styles.toolbar}>
        <h2>Funcionários</h2>
        <button
          ref={refreshButton}
          className={styles.secondary}
          disabled={disabled}
          onClick={() => void load()}
        >
          {loading ? "Atualizando…" : "Atualizar pendências"}
        </button>
      </div>
      <div
        className={studentStyles.bulkActions}
        aria-label="Avaliação de fotografias selecionadas"
      >
        <div className={studentStyles.bulkActionsLeft}>
          <ButtonComp
            text="Selecionar todos"
            disabled={disabled || !items.length}
            onClick={() =>
              setSelected(new Map(items.map((photo) => [keyOf(photo), photo])))
            }
          />
          <ButtonComp
            text="Desselecionar todos"
            disabled={disabled || !selected.size}
            onClick={() => setSelected(new Map())}
          />
        </div>
        <div className={studentStyles.bulkActionsRight}>
          <ButtonComp
            text={"Aprovar selecionados (" + selected.size + ")"}
            color="#0f5561"
            disabled={disabled || !selected.size}
            onClick={() => open([...selected.values()], true, true)}
          />
          <ButtonComp
            text={"Reprovar selecionados (" + selected.size + ")"}
            color="#640a0a"
            disabled={disabled || !selected.size}
            onClick={() => open([...selected.values()], false, true)}
          />
        </div>
      </div>
      <p className={styles.scope}>
        A seleção abrange as fotografias carregadas nesta lista, incluindo as
        páginas adicionais. Versões alteradas precisam ser selecionadas
        novamente.
      </p>
      {progress && (
        <p role="status" className={styles.progress}>
          {progress}
        </p>
      )}
      {outcome && (
        <MessageModal
          visible
          tone={outcome.tone}
          title="Resultado da avaliação"
          message={outcome.message}
          details={outcome.details}
          confirmText="OK"
          onConfirm={() => {
            restoreFocus.current = true;
            setOutcome(undefined);
          }}
          onDismiss={() => {
            restoreFocus.current = true;
            setOutcome(undefined);
          }}
        />
      )}
      {error && !decision && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={disabled} onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && <p role="status">Consultando fotografias de funcionários…</p>}
      {!loading && !error && !items.length && (
        <p>Nenhuma fotografia de funcionário aguardando análise.</p>
      )}
      <div className={styles.grid}>
        {items.map((photo) => (
          <article
            key={keyOf(photo)}
            aria-label={"Fotografia de " + photo.displayName}
            className={
              styles.card +
              " " +
              styles.selectable +
              " " +
              (selected.has(keyOf(photo)) ? studentStyles.cardSelected : "")
            }
            onClick={(event) => {
              if (
                !disabled &&
                !(event.target as HTMLElement).closest(
                  "button,a,input,textarea",
                )
              )
                toggle(photo);
            }}
          >
            <EmployeePhotoPreview photo={photo} />
            <input
              className={styles.checkbox}
              type="checkbox"
              aria-label={"Selecionar foto de " + photo.displayName}
              checked={selected.has(keyOf(photo))}
              disabled={disabled}
              onChange={() => toggle(photo)}
            />
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
              <div className={styles.individualActions}>
                <button
                  className={styles.approve}
                  disabled={disabled}
                  onClick={() => open([photo], true)}
                >
                  Aprovar foto
                </button>
                <button
                  className={styles.reject}
                  disabled={disabled}
                  onClick={() => open([photo], false)}
                >
                  Reprovar foto
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {cursor && (
        <button
          className={styles.secondary}
          disabled={disabled}
          onClick={() => void load(cursor)}
        >
          Carregar mais fotografias
        </button>
      )}
      {decision && (
        <Modal
          label={
            decision.batch
              ? decision.approved
                ? "Aprovar fotos selecionadas"
                : "Reprovar fotos selecionadas"
              : decision.approved
                ? "Aprovar foto do funcionário"
                : "Reprovar foto do funcionário"
          }
          onDismiss={
            busy
              ? undefined
              : () => {
                  setDecision(undefined);
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
              {decision.approved
                ? "Aprovar fotografia(s)?"
                : "Reprovar fotografia(s)?"}
            </h2>
            <p>
              {decision.batch
                ? decision.photos.length + " fotografia(s) selecionada(s)."
                : decision.photos[0].displayName}
            </p>
            <p>
              {decision.approved
                ? "As imagens aprovadas serão utilizadas nas carteirinhas, respeitando as demais regras do vínculo."
                : "Uma fotografia aprovada anteriormente será preservada. O motivo é opcional."}
            </p>
            {!decision.approved && (
              <label>
                Motivo da reprovação (opcional)
                <textarea
                  autoFocus
                  maxLength={500}
                  disabled={busy}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                {!optionalPhotoReasonEnabled && (
                  <span>Envio sem motivo temporariamente indisponível.</span>
                )}
              </label>
            )}
            {error && <p role="alert">{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                autoFocus={decision.approved}
                disabled={busy}
                onClick={() => {
                  setDecision(undefined);
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button
                className={decision.approved ? styles.primary : styles.danger}
                disabled={busy}
              >
                {busy
                  ? "Salvando…"
                  : decision.approved
                    ? "Confirmar aprovação"
                    : "Confirmar reprovação"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

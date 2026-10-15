import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MenuLateral from "../../components/menuLateral/MenuLateral";
import {
  management,
  openManagementPdf,
  uploadAsset,
  type Catalog,
  type Participant,
  type AuditEntry,
  type Template,
} from "../../api/event/publicEventService";
import layout from "../../styles/layoutWithMenu.module.css";
import styles from "./PublicEventsAdminScreen.module.css";

type Tab = "editions" | "models" | "signers" | "configuration" | "operation";
const localDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const value = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
export default function PublicEventsAdminScreen() {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>(id ? "operation" : "editions"),
    [catalog, setCatalog] = useState<Catalog>({
      series: [],
      templates: [],
      signers: [],
      events: [],
    });
  const [eventId, setEventId] = useState(id || ""),
    [editionId, setEditionId] = useState(""),
    [template, setTemplate] = useState<Template | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]),
    [audit, setAudit] = useState<AuditEntry[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [signerIds, setSignerIds] = useState<string[]>([]),
    [manual, setManual] = useState<Participant | null>(null),
    [winner, setWinner] = useState(""),
    [raffling, setRaffling] = useState(false);
  const [speakerSignerIds, setSpeakerSignerIds] = useState<string[]>([]);
  const manualDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = manualDialog.current;
    if (manual) dialog?.showModal();
    return () => dialog?.close();
  }, [manual]);
  const edition = catalog.series.find((s) => s.id === editionId);
  const load = async () => setCatalog(await management<Catalog>("catalog"));
  useEffect(() => {
    const controller = new AbortController();
    void management<Catalog>("catalog", undefined, "GET", controller.signal)
      .then(setCatalog)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Falha de conexão.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (tab !== "operation" || !eventId) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        if (!document.hidden) {
          const [people, history] = await Promise.all([
            management<Participant[]>(
              `events/${eventId}/participants`,
              undefined,
              "GET",
              controller.signal,
            ),
            management<AuditEntry[]>(
              `events/${eventId}/audit`,
              undefined,
              "GET",
              controller.signal,
            ),
          ]);
          setParticipants(people);
          setAudit(history);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Erro ao carregar participantes.",
          );
      } finally {
        if (!controller.signal.aborted)
          timer = window.setTimeout(() => void poll(), 15000);
      }
    };
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [eventId, tab]);
  async function act(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  function selectedSigners(speaker = false) {
    const selection = speaker ? speakerSignerIds : signerIds;
    const updateSelection = speaker ? setSpeakerSignerIds : setSignerIds;
    return (
      <fieldset className={styles.choices}>
        <legend>
          {speaker
            ? "Assinantes de palestrante (opcional; herda os demais se vazio)"
            : "Assinantes de participante / prévia (até três)"}
        </legend>
        {catalog.signers
          .filter((s) => !s.archived)
          .map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={selection.includes(s.id)}
                onChange={(e) =>
                  updateSelection((previous) =>
                    e.target.checked
                      ? [...previous, s.id]
                      : previous.filter((v) => v !== s.id),
                  )
                }
              />
              {s.name} — {s.title}
            </label>
          ))}
      </fieldset>
    );
  }
  async function saveEdition(form: HTMLFormElement) {
    const data = new FormData(form);
    await management(
      editionId ? `series/${editionId}` : "series",
      {
        title: value(data, "title"),
        slug: value(data, "slug"),
        startsAt: new Date(value(data, "startsAt")).toISOString(),
        endsAt: new Date(value(data, "endsAt")).toISOString(),
        published: data.has("published"),
        cpfRequired: data.has("cpfRequired"),
        courses: value(data, "courses")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
      },
      editionId ? "PATCH" : "POST",
    );
    setMessage(
      "Edição salva. O prazo operacional é de 30 dias após o encerramento.",
    );
  }
  async function saveTemplate(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("background") as File;
    let backgroundAssetId = template?.config.backgroundAssetId;
    if (file?.size)
      backgroundAssetId = (await uploadAsset(file, "BACKGROUND")).id;
    await management("templates", {
      name: value(data, "name"),
      role: value(data, "role"),
      heading: value(data, "heading"),
      edition: value(data, "edition"),
      backgroundAssetId,
    });
    setMessage(
      "Nova versão salva como rascunho. Confira o PDF antes de publicar.",
    );
  }
  async function saveSigner(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("signature") as File;
    if (!file?.size) throw new Error("Selecione a imagem autorizada.");
    const asset = await uploadAsset(file, "SIGNATURE");
    await management("signers", {
      name: value(data, "name"),
      title: value(data, "title"),
      course: value(data, "course") || undefined,
      assetId: asset.id,
      authorized: data.has("authorized"),
    });
    setMessage(
      "Responsável e assinatura cadastrados. Para substituir, crie uma nova versão e arquive a anterior.",
    );
  }
  async function configure(form: HTMLFormElement) {
    const data = new FormData(form);
    const latitude = value(data, "latitude");
    await management(`events/${eventId}/configure`, {
      seriesId: value(data, "seriesId"),
      visitorsAllowed: data.has("visitorsAllowed"),
      organizerCourse: value(data, "organizerCourse"),
      promoter: value(data, "promoter") || undefined,
      windowMinutes: 15,
      attendeeTemplateId: value(data, "attendeeTemplateId"),
      speakerTemplateId: value(data, "speakerTemplateId"),
      signerIds,
      ...(speakerSignerIds.length ? { speakerSignerIds } : {}),
      geoPolicy: latitude
        ? {
            latitude: Number(latitude),
            longitude: Number(value(data, "longitude")),
            radius: Number(value(data, "radius")),
            maxAccuracy: Number(value(data, "maxAccuracy")),
          }
        : null,
    });
    setMessage(
      "Atividade configurada. Faça um piloto presencial antes de abrir ao público.",
    );
  }
  async function raffle() {
    if (raffling) return;
    setRaffling(true);
    setError("");
    try {
      const people = await management<Participant[]>(
        `events/${eventId}/participants`,
      );
      setParticipants(people);
      const eligible = people.filter(
        (p) => p.attendance?.status === "CONFIRMED",
      );
      if (!eligible.length)
        throw new Error("Nenhuma presença confirmada para o sorteio.");
      const random = new Uint32Array(1);
      const limit = Math.floor(4294967296 / eligible.length) * eligible.length;
      do {
        crypto.getRandomValues(random);
      } while (random[0] >= limit);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setWinner(eligible[random[0] % eligible.length].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no sorteio.");
    } finally {
      setRaffling(false);
    }
  }
  return (
    <div className={layout.layoutContainer}>
      <div className={layout.menuWrapper}>
        <MenuLateral />
      </div>
      <main className={`${layout.contentWrapper} ${styles.page}`}>
        <header>
          <Link to="/eventos">Voltar aos eventos</Link>
          <h1>Eventos públicos e certificados</h1>
          <p>
            Organize edições, modelos e responsáveis. Os cadastros utilizam a
            API real.
          </p>
        </header>
        <nav className={styles.tabs} aria-label="Gestão de eventos públicos">
          {(
            [
              ["editions", "Edições"],
              ["models", "Modelos"],
              ["signers", "Assinaturas"],
              ["configuration", "Configurar atividade"],
              ["operation", "Participantes e histórico"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={styles.success}>
            {message}
          </p>
        )}
        {tab === "editions" && (
          <section className={styles.card}>
            <h2>Edição da Semana</h2>
            <label>
              Editar edição
              <select
                value={editionId}
                onChange={(e) => setEditionId(e.target.value)}
              >
                <option value="">Nova edição</option>
                {catalog.series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.purgedAt ? " — arquivo histórico" : ""}
                  </option>
                ))}
              </select>
            </label>
            <form
              key={editionId}
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                void act(() => saveEdition(form));
              }}
            >
              <label>
                Título
                <input
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={edition?.title}
                />
              </label>
              <label>
                Endereço público (slug)
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  defaultValue={edition?.slug}
                  placeholder="xiii-semana-tecnologia"
                />
              </label>
              <div className={styles.grid}>
                <label>
                  Início
                  <input
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={edition ? localDate(edition.startsAt) : ""}
                  />
                </label>
                <label>
                  Encerramento
                  <input
                    name="endsAt"
                    type="datetime-local"
                    required
                    defaultValue={edition ? localDate(edition.endsAt) : ""}
                  />
                </label>
              </div>
              <label>
                Cursos organizadores (um por linha)
                <textarea
                  name="courses"
                  required
                  defaultValue={edition?.courses.join("\n")}
                  rows={4}
                  maxLength={4000}
                />
              </label>
              <label className={styles.check}>
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={edition?.published}
                />
                Disponibilizar programação e inscrições públicas
              </label>
              <label className={styles.check}>
                <input
                  name="cpfRequired"
                  type="checkbox"
                  defaultChecked={edition?.cpfRequired}
                />
                Exigir CPF conforme a política aprovada da edição (somente
                identificador protegido; não será impresso)
              </label>
              <p>
                O histórico mínimo e os certificados serão preservados. Contatos
                e sessões de visitantes serão eliminados 30 dias após o
                encerramento.
              </p>
              <button disabled={busy || Boolean(edition?.purgedAt)}>
                Salvar edição
              </button>
            </form>
          </section>
        )}
        {tab === "models" && (
          <>
            <section className={styles.card}>
              <h2>
                {template ? "Criar nova versão do modelo" : "Cadastrar modelo"}
              </h2>
              <p>
                O modelo padrão reproduz o PDF aprovado com os elementos
                gráficos originais, sem os dados e a assinatura do exemplo. Uma
                arte limpa alternativa é opcional (PNG/JPEG até 2 MB).
              </p>
              <form
                key={template?.id || "new"}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  void act(() => saveTemplate(form));
                }}
              >
                <label>
                  Nome do modelo
                  <input
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={template?.name}
                  />
                </label>
                <label>
                  Papel
                  <select
                    name="role"
                    defaultValue={template?.role || "ATTENDEE"}
                  >
                    <option value="ATTENDEE">Participante/ouvinte</option>
                    <option value="SPEAKER">Palestrante</option>
                  </select>
                </label>
                <label>
                  Título no certificado
                  <input
                    name="heading"
                    required
                    maxLength={160}
                    defaultValue={template?.config.heading || "CERTIFICADO"}
                  />
                </label>
                <label>
                  Edição no texto
                  <input
                    name="edition"
                    required
                    maxLength={200}
                    defaultValue={
                      template?.config.edition ||
                      "XIII Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'"
                    }
                  />
                </label>
                <label>
                  Arte limpa
                  <input
                    type="file"
                    name="background"
                    accept="image/png,image/jpeg"
                  />
                </label>
                <button disabled={busy}>Salvar nova versão em rascunho</button>
                {template && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setTemplate(null)}
                  >
                    Novo modelo
                  </button>
                )}
              </form>
            </section>
            <section className={styles.card}>
              <h2>Modelos e versões</h2>
              {selectedSigners()}
              {catalog.templates.map((t) => (
                <article key={t.id} className={styles.row}>
                  <h3>
                    {t.name} · v{t.version}
                  </h3>
                  <p>
                    {t.role === "SPEAKER"
                      ? "Palestrante"
                      : "Participante/ouvinte"}{" "}
                    · {t.status}
                  </p>
                  <div className={styles.actions}>
                    <button
                      disabled={busy || !signerIds.length}
                      className={styles.secondary}
                      onClick={() =>
                        void act(async () => {
                          await openManagementPdf(`templates/${t.id}/preview`, {
                            signerIds,
                          });
                        })
                      }
                    >
                      Baixar prévia sem validade
                    </button>
                    <button
                      disabled={busy}
                      className={styles.secondary}
                      onClick={() => setTemplate(t)}
                    >
                      Criar versão a partir desta
                    </button>
                    {t.status === "DRAFT" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await management(`templates/${t.id}/publish`, {});
                            setMessage("Modelo publicado.");
                          })
                        }
                      >
                        Publicar versão
                      </button>
                    )}
                    {t.status !== "ARCHIVED" && (
                      <button
                        disabled={busy}
                        className={styles.secondary}
                        onClick={() =>
                          void act(async () => {
                            await management(`templates/${t.id}/archive`, {});
                            setMessage(
                              "Modelo arquivado para novas configurações. Atividades já configuradas preservam a versão escolhida.",
                            );
                          })
                        }
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
        {tab === "signers" && (
          <>
            <section className={styles.card}>
              <h2>Cadastrar responsável e assinatura</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  void act(() => saveSigner(form));
                }}
              >
                <label>
                  Nome completo
                  <input name="name" required maxLength={160} />
                </label>
                <label>
                  Cargo exibido no certificado
                  <textarea name="title" required maxLength={160} rows={3} />
                </label>
                <label>
                  Curso
                  <input name="course" maxLength={120} />
                </label>
                <label>
                  Assinatura PNG/JPEG até 2 MB
                  <input
                    name="signature"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                  />
                </label>
                <label className={styles.check}>
                  <input type="checkbox" name="authorized" required />
                  Confirmo que há autorização para utilizar esta assinatura nos
                  certificados.
                </label>
                <p>
                  A imagem de assinatura não equivale a assinatura digital
                  criptográfica.
                </p>
                <button disabled={busy}>Cadastrar assinatura autorizada</button>
              </form>
            </section>
            <section className={styles.card}>
              <h2>Responsáveis cadastrados</h2>
              {catalog.signers.map((s) => (
                <article key={s.id} className={styles.row}>
                  <h3>{s.name}</h3>
                  <p>
                    {s.title} · {s.course || "Institucional"} ·{" "}
                    {s.archived ? "Arquivado" : "Disponível"}
                  </p>
                  {!s.archived && (
                    <button
                      disabled={busy}
                      className={styles.secondary}
                      onClick={() =>
                        void act(async () => {
                          await management(`signers/${s.id}/archive`, {});
                          setMessage(
                            "Assinatura arquivada para novas configurações. Atividades e certificados existentes preservam a versão escolhida.",
                          );
                        })
                      }
                    >
                      Arquivar para novas configurações
                    </button>
                  )}
                </article>
              ))}
            </section>
          </>
        )}
        {tab === "configuration" && (
          <section className={styles.card}>
            <h2>Configuração da atividade</h2>
            <label>
              Atividade
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">Selecione</option>
                {catalog.events
                  .filter((e) => e.status === "SCHEDULED")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                void act(() => configure(form));
              }}
            >
              <label>
                Edição
                <select
                  name="seriesId"
                  required
                  value={editionId}
                  onChange={(e) => setEditionId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {catalog.series
                    .filter((s) => !s.purgedAt)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Curso organizador
                <select
                  name="organizerCourse"
                  required
                  onChange={(e) => {
                    const defaults = catalog.signers
                      .filter((s) => !s.archived && s.course === e.target.value)
                      .slice(0, 3)
                      .map((s) => s.id);
                    setSignerIds(defaults);
                    setSpeakerSignerIds([]);
                  }}
                >
                  <option value="">Selecione</option>
                  {edition?.courses.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Empresa promotora (opcional)
                <input name="promoter" maxLength={160} />
              </label>
              <label className={styles.check}>
                <input name="visitorsAllowed" type="checkbox" />
                Permitir participação de visitantes
              </label>
              <div className={styles.grid}>
                {(["ATTENDEE", "SPEAKER"] as const).map((role) => (
                  <label key={role}>
                    Modelo de{" "}
                    {role === "ATTENDEE" ? "participante" : "palestrante"}
                    <select
                      name={
                        role === "ATTENDEE"
                          ? "attendeeTemplateId"
                          : "speakerTemplateId"
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {catalog.templates
                        .filter(
                          (t) => t.status === "PUBLISHED" && t.role === role,
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} · v{t.version}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
              {selectedSigners()}
              {selectedSigners(true)}
              <fieldset>
                <legend>Localização (preencha todos para exigir GPS)</legend>
                <div className={styles.grid}>
                  <label>
                    Latitude
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                    />
                  </label>
                  <label>
                    Raio em metros
                    <input name="radius" type="number" min={10} max={5000} />
                  </label>
                  <label>
                    Precisão máxima em metros
                    <input
                      name="maxAccuracy"
                      type="number"
                      min={1}
                      max={5000}
                    />
                  </label>
                </div>
                <p>
                  Calibre com aparelhos reais no auditório. Falhas exigem
                  registro presencial com justificativa.
                </p>
              </fieldset>
              <p>
                Entrada e saída terão janelas de 15 minutos a partir da abertura
                de cada checkpoint. O QR mantém sua validade curta.
              </p>
              <button disabled={busy || !eventId}>Salvar configuração</button>
              {eventId && (
                <Link to={`/eventos/${eventId}/gerenciar`}>
                  Abrir gerenciador e projeção do QR
                </Link>
              )}
            </form>
          </section>
        )}
        {tab === "operation" && (
          <>
            <section className={styles.card}>
              <h2>Participantes e certificados</h2>
              <label>
                Atividade
                <select
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setParticipants([]);
                    setAudit([]);
                  }}
                >
                  <option value="">Selecione</option>
                  {catalog.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </label>
              {eventId && (
                <Link to={`/eventos/${eventId}/gerenciar`}>
                  Gerenciar checkpoints e QR
                </Link>
              )}
              <p>
                Atualização a cada 15 segundos com a tela visível.{" "}
                {
                  participants.filter(
                    (p) => p.attendance?.status === "CONFIRMED",
                  ).length
                }{" "}
                presenças confirmadas.
              </p>
              <div className={styles.actions}>
                <button
                  disabled={!eventId || raffling}
                  onClick={() => void raffle()}
                >
                  {raffling
                    ? "Sorteando..."
                    : "Sortear entre presenças confirmadas"}
                </button>
                <button
                  disabled={!eventId || busy}
                  className={styles.secondary}
                  onClick={() => {
                    const csv = [
                      "Nome,Curso,Papel,Entrada,Saída,Certificado",
                      ...participants.map((p) =>
                        [
                          p.name,
                          p.course || "",
                          p.role,
                          p.attendance?.checkInAt || "",
                          p.attendance?.checkOutAt || "",
                          p.certificate?.verificationCode || "",
                        ]
                          .map(
                            (v) =>
                              `"${(/^[=+@-]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}"`,
                          )
                          .join(","),
                      ),
                    ].join("\r\n");
                    const url = URL.createObjectURL(
                      new Blob(["\uFEFF" + csv], {
                        type: "text/csv;charset=utf-8",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "participantes.csv";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Exportar lista mínima
                </button>
              </div>
              {winner && (
                <p role="status">
                  Sorteado: {winner}. O sorteio é local e não registra
                  premiação.
                </p>
              )}
              {participants.map((p) => (
                <article key={p.id} className={styles.row}>
                  <h3>{p.name}</h3>
                  <p>
                    {p.course || "Participante/ouvinte"} ·{" "}
                    {p.visitorId ? "Visitante" : "Aluno"} ·{" "}
                    {p.role === "SPEAKER" ? "Palestrante" : "Participante"}
                  </p>
                  <p>
                    Entrada:{" "}
                    {p.attendance?.checkInAt
                      ? new Date(p.attendance.checkInAt).toLocaleString("pt-BR")
                      : "Pendente"}{" "}
                    · Saída:{" "}
                    {p.attendance?.checkOutAt
                      ? new Date(p.attendance.checkOutAt).toLocaleString(
                          "pt-BR",
                        )
                      : "Pendente"}
                  </p>
                  <p>
                    Certificado:{" "}
                    {p.certificate?.revokedAt
                      ? "Revogado"
                      : p.certificate?.artifact?.state || "Ainda não emitido"}
                  </p>
                  <div className={styles.actions}>
                    <button
                      disabled={busy}
                      className={styles.secondary}
                      onClick={() => {
                        setError("");
                        setManual(p);
                      }}
                    >
                      Registro presencial / alterar papel
                    </button>
                    {p.certificate &&
                      !p.certificate.revokedAt &&
                      (p.certificate.artifact?.state === "RENDER_FAILED" ||
                        p.certificate.artifact?.deliveryState === "FAILED") && (
                        <button
                          disabled={busy}
                          className={styles.secondary}
                          onClick={() =>
                            void act(async () => {
                              await management(
                                `certificates/${p.certificate!.id}/retry`,
                                {},
                              );
                              setMessage("Nova tentativa agendada.");
                            })
                          }
                        >
                          Repetir geração ou envio
                        </button>
                      )}
                    {p.certificate && (
                      <button
                        disabled={
                          busy ||
                          Boolean(p.certificate.revokedAt) ||
                          p.certificate.artifact?.state !== "READY"
                        }
                        onClick={() =>
                          void act(async () => {
                            await openManagementPdf(
                              `certificates/${p.certificate!.id}/pdf`,
                            );
                          })
                        }
                      >
                        Baixar certificado
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
            <section className={styles.card}>
              <h2>Histórico administrativo</h2>
              {audit.map((a) => (
                <p key={a.id}>
                  {new Date(a.createdAt).toLocaleString("pt-BR")} · {a.action} ·
                  responsável {a.secretaryId || "sistema"}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              ))}
            </section>
          </>
        )}
        {manual && (
          <dialog
            ref={manualDialog}
            className={`${styles.card} ${styles.dialog}`}
            aria-labelledby="manual-presence-title"
            onCancel={(e) => {
              e.preventDefault();
              setManual(null);
            }}
          >
            <h2 id="manual-presence-title">
              Atendimento presencial: {manual.name}
            </h2>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <p>
              Verifique a pessoa no local. O registro ficará identificado como
              manual, sem simular GPS ou QR.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void act(async () => {
                  const action = value(data, "action"),
                    reason = value(data, "reason");
                  if (action === "ATTENDEE" || action === "SPEAKER")
                    await management(`participants/${manual.id}/role`, {
                      role: action,
                      reason,
                    });
                  else if (action === "CORRECT")
                    await management(
                      `participants/${manual.id}`,
                      {
                        name: value(data, "name"),
                        course: value(data, "course") || undefined,
                        reason,
                      },
                      "PATCH",
                    );
                  else
                    await management(`events/${eventId}/manual-presence`, {
                      participantId: manual.id,
                      checkpoint: action,
                      reason,
                    });
                  setParticipants(
                    await management<Participant[]>(
                      `events/${eventId}/participants`,
                    ),
                  );
                  setManual(null);
                  setMessage("Ação registrada com autoria e justificativa.");
                });
              }}
            >
              <label>
                Ação
                <select name="action">
                  <option value="CHECK_IN">Registrar entrada presencial</option>
                  <option value="CHECK_OUT">Registrar saída presencial</option>
                  <option value="SPEAKER">
                    Definir como palestrante (antes da emissão)
                  </option>
                  <option value="ATTENDEE">
                    Definir como participante (antes da emissão)
                  </option>
                  <option value="CORRECT">
                    Corrigir nome/curso desta participação (antes da emissão)
                  </option>
                </select>
              </label>
              <label>
                Justificativa obrigatória
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <label>
                Nome para correção
                <input
                  name="name"
                  defaultValue={manual.name}
                  minLength={3}
                  maxLength={160}
                />
              </label>
              <label>
                Curso para correção
                <input
                  name="course"
                  defaultValue={manual.course || ""}
                  maxLength={120}
                />
              </label>
              <button disabled={busy}>Confirmar ação auditada</button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setManual(null)}
              >
                Cancelar
              </button>
            </form>
          </dialog>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import { TitleComp } from "../../components/title/TitleComp";
import { getEvent, updateEvent } from "../../api/event/eventService";
import type { EventView } from "../../domains/Event";
import { EventForm } from "./components/EventForm";
import type { CreateEventPayload } from "./components/EventForm";

import styles from "./styleNovoEvento.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

export default function SecretariaEditarEventoScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setFetchError("Identificador do evento não informado.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    getEvent(id)
      .then((data) => {
        if (isMounted) {
          setEvent(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Erro ao carregar evento.";
          setFetchError(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleUpdate(payload: CreateEventPayload) {
    if (!id) return;
    try {
      setSaving(true);
      setSaveError(null);
      await updateEvent(id, {
        title: payload.title,
        description: payload.description,
        speaker: payload.speaker,
        location: payload.location,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        workloadMinutes: payload.workloadMinutes,
        certificateEnabled: payload.certificateEnabled,
      });
      navigate("/eventos");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao salvar alterações no evento.";
      setSaveError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const isCancelled = event?.status === "CANCELLED";

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>

      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/eventos")}
            >
              <FaArrowLeft />
              Voltar para Eventos
            </button>
          </div>

          <div className={styles.formContainer}>
            <TitleComp text="Editar Evento" />

            {loading && (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#6b7280" }}>
                Carregando dados do evento...
              </div>
            )}

            {fetchError && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "14px",
                }}
                role="alert"
              >
                {fetchError}
              </div>
            )}

            {!loading && !fetchError && isCancelled && (
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "14px",
                }}
                role="alert"
              >
                <strong>Evento Cancelado:</strong> Este evento foi cancelado e não pode ser editado.
                {event?.cancelReason && (
                  <p style={{ marginTop: "6px" }}>Motivo: {event.cancelReason}</p>
                )}
              </div>
            )}

            {!loading && !fetchError && !isCancelled && event && (
              <>
                {saveError && (
                  <div
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                    role="alert"
                  >
                    {saveError}
                  </div>
                )}
                <EventForm
                  initialValue={event}
                  submitLabel="Salvar Alterações"
                  isSubmitting={saving}
                  onSubmit={handleUpdate}
                  onCancel={() => navigate("/eventos")}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

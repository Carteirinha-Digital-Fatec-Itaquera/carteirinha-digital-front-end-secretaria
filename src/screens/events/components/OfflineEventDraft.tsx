import { useEffect, useState } from "react";
import {
  inspectSessionToken,
  getSessionSnapshot,
} from "../../../api/auth/session";
import {
  draftKey,
  loadDraft,
  type ParticipantDraft,
} from "./participantDraftStore";
import ParticipantFilePanel from "./ParticipantFilePanel";
import type { EventView } from "../../../domains/Event";
import styles from "./ManualCertificatePanel.module.css";
export default function OfflineEventDraft({ eventId }: { eventId: string }) {
  const [draft, setDraft] = useState<ParticipantDraft | null>(null);
  useEffect(() => {
    let active = true;
    const owner = Number(
      inspectSessionToken(getSessionSnapshot().token)?.payload.sub,
    );
    if (owner)
      void loadDraft(draftKey(owner, eventId))
        .then((value) => {
          if (active) setDraft(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [eventId]);
  if (!draft || draft.eventId !== eventId) return null;
  const event: EventView = {
    id: eventId,
    ...draft.eventSnapshot,
    status: "COMPLETED",
    certificateEnabled: true,
    speaker: "",
    description: null,
    location: "",
    workloadMinutes: 0,
    cancelReason: null,
    cancelledAt: null,
    cancelledById: null,
    checkpoints: [],
    createdAt: "",
    updatedAt: "",
  };
  return (
    <section className={styles.panel}>
      <h2>Lista salva neste aparelho</h2>
      <p>
        Os dados atuais do evento não puderam ser consultados. Continue
        anotando; emissão e elegibilidade serão validadas pelo servidor quando a
        conexão voltar.
      </p>
      <ParticipantFilePanel event={event} onUpdated={() => undefined} />
    </section>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import { TitleComp } from "../../components/title/TitleComp";
import { createEvent } from "../../api/event/eventService";
import { EventForm } from "./components/EventForm";
import type { CreateEventPayload } from "./components/EventForm";

import styles from "./styleNovoEvento.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

export default function SecretariaNovoEventoScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCreate(payload: CreateEventPayload) {
    try {
      setLoading(true);
      await createEvent(payload);
      navigate("/eventos");
    } finally {
      setLoading(false);
    }
  }

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
            <TitleComp text="Novo Evento" />

            <EventForm
              submitLabel="Registrar"
              isSubmitting={loading}
              onSubmit={handleCreate}
              onCancel={() => navigate("/eventos")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

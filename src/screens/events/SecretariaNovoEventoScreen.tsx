import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBook,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import { InputComp } from "../../components/input/InputComp";
import { TitleComp } from "../../components/title/TitleComp";
import { createEvent } from "../../api/event/eventService";

import styles from "./styleNovoEvento.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

export default function SecretariaNovoEventoScreen() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workload, setWorkload] = useState("");
  const [certificatesEnabled, setCertificatesEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Por favor, preencha o título do evento.");
      return;
    }
    if (!speaker.trim()) {
      setErrorMessage("Por favor, informe o palestrante ou convidado.");
      return;
    }
    if (!location.trim()) {
      setErrorMessage("Por favor, informe o local do evento.");
      return;
    }
    if (!date) {
      setErrorMessage("Por favor, selecione a data do evento.");
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage("Por favor, informe os horários de início e término.");
      return;
    }

    const numWorkload = parseFloat(workload.replace(",", "."));
    if (isNaN(numWorkload) || numWorkload <= 0) {
      setErrorMessage("Por favor, informe uma carga horária válida (ex: 2 ou 2.5).");
      return;
    }

    try {
      setLoading(true);

      const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
      const endsAt = new Date(`${date}T${endTime}:00`).toISOString();

      if (new Date(endsAt) <= new Date(startsAt)) {
        setErrorMessage("O horário de término deve ser após o horário de início.");
        setLoading(false);
        return;
      }

      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        speaker: speaker.trim(),
        location: location.trim(),
        startsAt,
        endsAt,
        workloadMinutes: Math.round(numWorkload * 60),
        certificateEnabled: certificatesEnabled,
      });

      navigate("/eventos");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao registrar o evento. Tente novamente.";
      setErrorMessage(msg);
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

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.containerInputs}>
                <InputComp
                  label="Título"
                  placeholder="Ex: Palestra sobre Inteligência Artificial"
                  icon={<FaBook />}
                  value={title}
                  onChangeText={setTitle}
                />

                <InputComp
                  label="Palestrante / Convidado"
                  placeholder="Ex: Prof. Dr. Silva"
                  icon={<FaUser />}
                  value={speaker}
                  onChangeText={setSpeaker}
                />
              </div>

              <div className={styles.containerInputs}>
                <InputComp
                  label="Local"
                  placeholder="Ex: Auditório FATEC Itaquera"
                  icon={<FaMapMarkerAlt />}
                  value={location}
                  onChangeText={setLocation}
                />

                <InputComp
                  label="Carga horária (horas)"
                  placeholder="Ex: 2 ou 2.5"
                  icon={<FaClock />}
                  value={workload}
                  onChangeText={setWorkload}
                />
              </div>

              <div className={styles.containerInputs}>
                <InputComp
                  label="Data do evento"
                  type="date"
                  placeholder=""
                  icon={<FaCalendarAlt />}
                  value={date}
                  onChangeText={setDate}
                />

                <InputComp
                  label="Horário inicial"
                  type="time"
                  placeholder=""
                  icon={<FaClock />}
                  value={startTime}
                  onChangeText={setStartTime}
                />

                <InputComp
                  label="Horário final"
                  type="time"
                  placeholder=""
                  icon={<FaClock />}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </div>

              <div className={styles.descriptionContainer}>
                <label className={styles.descriptionLabel}>
                  Descrição / Resumo
                </label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os tópicos abordados no evento..."
                />
              </div>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={certificatesEnabled}
                  onChange={(e) => setCertificatesEnabled(e.target.checked)}
                />
                Habilitar emissão de certificados após check-out confirmado
              </label>

              {errorMessage && (
                <div
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              <div className={styles.buttons}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => navigate("/eventos")}
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

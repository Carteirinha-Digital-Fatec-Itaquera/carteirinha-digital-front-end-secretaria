import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaBook,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

import { InputComp } from "../../components/input/InputComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";

import styles from "./styleNovoEvento.module.css";

export default function SecretariaNovoEvento() {
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

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/eventos")}
        >
          <FaArrowLeft />
          Voltar
        </button>
      </div>

      <TitleComp text="Novo Evento" />

      <form className={styles.form}>
        <div className={styles.containerInputs}>
          <InputComp
            label="Título"
            placeholder="Ex: Palestra sobre Tecnologia"
            icon={<FaBook />}
            value={title}
            onChangeText={setTitle}
          />

          <InputComp
            label="Palestrante / Convidado"
            placeholder="Ex: João Silva"
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
            label="Carga horária"
            placeholder="Ex: 2h"
            icon={<FaClock />}
            value={workload}
            onChangeText={setWorkload}
          />
        </div>

        <div className={styles.containerInputs}>
          <InputComp
                      label="Data do evento"
                      type="date"
                      icon={<FaCalendarAlt />}
                      value={date}
                      onChangeText={setDate} placeholder={""}          />

          <InputComp
                      label="Horário inicial"
                      type="time"
                      icon={<FaClock />}
                      value={startTime}
                      onChangeText={setStartTime} placeholder={""}          />

          <InputComp
                      label="Horário final"
                      type="time"
                      icon={<FaClock />}
                      value={endTime}
                      onChangeText={setEndTime} placeholder={""}          />
        </div>

        <div className={styles.descriptionContainer}>
          <label className={styles.label}>
            Descrição / Resumo
          </label>

          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o evento..."
          />
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={certificatesEnabled}
            onChange={(e) =>
              setCertificatesEnabled(e.target.checked)
            }
          />

          Habilitar emissão de certificados
        </label>

        <div className={styles.buttons}>
          <ButtonComp
            text="Cancelar"
            onClick={() => navigate("/eventos")}
          />

          <ButtonComp
            text="Registrar"
            onClick={() => {
              console.log({
                title,
                description,
                speaker,
                location,
                date,
                startTime,
                endTime,
                workload,
                certificatesEnabled,
              });
            }}
          />
        </div>
      </form>
    </div>
  );
}
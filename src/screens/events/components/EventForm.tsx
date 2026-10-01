import { useState, useEffect, useCallback } from 'react';
import {
  FaBook,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
} from 'react-icons/fa';
import { InputComp } from '../../../components/input/InputComp';
import type { EventView, CreateEventRequest } from '../../../domains/Event';
import {
  parseWorkloadHours,
  calculateEventEnd,
  toEventFormSchedule,
} from '../../../utils/eventSchedule';
import styles from './styleEventForm.module.css';

export type CreateEventPayload = CreateEventRequest;

export interface EventFormProps {
  initialValue?: EventView;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (body: CreateEventRequest) => Promise<void>;
  onCancel?: () => void;
}

export function EventForm({
  initialValue,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [description, setDescription] = useState(
    initialValue?.description ?? ''
  );
  const [speaker, setSpeaker] = useState(initialValue?.speaker ?? '');
  const [location, setLocation] = useState(initialValue?.location ?? '');
  const [certificateEnabled, setCertificateEnabled] = useState(
    initialValue?.certificateEnabled ?? true
  );

  // Inicializa carga horária e datas a partir do initialValue se existente
  const initialSchedule = initialValue
    ? toEventFormSchedule(initialValue.startsAt, initialValue.endsAt)
    : { startDate: '', startTime: '', endDate: '', endTime: '' };

  const [workload, setWorkload] = useState(
    initialValue ? String(initialValue.workloadMinutes / 60) : ''
  );
  const [startDate, setStartDate] = useState(initialSchedule.startDate);
  const [startTime, setStartTime] = useState(initialSchedule.startTime);
  const [endDate, setEndDate] = useState(initialSchedule.endDate);
  const [endTime, setEndTime] = useState(initialSchedule.endTime);

  // Se tiver initialValue, começa no modo manual para preservar o valor salvo até ajuste explícito
  const [isManualEnd, setIsManualEnd] = useState(Boolean(initialValue));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recalculateEnd = useCallback(
    (sDate: string, sTime: string, wHours: string) => {
      if (!sDate || !sTime) return;
      const minutes = parseWorkloadHours(wHours);
      if (!minutes) return;

      const calculated = calculateEventEnd(`${sDate}T${sTime}`, minutes);
      if (calculated) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const calcYear = calculated.getFullYear();
        const calcMonth = pad(calculated.getMonth() + 1);
        const calcDay = pad(calculated.getDate());
        const calcHours = pad(calculated.getHours());
        const calcMinutes = pad(calculated.getMinutes());

        setEndDate(`${calcYear}-${calcMonth}-${calcDay}`);
        setEndTime(`${calcHours}:${calcMinutes}`);
      }
    },
    []
  );

  // Auto-cálculo de término quando em modo automático
  useEffect(() => {
    if (!isManualEnd && startDate && startTime && workload) {
      recalculateEnd(startDate, startTime, workload);
    }
  }, [isManualEnd, startDate, startTime, workload, recalculateEnd]);

  function handleManualEndDateChange(val: string) {
    setIsManualEnd(true);
    setEndDate(val);
  }

  function handleManualEndTimeChange(val: string) {
    setIsManualEnd(true);
    setEndTime(val);
  }

  function handleTriggerRecalculate() {
    setIsManualEnd(false);
    recalculateEnd(startDate, startTime, workload);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setErrorMessage('O título deve ter pelo menos 3 caracteres.');
      return;
    }
    if (!speaker.trim()) {
      setErrorMessage('Por favor, informe o palestrante ou convidado.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Por favor, informe o local do evento.');
      return;
    }
    if (!startDate || !startTime) {
      setErrorMessage('Por favor, informe a data e horário inicial.');
      return;
    }
    if (!endDate || !endTime) {
      setErrorMessage('Por favor, informe a data e horário de término.');
      return;
    }

    const workloadMinutes = parseWorkloadHours(workload);
    if (!workloadMinutes) {
      setErrorMessage('Por favor, informe uma carga horária válida (ex: 2 ou 2.5).');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      setErrorMessage('Datas ou horários inválidos.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setErrorMessage('O término do evento deve ser posterior ao início.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() || undefined,
        speaker: speaker.trim(),
        location: location.trim(),
        startsAt: startDateTime.toISOString(),
        endsAt: endDateTime.toISOString(),
        workloadMinutes,
        certificateEnabled,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao salvar o evento. Tente novamente.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.gridTwoCols}>
          <InputComp
            label="Título"
            placeholder="Ex: Palestra sobre Arquitetura de Software"
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

        <div className={styles.gridTwoCols}>
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

        <div className={styles.gridSchedule}>
          <div className={styles.scheduleGroup}>
            <div className={styles.scheduleGroupHeader}>
              <span>Início do Evento</span>
            </div>
            <InputComp
              label="Data de início"
              type="date"
              placeholder=""
              icon={<FaCalendarAlt />}
              value={startDate}
              onChangeText={setStartDate}
            />
            <InputComp
              label="Horário inicial"
              type="time"
              placeholder=""
              icon={<FaClock />}
              value={startTime}
              onChangeText={setStartTime}
            />
          </div>

          <div className={styles.scheduleGroup}>
            <div className={styles.scheduleGroupHeader}>
              <span>Término do Evento</span>
              {!isManualEnd ? (
                <span className={styles.autoBadge}>Cálculo automático</span>
              ) : (
                <button
                  type="button"
                  className={styles.recalcButton}
                  onClick={handleTriggerRecalculate}
                >
                  Recalcular término
                </button>
              )}
            </div>
            <InputComp
              label="Data de término"
              type="date"
              placeholder=""
              icon={<FaCalendarAlt />}
              value={endDate}
              onChangeText={handleManualEndDateChange}
            />
            <InputComp
              label="Horário final"
              type="time"
              placeholder=""
              icon={<FaClock />}
              value={endTime}
              onChangeText={handleManualEndTimeChange}
            />
          </div>
        </div>

        <div className={styles.descriptionContainer}>
          <label className={styles.descriptionLabel}>Descrição / Resumo</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva os tópicos abordados no evento..."
          />
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={certificateEnabled}
            onChange={(e) => setCertificateEnabled(e.target.checked)}
          />
          Habilitar emissão de certificados após check-out confirmado
        </label>

        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            {errorMessage}
          </div>
        )}

        <div className={styles.buttons}>
          {onCancel && (
            <button
              type="button"
              className={styles.discardButton}
              onClick={onCancel}
              disabled={loading || isSubmitting}
            >
              Descartar
            </button>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? 'Salvando...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

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
import {
  management,
  openManagementPdf,
  type Catalog,
} from '../../../api/event/publicEventService';
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

  // Visitantes e contexto
  const [visitorsAllowed, setVisitorsAllowed] = useState(
    initialValue?.visitorsAllowed ?? false
  );
  const [organizerCourse, setOrganizerCourse] = useState(
    initialValue?.organizerCourse ?? ''
  );
  const [promoter, setPromoter] = useState(initialValue?.promoter ?? '');

  // Localização / Geofence
  const [latitude, setLatitude] = useState(
    initialValue?.geoPolicy?.latitude !== undefined
      ? String(initialValue.geoPolicy.latitude)
      : ''
  );
  const [longitude, setLongitude] = useState(
    initialValue?.geoPolicy?.longitude !== undefined
      ? String(initialValue.geoPolicy.longitude)
      : ''
  );
  const [radius, setRadius] = useState(
    initialValue?.geoPolicy?.radius !== undefined
      ? String(initialValue.geoPolicy.radius)
      : ''
  );
  const [maxAccuracy, setMaxAccuracy] = useState(
    initialValue?.geoPolicy?.maxAccuracy !== undefined
      ? String(initialValue.geoPolicy.maxAccuracy)
      : ''
  );

  // Endereço e CEP para cálculo de Geofence
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modelos e assinaturas de certificados
  const [attendeeTemplateId, setAttendeeTemplateId] = useState(
    initialValue?.certificatePolicies?.ATTENDEE?.templateId ?? ''
  );
  const [signerIds, setSignerIds] = useState<string[]>(
    initialValue?.certificatePolicies?.ATTENDEE?.signerIds ?? []
  );
  const [speakerTemplateId, setSpeakerTemplateId] = useState(
    initialValue?.certificatePolicies?.SPEAKER?.templateId ?? ''
  );
  const [speakerSignerIds, setSpeakerSignerIds] = useState<string[]>(
    initialValue?.certificatePolicies?.SPEAKER?.signerIds ?? []
  );

  // Catálogo público de modelos, assinantes e local padrão
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    management<Catalog>('catalog', undefined, 'GET', controller.signal)
      .then((cat) => {
        setCatalog(cat);
      })
      .catch(() => {
        // Fallback silencioso
      });
    return () => controller.abort();
  }, []);

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

  async function handleSearchCep(customCep?: string, customNumber?: string) {
    const targetCep = (customCep ?? cep).replace(/\D/g, '');
    if (targetCep.length !== 8) {
      setCepFeedback({
        type: 'error',
        message: 'Digite um CEP válido com 8 dígitos.',
      });
      return;
    }
    setCepLoading(true);
    setCepFeedback(null);

    try {
      let lat: number | null = null;
      let lon: number | null = null;
      let logradouro = '';
      let bairro = '';
      let localidade = '';
      let uf = '';

      // 1. Tenta BrasilAPI v2 (retorna endereço e coordenadas geográficas)
      try {
        const resBrasil = await fetch(
          `https://brasilapi.com.br/api/cep/v2/${targetCep}`
        );
        if (resBrasil.ok) {
          const data = await resBrasil.json();
          logradouro = data.street || '';
          bairro = data.neighborhood || '';
          localidade = data.city || '';
          uf = data.state || '';
          if (
            data.location?.coordinates?.latitude &&
            data.location?.coordinates?.longitude
          ) {
            lat = Number(data.location.coordinates.latitude);
            lon = Number(data.location.coordinates.longitude);
          }
        }
      } catch {
        // Fallback silencioso para ViaCEP
      }

      // 2. Fallback para ViaCEP se logradouro não veio
      if (!logradouro) {
        const resViaCep = await fetch(
          `https://viacep.com.br/ws/${targetCep}/json/`
        );
        if (resViaCep.ok) {
          const data = await resViaCep.json();
          if (!data.erro) {
            logradouro = data.logradouro || '';
            bairro = data.bairro || '';
            localidade = data.localidade || '';
            uf = data.uf || '';
          }
        }
      }

      if (!logradouro && !localidade) {
        setCepFeedback({
          type: 'error',
          message: 'CEP não encontrado. Verifique os dígitos informados.',
        });
        setCepLoading(false);
        return;
      }

      setStreet(logradouro);
      setNeighborhood(bairro);
      setCity(localidade);
      setState(uf);

      const currentNumber = customNumber ?? number;
      if (logradouro && localidade) {
        try {
          const query = `${logradouro}${
            currentNumber ? ` ${currentNumber}` : ''
          }, ${localidade}, ${uf}, Brasil`;
          const resNom = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&limit=1`,
            { headers: { 'User-Agent': 'FatecItaqueraApp/1.0' } }
          );
          if (resNom.ok) {
            const nomData = await resNom.json();
            if (
              Array.isArray(nomData) &&
              nomData.length > 0 &&
              nomData[0].lat &&
              nomData[0].lon
            ) {
              lat = Number(nomData[0].lat);
              lon = Number(nomData[0].lon);
            }
          }
        } catch {
          // Mantém as coordenadas do BrasilAPI se houver
        }
      }

      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        setLatitude(String(lat));
        setLongitude(String(lon));
        setCepFeedback({
          type: 'success',
          message: `Endereço e coordenadas obtidos com sucesso (${lat.toFixed(6)}, ${lon.toFixed(6)}).`,
        });
      } else {
        setCepFeedback({
          type: 'error',
          message:
            'Endereço localizado, mas as coordenadas não puderam ser derivadas. Utilize o preset da Fatec.',
        });
      }
    } catch (err: unknown) {
      setCepFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao buscar CEP.',
      });
    } finally {
      setCepLoading(false);
    }
  }

  function handleUseDefaultFatecLocation() {
    if (catalog?.defaultVenue?.policy) {
      const pol = catalog.defaultVenue.policy;
      setCep('08295-005');
      setStreet('Av. Miguel Ignácio Curi');
      setNumber('360');
      setNeighborhood('Vila Carmosina');
      setCity('São Paulo');
      setState('SP');
      setComplement('Fatec Itaquera');
      setLatitude(String(pol.latitude));
      setLongitude(String(pol.longitude));
      setRadius(String(pol.radius));
      setMaxAccuracy(String(pol.maxAccuracy));
      setCepFeedback({
        type: 'success',
        message: `Localização oficial da Fatec Itaquera aplicada (${pol.latitude.toFixed(6)}, ${pol.longitude.toFixed(6)}).`,
      });
    }
  }

  function handleCourseChange(course: string) {
    setOrganizerCourse(course);
    if (catalog?.signers && !signerIds.length) {
      const defaults = catalog.signers
        .filter((s) => !s.archived && s.course === course)
        .slice(0, 3)
        .map((s) => s.id);
      if (defaults.length) {
        setSignerIds(defaults);
      }
    }
  }

  function toggleSigner(id: string, isSpeaker = false) {
    if (isSpeaker) {
      setSpeakerSignerIds((prev) =>
        prev.includes(id)
          ? prev.filter((s) => s !== id)
          : prev.length < 3
          ? [...prev, id]
          : prev
      );
    } else {
      setSignerIds((prev) =>
        prev.includes(id)
          ? prev.filter((s) => s !== id)
          : prev.length < 3
          ? [...prev, id]
          : prev
      );
    }
  }

  async function handlePreviewPdf(role: 'ATTENDEE' | 'SPEAKER') {
    const templateId =
      role === 'ATTENDEE' ? attendeeTemplateId : speakerTemplateId;
    const signers = role === 'ATTENDEE' ? signerIds : speakerSignerIds;
    if (!templateId) return;
    try {
      await openManagementPdf(`templates/${templateId}/preview`, {
        signerIds: signers,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao abrir prévia do PDF.'
      );
    }
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
      setErrorMessage(
        'Por favor, informe uma carga horária válida (ex: 2 ou 2.5).'
      );
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

    // Validação de certificados se selecionados
    if (attendeeTemplateId && (!signerIds.length || signerIds.length > 3)) {
      setErrorMessage(
        'Selecione entre 1 e 3 responsáveis/assinaturas para o modelo de participante.'
      );
      return;
    }

    if (
      speakerTemplateId &&
      (!speakerSignerIds.length || speakerSignerIds.length > 3)
    ) {
      setErrorMessage(
        'Selecione entre 1 e 3 responsáveis/assinaturas para o modelo de palestrante.'
      );
      return;
    }

    const hasGeo = latitude !== '' && longitude !== '';

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
        visitorsAllowed,
        organizerCourse: organizerCourse.trim() || undefined,
        promoter: promoter.trim() || undefined,
        geoPolicy: hasGeo
          ? {
              latitude: Number(latitude),
              longitude: Number(longitude),
              radius: Number(radius) || 150,
              maxAccuracy: Number(maxAccuracy) || 50,
            }
          : null,
        certificatePolicies:
          attendeeTemplateId && signerIds.length
            ? {
                ATTENDEE: {
                  templateId: attendeeTemplateId,
                  signerIds,
                },
                ...(speakerTemplateId && speakerSignerIds.length
                  ? {
                      SPEAKER: {
                        templateId: speakerTemplateId,
                        signerIds: speakerSignerIds,
                      },
                    }
                  : {}),
              }
            : undefined,
        attendeeTemplateId: attendeeTemplateId || undefined,
        speakerTemplateId: speakerTemplateId || undefined,
        signerIds: signerIds.length ? signerIds : undefined,
        speakerSignerIds: speakerSignerIds.length
          ? speakerSignerIds
          : undefined,
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

        {/* Seção: Comunidade e Visitantes */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="visitorsAllowed"
                className={styles.checkboxInput}
                checked={visitorsAllowed}
                onChange={(e) => setVisitorsAllowed(e.target.checked)}
              />
              Permitir visitantes
            </label>
            <p className={styles.sectionDescription}>
              Permite a participação de pessoas da comunidade externa sem necessidade de criar conta institucional prévia.
            </p>
          </div>
        </div>

        {/* Seção: Localização e Presença Física (GPS via CEP) */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Localização e Presença Física (GPS via CEP)</h3>
            <p className={styles.sectionDescription}>
              Informe o CEP e o número para preencher o endereço e calcular automaticamente a latitude e longitude. Nenhuma inserção manual de coordenadas é necessária.
            </p>
          </div>

          {catalog?.defaultVenue && (
            <div className={styles.venueBanner}>
              <strong>{catalog.defaultVenue.name}</strong> — {catalog.defaultVenue.address}
              <br />
              <span className={styles.hintText}>
                Ponto de referência oficial. Preenche CEP, endereço completo e coordenadas calibradas.
              </span>
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className={styles.presetButton}
                  onClick={handleUseDefaultFatecLocation}
                >
                  Usar localização padrão da Fatec
                </button>
              </div>
            </div>
          )}

          <div className={styles.geoAddressGrid}>
            <div className={styles.fieldGroup}>
              <label htmlFor="cep" className={styles.fieldLabel}>
                CEP
              </label>
              <div className={styles.cepRow}>
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  maxLength={9}
                  placeholder="08295-005"
                  value={cep}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const digits = raw.replace(/\D/g, '').slice(0, 8);
                    const formatted =
                      digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                    setCep(formatted);
                    if (digits.length === 8) {
                      void handleSearchCep(digits);
                    }
                  }}
                  className={styles.fieldInput}
                />
                <button
                  type="button"
                  className={styles.cepSearchBtn}
                  disabled={cepLoading || cep.replace(/\D/g, '').length !== 8}
                  onClick={() => void handleSearchCep()}
                >
                  {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="street" className={styles.fieldLabel}>
                Logradouro / Rua
              </label>
              <input
                id="street"
                name="street"
                type="text"
                placeholder="Preenchido automaticamente pelo CEP"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="number" className={styles.fieldLabel}>
                Número
              </label>
              <input
                id="number"
                name="number"
                type="text"
                placeholder="Ex: 360"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onBlur={() => {
                  if (cep.replace(/\D/g, '').length === 8 && street) {
                    void handleSearchCep(undefined, number);
                  }
                }}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="complement" className={styles.fieldLabel}>
                Complemento
              </label>
              <input
                id="complement"
                name="complement"
                type="text"
                placeholder="Ex: Auditório / Bloco A"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="neighborhood" className={styles.fieldLabel}>
                Bairro
              </label>
              <input
                id="neighborhood"
                name="neighborhood"
                type="text"
                placeholder="Preenchido pelo CEP"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="cityState" className={styles.fieldLabel}>
                Cidade / UF
              </label>
              <input
                id="cityState"
                name="cityState"
                type="text"
                placeholder="Ex: São Paulo - SP"
                value={city ? `${city}${state ? ` - ${state}` : ''}` : ''}
                readOnly
                className={`${styles.fieldInput} ${styles.readOnlyInput}`}
              />
            </div>
          </div>

          {cepFeedback && (
            <div
              className={`${styles.geoFeedback} ${
                cepFeedback.type === 'success'
                  ? styles.geoFeedbackSuccess
                  : styles.geoFeedbackError
              }`}
            >
              {cepFeedback.message}
            </div>
          )}

          <div className={styles.gridGeo} style={{ marginTop: '16px' }}>
            <div className={styles.fieldGroup}>
              <label htmlFor="latitude" className={styles.fieldLabel}>
                Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                readOnly
                placeholder="Automática via CEP"
                value={latitude}
                className={`${styles.fieldInput} ${styles.readOnlyInput}`}
              />
              <span className={styles.readOnlyNote}>Preenchida automaticamente</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="longitude" className={styles.fieldLabel}>
                Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                readOnly
                placeholder="Automática via CEP"
                value={longitude}
                className={`${styles.fieldInput} ${styles.readOnlyInput}`}
              />
              <span className={styles.readOnlyNote}>Preenchida automaticamente</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="radius" className={styles.fieldLabel}>
                Raio em metros
              </label>
              <input
                id="radius"
                name="radius"
                type="number"
                min={10}
                max={5000}
                placeholder="150"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="maxAccuracy" className={styles.fieldLabel}>
                Precisão máxima em metros
              </label>
              <input
                id="maxAccuracy"
                name="maxAccuracy"
                type="number"
                min={1}
                max={5000}
                placeholder="50"
                value={maxAccuracy}
                onChange={(e) => setMaxAccuracy(e.target.value)}
                className={styles.fieldInput}
              />
            </div>
          </div>
          <p className={styles.hintText} style={{ marginTop: '10px' }}>
            As coordenadas geográficas são geradas automaticamente através do CEP e endereço informado.
          </p>
        </div>

        {/* Seção: Certificados */}
        <div className={styles.sectionCard}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              checked={certificateEnabled}
              onChange={(e) => setCertificateEnabled(e.target.checked)}
            />
            Habilitar emissão de certificados após check-out confirmado
          </label>

          {certificateEnabled && (
            <>
              <div className={styles.gridTwoCols}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="organizerCourse" className={styles.fieldLabel}>
                    Curso organizador
                  </label>
                  <input
                    id="organizerCourse"
                    name="organizerCourse"
                    maxLength={120}
                    placeholder="Ex: DSM, GE, etc."
                    value={organizerCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="promoter" className={styles.fieldLabel}>
                    Empresa promotora (opcional)
                  </label>
                  <input
                    id="promoter"
                    name="promoter"
                    maxLength={160}
                    placeholder="Ex: Empresa parceira"
                    value={promoter}
                    onChange={(e) => setPromoter(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>
              </div>

              <div className={styles.gridTwoCols}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="attendeeTemplateId" className={styles.fieldLabel}>
                    Modelo de participante
                  </label>
                  <select
                    id="attendeeTemplateId"
                    name="attendeeTemplateId"
                    value={attendeeTemplateId}
                    onChange={(e) => setAttendeeTemplateId(e.target.value)}
                    className={styles.fieldSelect}
                  >
                    <option value="">Modelo institucional padrão</option>
                    {catalog?.templates
                      .filter((t) => t.status === 'PUBLISHED' && t.role === 'ATTENDEE')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · v{t.version}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="speakerTemplateId" className={styles.fieldLabel}>
                    Modelo de palestrante (opcional)
                  </label>
                  <select
                    id="speakerTemplateId"
                    name="speakerTemplateId"
                    value={speakerTemplateId}
                    onChange={(e) => setSpeakerTemplateId(e.target.value)}
                    className={styles.fieldSelect}
                  >
                    <option value="">Não personalizar certificado de palestrante</option>
                    {catalog?.templates
                      .filter((t) => t.status === 'PUBLISHED' && t.role === 'SPEAKER')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · v{t.version}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {attendeeTemplateId && catalog?.signers && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Assinaturas do certificado de participante (1 a 3 obrigatórias):
                  </label>
                  <div className={styles.signersList}>
                    {catalog.signers
                      .filter((s) => !s.archived)
                      .map((s) => (
                        <label key={s.id} className={styles.signerItem}>
                          <input
                            type="checkbox"
                            checked={signerIds.includes(s.id)}
                            onChange={() => toggleSigner(s.id, false)}
                          />
                          <span>
                            <strong>{s.name}</strong> — {s.title} {s.course ? `(${s.course})` : ''}
                          </span>
                        </label>
                      ))}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className={styles.previewBtn}
                      onClick={() => handlePreviewPdf('ATTENDEE')}
                      disabled={!signerIds.length}
                    >
                      Baixar prévia sem validade (Participante)
                    </button>
                  </div>
                </div>
              )}

              {speakerTemplateId && catalog?.signers && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Assinaturas do certificado de palestrante (1 a 3):
                  </label>
                  <div className={styles.signersList}>
                    {catalog.signers
                      .filter((s) => !s.archived)
                      .map((s) => (
                        <label key={s.id} className={styles.signerItem}>
                          <input
                            type="checkbox"
                            checked={speakerSignerIds.includes(s.id)}
                            onChange={() => toggleSigner(s.id, true)}
                          />
                          <span>
                            <strong>{s.name}</strong> — {s.title} {s.course ? `(${s.course})` : ''}
                          </span>
                        </label>
                      ))}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className={styles.previewBtn}
                      onClick={() => handlePreviewPdf('SPEAKER')}
                      disabled={!speakerSignerIds.length}
                    >
                      Baixar prévia sem validade (Palestrante)
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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

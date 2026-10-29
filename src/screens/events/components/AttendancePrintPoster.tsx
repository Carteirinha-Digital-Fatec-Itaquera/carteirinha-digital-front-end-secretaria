import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../../components/modal/Modal';
import type { EventView } from '../../../domains/Event';
import { GLOBAL_VAR } from '../../../api/config/globalVar';
import { validatedAttendanceQrUrl } from '../../../utils/attendanceQrLink';
import { formatEventDate, formatEventTime, formatWorkload } from '../../../utils/eventPresentation';
import './attendancePrint.css';

type Props = { event: EventView; qrUrl: string | null; checkpoint: 'check-in' | 'check-out'; version: number; stable: boolean; permanent?: boolean; disabled?: boolean };
export default function AttendancePrintPoster({ event, qrUrl, checkpoint, version, stable, permanent = false, disabled }: Props) {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paper = useRef<HTMLElement>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const value = validatedAttendanceQrUrl(qrUrl, GLOBAL_VAR.STUDENT_APP_URL);
  const current = useRef('');
  const identity = `${event.id}:${checkpoint}:${version}:${value}`;
  current.current = identity;
  const available = !!value && stable && !disabled && event.status !== 'CANCELLED';
  const availability = useRef(false);
  availability.current = available;
  const finalOnly = event.attendanceMode === 'FINAL_ONLY';
  const heading = finalOnly ? 'Confirme sua presença' : checkpoint === 'check-in' ? 'Registre sua entrada' : 'Registre sua saída';
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!opened) return;
    const title = document.title;
    document.title = `Presença - ${event.title}`;
    return () => { document.title = title; };
  }, [opened, event.title]);
  async function print() {
    if (lock.current || !available) return;
    lock.current = true; setBusy(true); setError('');
    const atStart = identity;
    try {
      const readiness = Promise.all([
        document.fonts?.ready,
        ...Array.from(paper.current?.querySelectorAll('img') ?? []).map(image => image.decode()),
      ]);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([readiness, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Não foi possível carregar as marcas institucionais. Tente novamente.')), 15000); })]); }
      finally { clearTimeout(timer); }
      if (!alive.current) return;
      if (atStart !== current.current || !availability.current) throw new Error('O QR ou a etapa mudou. Abra novamente a prévia antes de imprimir.');
      window.print();
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a impressão.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const poster = value ? (
        <article ref={paper} className="attendance-poster" data-compact={event.title.length>120||event.speaker.length+event.location.length>260} aria-label="Cartaz de registro de presença">
          <header className="attendance-poster-header">
            <img src="/fatec_ra_metropolitana_sp_capital_itaquera_cor.png" alt="Fatec Itaquera" />
            <div>FACULDADE DE TECNOLOGIA DE ITAQUERA<span>Centro Paula Souza</span></div>
            <img src="/cps_logo_cor.png" alt="Centro Paula Souza" />
          </header>
          <section className="attendance-poster-title"><p>REGISTRO DE PRESENÇA</p><h1>{event.title}</h1></section>
          <dl className="attendance-poster-details">
            <div><dt>Data</dt><dd>{formatEventDate(event.startsAt)}</dd></div>
            <div><dt>Horário · Brasília</dt><dd>{formatEventTime(event.startsAt)} – {formatEventDate(event.startsAt) !== formatEventDate(event.endsAt) && `${formatEventDate(event.endsAt)} `}{formatEventTime(event.endsAt)}</dd></div>
            <div><dt>Palestrante</dt><dd>{event.speaker || 'Não informado'}</dd></div>
            <div><dt>Carga horária</dt><dd>{formatWorkload(event.workloadMinutes)}</dd></div>
            <div className="attendance-poster-location"><dt>Local</dt><dd>{event.location || 'Não informado'}</dd></div>
          </dl>
          <section className="attendance-poster-code">
            <h2>{heading}</h2>
            <QRCodeSVG value={value} size={600} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" title="Link de registro de presença deste evento" />
            <p>Abra a câmera do celular e aponte para o QR Code.</p>
            <p>{event.visitorsAllowed ? 'Escolha Aluno ou Visitante e siga as instruções até confirmar o registro.' : 'Entre com sua conta de aluno e siga as instruções até confirmar o registro.'}</p>
            {event.locationEnabled && <p>Permita a localização do navegador e mantenha o GPS ligado.</p>}
          </section>
          <footer className="attendance-poster-footer">
            <p>Se a câmera não abrir o link, acesse:</p><a href={value}>{value}</a>
            <p>O registro depende da etapa estar aberta. Em caso de dificuldade, procure a organização.</p>
            <small>Carteirinha Digital · FATEC Itaquera · Este cartaz não é um certificado.</small>
          </footer>
        </article>
  ) : null;
  return <>
    <button type="button" disabled={!available} onClick={() => { setError(''); setOpened(true); }}>Imprimir cartaz de presença</button>
    {!stable && value && <span className="attendance-print-hint">A impressão exige um QR de controle manual, sem expiração automática.</span>}
    {opened && available && value && createPortal(<div className="attendance-print-root" key={identity}>
      <style media="print">{'@page { size:A4 portrait; margin:12mm; }'}</style>
      <Modal label="Prévia do cartaz de presença" onDismiss={() => { if (!busy) setOpened(false); }}>
        <div className="attendance-print-controls">
          <h2>Cartaz de presença · A4</h2>
          <p>Imprima em tamanho real ou escolha Salvar como PDF. Desative os cabeçalhos e rodapés do navegador.</p>
          <p role="note">{permanent ? 'Este QR é fixo por evento. Pode ser impresso antecipadamente e continua igual ao fechar e reabrir a etapa. O registro só é aceito enquanto a etapa estiver aberta.' : 'Este cartaz usa o QR atual. Renovar o QR, encerrar ou reabrir esta etapa invalida a impressão anterior. Gere outro cartaz nesses casos.'}</p>
          {error && <p role="alert">{error}</p>}
          <div><button type="button" disabled={busy} onClick={() => void print()}>{busy ? 'Preparando impressão…' : 'Imprimir / Salvar como PDF'}</button><button type="button" disabled={busy} onClick={() => setOpened(false)}>Fechar prévia</button></div>
        </div>
        {poster}
      </Modal>
      <div className="attendance-print-paper" aria-hidden="true">{poster}</div>
    </div>, document.body)}
  </>;
}

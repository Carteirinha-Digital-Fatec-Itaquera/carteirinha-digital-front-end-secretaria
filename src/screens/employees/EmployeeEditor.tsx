import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiRequestError } from '../../api/config/apiRequest';
import { editEmployee, getEmployee, saveAssignment, type EmployeeDetails, type EmployeePatch } from '../../api/employee/employeeService';
import { employeeError } from './employeePresentation';
import styles from './employees.module.css';

const fields = [
  ['name', 'Nome completo', 'text', 160, true],
  ['socialName', 'Nome social', 'text', 160, false],
  ['email', 'E-mail', 'email', 254, true],
  ['registrationNumber', 'Matrícula funcional', 'text', 40, false],
  ['rg', 'RG', 'text', 24, false],
  ['admissionDate', 'Data de admissão', 'date', undefined, true],
] as const;

export default function EmployeeEditor({ employee, onCancel, onSaved }: {
  employee: EmployeeDetails;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [latest, setLatest] = useState(employee);
  const [conflict, setConflict] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function run(work: (signal: AbortSignal) => Promise<unknown>, refresh = false) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      await work(controller.signal);
      if (!controller.signal.aborted && !refresh) onSaved();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiRequestError && cause.status === 409 && cause.code === 'VERSION_CONFLICT') {
        setConflict(true);
        setNeedsRefresh(true);
        await refreshLatest(controller.signal);
        if (!controller.signal.aborted) setError('O cadastro mudou desde a abertura. Confira a versão atual abaixo antes de enviar novamente.');
      } else {
        setError(employeeError(cause));
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function refreshLatest(signal: AbortSignal) {
    try {
      const data = await getEmployee(employee.id, signal);
      if (!signal.aborted) {
        setLatest(data);
        setNeedsRefresh(false);
      }
    } catch {
      if (!signal.aborted) setError('Não foi possível consultar a versão atual. Recarregue os dados para continuar.');
    }
  }

  const blocked = needsRefresh || latest.accountStatus === 'ARCHIVED';
  const envelope = (form: FormData) => ({ expectedVersion: latest.version, reason: String(form.get('reason') ?? '').trim() });
  const input = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const form = new FormData(event.currentTarget);
    const changes: EmployeePatch = Object.fromEntries(fields.flatMap(([key, , , , required]) => {
      const value = input(form, key);
      return value === (employee[key] ?? '') ? [] : [[key, required ? value : value || null]];
    }));
    if (!Object.keys(changes).length) { setError('Altere ao menos um dado cadastral antes de salvar.'); return; }
    const body = envelope(form);
    if (body.reason.length < 3) { setError('Informe um motivo com pelo menos três caracteres.'); return; }
    void run(signal => editEmployee(employee.id, { ...body, ...changes }, signal));
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>, assignment?: EmployeeDetails['assignments'][number]) {
    event.preventDefault();
    if (blocked) return;
    const form = new FormData(event.currentTarget);
    const title = input(form, 'title');
    const startsOn = input(form, 'startsOn') || null;
    const validUntil = input(form, 'validUntil') || null;
    const body = envelope(form);
    if (startsOn && validUntil && validUntil < startsOn) { setError('O fim da função deve ser igual ou posterior ao início.'); return; }
    if (body.reason.length < 3 || title.length < 2) { setError('Confira o título e o motivo da alteração.'); return; }
    const patch = {
      ...(!assignment || title !== assignment.title ? { title } : {}),
      ...(!assignment || startsOn !== assignment.startsOn ? { startsOn } : {}),
      ...(!assignment || validUntil !== assignment.validUntil ? { validUntil } : {}),
    };
    if (!Object.keys(patch).length) { setError('Altere ao menos um dado da função antes de salvar.'); return; }
    void run(signal => saveAssignment(employee.id, assignment?.id, { ...body, ...patch }, signal));
  }

  return <>
    <button onClick={onCancel} disabled={busy}>Voltar aos detalhes</button>
    {error && <p role="alert">{error}</p>}
    {conflict && <section className={styles.panel} aria-label="Versão atual do cadastro">
      <h2>Versão atual do cadastro</h2>
      <p>Compare com suas alterações. Os dados abaixo não substituem o preenchimento do formulário.</p>
      {needsRefresh ? <button disabled={busy} onClick={() => void run(refreshLatest, true)}>Recarregar versão</button> : <>
        <dl className={styles.grid}>{fields.map(([key, label]) =>
          <div key={key}><dt>{label}</dt><dd>{latest[key] ?? 'Não informado'}</dd></div>)}</dl>
        <ul>{latest.assignments.map(item => <li key={item.id}>{item.title} · {item.startsOn ?? 'sem início'} · {item.validUntil ?? 'sem término'}</li>)}</ul>
      </>}
    </section>}
    <form className={styles.panel} onSubmit={submitProfile}>
      <h2>Editar dados cadastrais</h2>
      <fieldset disabled={busy || blocked}><legend>Dados cadastrais</legend>
        <div className={styles.grid}>{fields.map(([key, label, type, maxLength, required]) =>
          <label key={key}>{label}<input name={key} type={type} maxLength={maxLength}
            required={required} defaultValue={employee[key] ?? ''} /></label>)}</div>
        <label className={styles.reason}>Motivo da alteração<input name="reason" required minLength={3} maxLength={500} /></label>
        <button className={styles.primary}>Salvar dados</button>
      </fieldset>
    </form>
    <section className={styles.panel} aria-label="Gerenciar funções">
      <h2>Gerenciar funções</h2>
      <p>Salve cada função separadamente. O motivo fica registrado na auditoria.</p>
      {[...employee.assignments.filter(item => item.effectiveStatus !== 'ARCHIVED'), undefined].map(item =>
        <form key={item?.id ?? 'new'} onSubmit={event => submitAssignment(event, item)}>
          <fieldset disabled={busy || blocked || Boolean(item && !latest.assignments.some(current => current.id === item.id && current.effectiveStatus !== 'ARCHIVED'))}>
            <legend>{item?.title ?? 'Nova função'}</legend>
            <div className={styles.grid}>
              <label>Cargo ou função<input name="title" required minLength={2} maxLength={120} defaultValue={item?.title} /></label>
              <label>Início da função<input name="startsOn" type="date" defaultValue={item?.startsOn ?? ''} /></label>
              <label>Término da função<input name="validUntil" type="date" defaultValue={item?.validUntil ?? ''} /></label>
              <label>Motivo da alteração<input name="reason" required minLength={3} maxLength={500} /></label>
            </div>
            <button className={styles.primary}>{item ? 'Salvar função' : 'Incluir função'}</button>
          </fieldset>
        </form>)}
    </section>
    {busy && <p role="status">Aguarde…</p>}
  </>;
}

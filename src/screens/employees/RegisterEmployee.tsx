import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmployee, type EmployeeInput } from '../../api/employee/employeeService';
import { employeeError } from './employeePresentation';
import EmployeesLayout from './EmployeesLayout';
import styles from './employees.module.css';

const newAssignment = (id: number) => ({ id, title: '', startsOn: '', validUntil: '' });

export default function RegisterEmployee() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([newAssignment(1)]);
  const counter = useRef(1);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => pending.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const fields = new FormData(event.currentTarget);
    const value = (name: string) => String(fields.get(name) ?? '').trim();
    const payload: EmployeeInput = {
      name: value('name'), email: value('email').toLowerCase(), admissionDate: value('admissionDate'),
      socialName: value('socialName') || undefined, registrationNumber: value('registrationNumber'),
      rg: value('rg') || undefined,
      assignments: assignments.map(({ title, startsOn, validUntil }) => ({
        title: title.trim(), startsOn: startsOn || undefined, validUntil: validUntil || undefined,
      })),
    };
    if (!payload.registrationNumber) { setError('Informe a matrícula funcional.'); return; }
    if (payload.name.length < 3 || (payload.socialName && payload.socialName.length < 3) ||
      payload.assignments.some(item => item.title.length < 2)) {
      setError('Informe nomes com pelo menos três caracteres e funções com pelo menos dois.');
      return;
    }
    if (payload.assignments.some(item => item.startsOn && item.validUntil && item.validUntil < item.startsOn)) {
      setError('O término de uma função deve ser igual ou posterior ao seu início.');
      return;
    }

    const serialized = JSON.stringify(payload);
    if (request.current?.payload !== serialized) request.current = { payload: serialized, id: crypto.randomUUID() };
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      const employee = await createEmployee(payload, request.current.id, controller.signal);
      if (!controller.signal.aborted) navigate('/funcionarios/' + employee.id, { replace: true, state: { registered: true } });
    } catch (cause) {
      if (!controller.signal.aborted) setError(employeeError(cause));
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <EmployeesLayout title="Registrar funcionário" back>
    <form className={styles.panel} onSubmit={submit}>
      <p>Preencha os campos obrigatórios marcados com *.</p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <legend>Dados cadastrais</legend>
        <div className={styles.grid}>
          <label>Nome completo *<input name="name" required minLength={3} maxLength={160} /></label>
          <label>Nome social<input name="socialName" minLength={3} maxLength={160} /></label>
          <label>E-mail *<input name="email" type="email" required maxLength={254} /></label>
          <label>Data de admissão *<input name="admissionDate" type="date" required /></label>
          <label>Matrícula funcional *<input name="registrationNumber" required maxLength={40} /></label>
          <label>RG<input name="rg" maxLength={24} /></label>
        </div>
      </fieldset>
      {assignments.map((assignment, index) => <fieldset key={assignment.id} disabled={busy}>
        <legend>Função {index + 1}</legend>
        <div className={styles.grid}>
          {([['title', 'Cargo ou função *', 'text'], ['startsOn', 'Início da função', 'date'],
            ['validUntil', 'Término da função', 'date']] as const).map(([field, label, type]) =>
            <label key={field}>{label}<input type={type} value={assignment[field]}
              required={field === 'title'} minLength={field === 'title' ? 2 : undefined} maxLength={field === 'title' ? 120 : undefined}
              onChange={e => setAssignments(rows => rows.map(row => row.id === assignment.id
                ? { ...row, [field]: e.target.value } : row))} /></label>)}
        </div>
        {assignments.length > 1 && <button type="button" onClick={() => setAssignments(rows => rows.filter(row => row.id !== assignment.id))}>Remover função {index + 1}</button>}
      </fieldset>)}
      <div className={styles.toolbar}>
        <button type="button" disabled={busy} onClick={() => {
          const row = newAssignment(++counter.current);
          setAssignments(rows => [...rows, row]);
        }}>Adicionar função</button>
        <button className={styles.primary} disabled={busy}>{busy ? 'Registrando…' : 'Salvar cadastro'}</button>
      </div>
    </form>
  </EmployeesLayout>;
}

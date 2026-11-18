import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../../api/config/apiRequest';
import { getEmployee, getEmployeeAccess, changeArchive, type AccessStatus, type EmployeeDetails } from '../../api/employee/employeeService';
import Modal from '../../components/modal/Modal';
import EmployeeEditor from './EmployeeEditor';
import EmployeesLayout from './EmployeesLayout';
import { accountLabels, assignmentLabels, dateLabel, employeeError, timeLabel } from './employeePresentation';
import styles from './employees.module.css';

export default function EmployeeDetail() {
  const { id = '' } = useParams();
  return <EmployeeRecord key={id} id={id} />;
}

function EmployeeRecord({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState('');
  const [registered, setRegistered] = useState(location.state?.registered === true);
  const [reload, setReload] = useState(0);
  const [record, setRecord] = useState<{ reload: number; employee?: EmployeeDetails; access?: AccessStatus; error?: string }>();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<{ error?: string }>();
  const sendingRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([getEmployee(id, controller.signal), getEmployeeAccess(id, controller.signal)]).then(
      ([employee, access]) => { if (!controller.signal.aborted) setRecord({ reload, employee, access }); },
      error => { if (!controller.signal.aborted) setRecord({ reload, error: employeeError(error) }); },
    );
    return () => controller.abort();
  }, [id, reload]);

  useEffect(() => () => sendingRequest.current?.abort(), []);

  const current = record?.reload === reload ? record : undefined;
  const employee = current?.employee;
  const access = current?.access;
  const archive = employee?.accountStatus !== 'ARCHIVED';
  async function submitArchive() {
    if (!employee || sendingRequest.current || reason.trim().length < 3) return;
    const controller = new AbortController();
    sendingRequest.current = controller;
    setSending(true);
    setOutcome(undefined);
    try {
      await changeArchive(id, !archive, { expectedVersion: employee.version, reason: reason.trim() }, controller.signal);
      if (controller.signal.aborted) return;
      setArchiveOpen(false);
      setReason('');
      if (archive) navigate('/funcionarios', { replace: true, state: { archived: true } });
      else { setSuccess('Funcionário restaurado. Confira a situação da conta e dos vínculos.'); setReload(previous => previous + 1); }
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiRequestError && cause.status === 409) {
        setArchiveOpen(false);
        setOutcome({ error: 'O cadastro mudou. Confira a versão atual antes de confirmar novamente.' });
        setReload(previous => previous + 1);
      } else {
        setArchiveOpen(false);
        setOutcome({ error: employeeError(cause) });
      }
    } finally {
      sendingRequest.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  if (editing && employee) return <EmployeesLayout title="Editar funcionário" back>
    <EmployeeEditor employee={employee} onCancel={() => setEditing(false)} onSaved={() => {
      setEditing(false); setSuccess('Alteração salva.'); setReload(previous => previous + 1);
    }} />
  </EmployeesLayout>;

  return <EmployeesLayout title="Cadastro de funcionário" back>
    {success && <p className={styles.notice} role="status">{success}</p>}
    {registered && <div className={styles.notice} role="status">
      Funcionário registrado. Oriente o titular pelo fluxo indicado em Primeiro acesso.
      <button type="button" onClick={() => setRegistered(false)}>Dispensar</button>
    </div>}
    {!current && <p role="status">Consultando cadastro e acesso…</p>}
    {current?.error && <div role="alert"><p>{current.error}</p>
      <button onClick={() => setReload(previous => previous + 1)}>Tentar novamente</button>
    </div>}
    {employee && access && <>
      <section className={styles.panel} aria-label="Dados cadastrais">
        <h2>{employee.displayName}</h2>
        <div className={styles.toolbar}>
          {archive && <button className={styles.primary} disabled={sending} onClick={() => setEditing(true)}>Editar funcionário</button>}
          <button className={archive ? styles.danger : undefined} disabled={sending} onClick={() => { setReason(''); setOutcome(undefined); setArchiveOpen(true); }}>
            {archive ? 'Excluir funcionário' : 'Restaurar funcionário'}
          </button>
        </div>
        <dl className={styles.grid}>
          <div><dt>Nome completo</dt><dd>{employee.name}</dd></div>
          <div><dt>Nome social</dt><dd>{employee.socialName ?? 'Não informado'}</dd></div>
          <div><dt>E-mail</dt><dd>{employee.email}</dd></div>
          <div><dt>Matrícula funcional</dt><dd>{employee.registrationNumber ?? 'Não informada'}</dd></div>
          <div><dt>RG</dt><dd>{employee.rg ?? 'Não informado'}</dd></div>
          <div><dt>Admissão</dt><dd>{dateLabel(employee.admissionDate)}</dd></div>
          <div><dt>Conta</dt><dd>{accountLabels[employee.accountStatus]}</dd></div>
        </dl>
        <h3>Funções</h3>
        <ul className={styles.results}>{employee.assignments.map(assignment => <li key={assignment.id}>
          <div><strong>{assignment.title}</strong><p>Início: {dateLabel(assignment.startsOn)} · Término: {dateLabel(assignment.validUntil)}</p></div>
          <span className={styles.status}>{assignmentLabels[assignment.effectiveStatus]}</span>
        </li>)}</ul>
      </section>
      <section className={styles.panel} aria-label="Primeiro acesso">
        <h2>Primeiro acesso</h2>
        <dl className={styles.grid}>
          <div><dt>Senha</dt><dd>{access.passwordDefined ? 'Acesso ativado' : 'Aguardando ativação'}</dd></div>
          <div><dt>Último login</dt><dd>{timeLabel(access.lastLoginAt)}</dd></div>
          <div><dt>Primeiro acesso</dt><dd>{access.passwordDefined ? 'Concluído' : employee.registrationNumber ? 'Pendente · matrícula funcional' : 'Pendente · cadastre a matrícula funcional'}</dd></div>
        </dl>
        {sending && <p role="status">Aguarde…</p>}
        <div className={styles.toolbar}>
          <button disabled={sending} onClick={() => { setOutcome(undefined); setReload(previous => previous + 1); }}>Atualizar situação</button>
        </div>
      </section>
    </>}
    {outcome?.error && <p role="alert">{outcome.error}</p>}
    {employee && archiveOpen && <Modal label={archive ? 'Arquivar funcionário' : 'Restaurar funcionário'}
      onDismiss={sending ? undefined : () => setArchiveOpen(false)}>
      <form className={styles.archiveDialog} onSubmit={event => { event.preventDefault(); void submitArchive(); }}>
        <h2>{archive ? 'Arquivar funcionário' : 'Restaurar funcionário'}</h2>
        <p><strong>{employee.displayName}</strong></p>
        <p>{archive ? 'O cadastro será arquivado. O acesso e as sessões serão revogados.'
          : 'O cadastro voltará à lista ativa. A Secretaria deverá conferir o estado das funções e do acesso.'}</p>
        <label className={styles.reason}>Motivo<textarea required minLength={3} maxLength={500} value={reason}
          disabled={sending} onChange={event => setReason(event.target.value)} /></label>
        <div className={styles.toolbar}>
          <button type="button" disabled={sending} onClick={() => setArchiveOpen(false)}>Cancelar</button>
          <button className={archive ? styles.danger : styles.primary} disabled={sending || reason.trim().length < 3}>
            {archive ? 'Confirmar arquivamento' : 'Confirmar restauração'}
          </button>
        </div>
      </form>
    </Modal>}

  </EmployeesLayout>;
}

import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ApiRequestError } from '../../api/config/apiRequest';
import { getEmployee, getEmployeeAccess, inviteEmployee, type AccessStatus, type DeliveryState, type EmployeeDetails } from '../../api/employee/employeeService';
import MessageModal from '../../components/messageModal/MessageModal';
import EmployeesLayout from './EmployeesLayout';
import { accountLabels, assignmentLabels, dateLabel, deliveryLabels, employeeError, timeLabel } from './employeePresentation';
import styles from './employees.module.css';

export default function EmployeeDetail() {
  const { id = '' } = useParams();
  return <EmployeeRecord key={id} id={id} />;
}

function EmployeeRecord({ id }: { id: string }) {
  const location = useLocation();
  const [registered, setRegistered] = useState(location.state?.registered === true);
  const [reload, setReload] = useState(0);
  const [record, setRecord] = useState<{ reload: number; employee?: EmployeeDetails; access?: AccessStatus; error?: string }>();
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<{ deliveryState?: DeliveryState; error?: string }>();
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
  const canInvite = employee?.accountStatus === 'ACTIVE' && access && !access.passwordDefined &&
    access.lastDeliveryState !== 'PENDING';
  const actionLabel = access?.lastAccessRequestAt ? 'Reenviar convite' : 'Enviar convite';

  async function send() {
    if (!employee || !access || !canInvite || sendingRequest.current) return;
    const controller = new AbortController();
    sendingRequest.current = controller;
    setConfirm(false);
    setSending(true);
    setOutcome(undefined);
    try {
      const result = await inviteEmployee(id, crypto.randomUUID(), employee.version, controller.signal);
      if (controller.signal.aborted) return;
      setOutcome({ deliveryState: result.deliveryState });
      setRecord({ reload, employee, access: { ...access,
        lastAccessRequestAt: result.requestedAt, lastDeliveryState: result.deliveryState } });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const conflict = cause instanceof ApiRequestError && cause.status === 409;
      setOutcome({ error: conflict
        ? 'O cadastro mudou. Confira os dados atualizados antes de enviar novamente.'
        : employeeError(cause) + ' Confira o último envio antes de tentar novamente.' });
      setReload(previous => previous + 1);
    } finally {
      sendingRequest.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return <EmployeesLayout title="Cadastro de funcionário" back>
    {registered && <div className={styles.notice} role="status">
      Funcionário registrado. Envie o convite nesta tela ou oriente a pessoa a solicitar primeiro acesso no portal.
      <button type="button" onClick={() => setRegistered(false)}>Dispensar</button>
    </div>}
    {!current && <p role="status">Consultando cadastro e acesso…</p>}
    {current?.error && <div role="alert"><p>{current.error}</p>
      <button onClick={() => setReload(previous => previous + 1)}>Tentar novamente</button>
    </div>}
    {employee && access && <>
      <section className={styles.panel} aria-label="Dados cadastrais">
        <h2>{employee.displayName}</h2>
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
          <div><dt>Última solicitação</dt><dd>{timeLabel(access.lastAccessRequestAt)}</dd></div>
          <div><dt>Situação do envio</dt><dd>{access.lastDeliveryState ? deliveryLabels[access.lastDeliveryState] : 'Sem envio registrado'}</dd></div>
        </dl>
        {sending && <p role="status">Solicitando convite…</p>}
        {outcome?.deliveryState && <p role={outcome.deliveryState === 'FAILED' ? 'alert' : 'status'}>
          {deliveryLabels[outcome.deliveryState]}
        </p>}
        <div className={styles.toolbar}>
          {canInvite && <button className={styles.primary} disabled={sending} onClick={() => setConfirm(true)}>{actionLabel}</button>}
          <button disabled={sending} onClick={() => { setOutcome(undefined); setReload(previous => previous + 1); }}>Atualizar situação</button>
        </div>
      </section>
    </>}
    {outcome?.error && <p role="alert">{outcome.error}</p>}
    {employee && <MessageModal visible={confirm} title={actionLabel + '?'} tone="info"
      message={'As instruções de ativação serão solicitadas para ' + employee.email + '.'}
      confirmText="Confirmar envio" cancelText="Voltar" onConfirm={() => void send()}
      onCancel={() => setConfirm(false)} onDismiss={() => setConfirm(false)} />}
  </EmployeesLayout>;
}

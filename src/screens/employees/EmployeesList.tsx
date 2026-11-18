import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listEmployees } from '../../api/employee/employeeService';
import { accountLabels, employeeError } from './employeePresentation';
import EmployeesLayout from './EmployeesLayout';
import styles from './employees.module.css';

export default function EmployeesList() {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState({ query: '', cursor: null as string | null, attempt: 0 });
  const [result, setResult] = useState<{
    filter: typeof filter;
    data?: Awaited<ReturnType<typeof listEmployees>>;
    error?: string;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    void listEmployees(filter.query, filter.cursor, controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ filter, data }); },
      error => { if (!controller.signal.aborted) setResult({ filter, error: employeeError(error) }); },
    );
    return () => controller.abort();
  }, [filter]);

  const current = result?.filter === filter ? result : undefined;
  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilter({ query: input.trim(), cursor: null, attempt: 0 });
  };

  return <EmployeesLayout title="Funcionários">
    <section className={styles.panel} aria-label="Cadastro de funcionários">
      <div className={styles.toolbar}>
        <form onSubmit={search} className={styles.toolbar}>
          <label>Nome, e-mail ou matrícula funcional
            <input type="search" value={input} maxLength={254} onChange={e => setInput(e.target.value)} />
          </label>
          <button type="submit">Pesquisar</button>
        </form>
        <Link className={styles.primary} to="/funcionarios/novo">Registrar funcionário</Link>
      </div>
      {!current && <p role="status">Carregando funcionários…</p>}
      {current?.error && <div role="alert"><p>{current.error}</p>
        <button onClick={() => setFilter(previous => ({ ...previous, attempt: previous.attempt + 1 }))}>Tentar novamente</button>
      </div>}
      {current?.data?.items.length === 0 && <p>Nenhum funcionário encontrado.</p>}
      {current?.data && <>
        <ul className={styles.results}>
          {current.data.items.map(employee => <li key={employee.id}>
            <div><Link to={'/funcionarios/' + employee.id}>{employee.displayName}</Link>
              {employee.displayName !== employee.name && <p>{employee.name}</p>}
              <p>{employee.email}</p>
              {employee.registrationNumber && <p>Matrícula: {employee.registrationNumber}</p>}
              {employee.assignmentTitles.length > 0 && <p>{employee.assignmentTitles.join(' · ')}</p>}
            </div>
            <span className={styles.status}>{accountLabels[employee.accountStatus]}</span>
          </li>)}
        </ul>
        <div className={styles.toolbar}>
          {filter.cursor && <button onClick={() => setFilter({ ...filter, cursor: null })}>Primeira página</button>}
          {current.data.nextCursor && <button onClick={() => setFilter({ ...filter, cursor: current.data!.nextCursor })}>Próxima página</button>}
        </div>
      </>}
    </section>
  </EmployeesLayout>;
}

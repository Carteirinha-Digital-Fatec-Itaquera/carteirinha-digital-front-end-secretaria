import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { listEmployees } from "../../api/employee/employeeService";
import { accountLabels, employeeError } from "./employeePresentation";
import EmployeesLayout from "./EmployeesLayout";
import EmployeeApprovedPhoto from "./EmployeeApprovedPhoto";
import list from "../student/list/style.module.css";
import table from "../../components/tabelaStudents/style.module.css";
import styles from "./employeeList.module.css";

type Filter = {
  query: string;
  cursor: string | null;
  attempt: number;
  includeArchived: boolean;
};
type Data = Awaited<ReturnType<typeof listEmployees>>;
export default function EmployeesList() {
  const { state } = useLocation();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>({
    query: "",
    cursor: null,
    attempt: 0,
    includeArchived: false,
  });
  const [result, setResult] = useState<{
    filter: Filter;
    dataFilter?: Filter;
    data?: Data;
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void listEmployees(
      filter.query,
      filter.cursor,
      controller.signal,
      filter.includeArchived,
    ).then(
      (data) => {
        if (!controller.signal.aborted)
          setResult({ filter, dataFilter: filter, data });
      },
      (error) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            filter,
            dataFilter: previous?.dataFilter,
            data: previous?.data,
            error: employeeError(error),
          }));
      },
    );
    return () => controller.abort();
  }, [filter]);
  const loading = result?.filter !== filter;
  const data = result?.data;
  const error = !loading ? result?.error : undefined;
  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilter((previous) => ({
      ...previous,
      query: input.trim(),
      cursor: null,
      attempt: 0,
    }));
  };
  return (
    <EmployeesLayout title="Listagem de Funcionários" list>
      {state?.archived && (
        <p className={styles.notice} role="status">
          Funcionário arquivado. O acesso foi revogado.
        </p>
      )}
      <section className={list.filterBar} aria-label="Cadastro de funcionários">
        <form onSubmit={search} className={styles.filters}>
          <div className={list.searchArea}>
            <div className={list.searchBox}>
              <input
                className={list.searchInput}
                type="search"
                aria-label="Nome, e-mail ou matrícula funcional"
                placeholder="Nome, e-mail ou matrícula funcional"
                value={input}
                maxLength={254}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className={styles.searchButton + " " + list.searchIcon}
                type="submit"
                aria-label="Pesquisar"
              >
                <FiSearch aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.actions}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filter.includeArchived}
                onChange={(e) =>
                  setFilter((previous) => ({
                    ...previous,
                    cursor: null,
                    includeArchived: e.target.checked,
                  }))
                }
              />{" "}
              Mostrar arquivados
            </label>
            <Link className={styles.secondary} to="/funcionarios/importar">
              Importar Funcionários
            </Link>
            <Link className={styles.primary} to="/funcionarios/novo">
              Registrar funcionário
            </Link>
          </div>
        </form>
      </section>
      {loading && (
        <p role="status">
          {data ? "Atualizando funcionários…" : "Carregando funcionários…"}
        </p>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          <button
            onClick={() =>
              setFilter((previous) => ({
                ...previous,
                attempt: previous.attempt + 1,
              }))
            }
          >
            Tentar novamente
          </button>
        </div>
      )}
      {(loading || error) && data && (
        <p className={styles.muted}>
          A última consulta permanece visível até a atualização ser concluída.
        </p>
      )}
      <section
        className={list.list}
        aria-label="Lista de funcionários"
        aria-busy={loading}
      >
        <div className={list.listHeader}>
          <div>
            Exibidos:{" "}
            <span>{data?.items.length ?? 0} funcionário(s) nesta página</span>
          </div>
        </div>
        <div
          className={table.tableWrapper}
          role="region"
          aria-label="Tabela de funcionários com rolagem horizontal"
          tabIndex={0}
        >
          <table className={"table mb-0 " + table.tabela}>
            <thead className={table.colunas}>
              <tr>
                {[
                  "Foto",
                  "Matrícula funcional",
                  "Situação",
                  "Funções",
                  "Nome",
                  "E-mail",
                  "Consultar",
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && !error && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className={table.semAlunos}>
                    {filter.query
                      ? "Nenhum funcionário encontrado para esta pesquisa."
                      : "Nenhum funcionário cadastrado nesta consulta."}
                  </td>
                </tr>
              )}
              {data?.items.map((employee) => (
                <tr key={employee.id} className={table.linhas}>
                  <td>
                    <EmployeeApprovedPhoto
                      employeeId={employee.id}
                      approvedPhotoId={employee.photo?.approvedPhotoId}
                      name={employee.displayName}
                    />
                  </td>
                  <td>{employee.registrationNumber || "Não informada"}</td>
                  <td>
                    <span
                      className={
                        table.badge +
                        " " +
                        (employee.accountStatus === "ACTIVE"
                          ? table.badgeActive
                          : table.badgeInactive)
                      }
                    >
                      {accountLabels[employee.accountStatus]}
                    </span>
                  </td>
                  <td>
                    {employee.assignmentTitles.join(" · ") ||
                      "Nenhuma função vigente"}
                  </td>
                  <td>
                    <Link
                      className={styles.name}
                      to={"/funcionarios/" + encodeURIComponent(employee.id)}
                    >
                      {employee.displayName}
                    </Link>
                    {employee.name !== employee.displayName && (
                      <span className={styles.fullName}>{employee.name}</span>
                    )}
                  </td>
                  <td>{employee.email}</td>
                  <td className={table.colunaBotao}>
                    <Link
                      className={table.botaoGerenciar}
                      aria-label={
                        "Consultar funcionário " + employee.displayName
                      }
                      to={"/funcionarios/" + encodeURIComponent(employee.id)}
                    >
                      <DotsThreeVerticalIcon
                        size={35}
                        color="#005C6D"
                        weight="bold"
                        aria-hidden="true"
                      />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && (
          <nav
            className={styles.pagination}
            aria-label="Paginação de funcionários"
          >
            {filter.cursor && (
              <button
                disabled={loading}
                onClick={() =>
                  setFilter((previous) => ({ ...previous, cursor: null }))
                }
              >
                Primeira página
              </button>
            )}
            {result?.dataFilter === filter && data.nextCursor && (
              <button
                disabled={loading}
                onClick={() =>
                  setFilter((previous) => ({
                    ...previous,
                    cursor: data.nextCursor,
                  }))
                }
              >
                Próxima página
              </button>
            )}
          </nav>
        )}
      </section>
    </EmployeesLayout>
  );
}

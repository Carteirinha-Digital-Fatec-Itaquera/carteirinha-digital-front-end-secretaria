import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";
import { StudentApi, type Student } from '../../services/StudentApi';

function StudentsListScreen() {
  const navigate = useNavigate();

  const [estudantes, setEstudantes] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchEstudantes = async () => {
      try {
        const data = await StudentApi.getAll();
        setEstudantes(data);
      } catch (error) {
        console.error('Erro ao buscar estudantes: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudantes();
  }, []);

  const filteredEstudantes = estudantes.filter(estudante => {
    const term = searchTerm.toLocaleLowerCase();
    return (
      estudante.name?.toLowerCase().includes(term) ||
      estudante.email?.toLowerCase().includes(term) ||
      estudante.cpf?.includes(term) ||
      estudante.ra?.toString().includes(term)
    );
  });

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate("/login");
  }

  function handleRegister() {
    navigate("/register");
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando lista de estudantes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <img src={logoFatec} className={styles.logoLeft} alt="Logo Fatec" />

        <h1 className={styles.title}>Listagem de alunos</h1>

        <img src={logosGov} className={styles.logoRight} alt="Logos Governo" />
      </header>

      {/* SEARCH AREA */}
      <div className={styles.searchArea}>
        <label className={styles.searchLabel}>Pesquisar aluno</label>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Ex: nome, email ou CPF"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
        {searchTerm && (
          <div className={styles.searchInfo}>
            {filteredEstudantes.length} aluno(s) encontado(s)
          </div>
        )}
      </div>

      {/* STUDENTS LIST */}
      <div className={styles.list}>
        <div className={styles.listHeader}>
          <h2>
            Lista de Estudantes
          </h2>
          <span className={styles.totalCount}>
            Total: {estudantes.length} aluno(s)
          </span>
        </div>

        {filteredEstudantes.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? (
              <>
                <p>Nenhum estudante encontrado para "{searchTerm}"</p>
                <button 
                  className={styles.clearSearch}
                  onClick={() => setSearchTerm("")}
                >
                  Limpar busca
                </button>
              </>
            ) : (
              <p>Nenhum estudante cadastrado.</p>
            )}
          </div>
        ) : (
        <div className={styles.tableContainer}>
          <table className={styles.studentsTable}>
            <thead>
              <tr>
                <th>RA</th>
                <th>Nome</th>
                <th>Curso</th>
                <th>Período</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstudantes.map(estudante => (
                <tr key={estudante.ra}>
                  <td>{estudante.ra}</td>
                  <td>{estudante.name}</td>
                  <td>{estudante.course}</td>
                  <td>{estudante.period}</td>
                  <td>
                    <span className={`${styles.status} ${styles[estudante.status]}`}>
                      {estudante.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.viewButton}
                      onClick={() => navigate(`/estudante.ra`)}>
                        Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* FOOTER BUTTONS */}
      <footer className={styles.footer}>
        <button className={styles.logout} onClick={handleLogout}>
          Deslogar
        </button>

        <button className={styles.register} onClick={handleRegister}>
          Registrar aluno
        </button>
      </footer>
    </div>
  );
}

export default StudentsListScreen;
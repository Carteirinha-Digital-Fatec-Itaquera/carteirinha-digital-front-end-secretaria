import { useState, useEffect } from 'react';

import { useNavigate } from "react-router-dom";

import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";

import { SearchBarComp } from '../../../components/searchbar/SearchBarComp';
import { TitleComp } from '../../../components/title/TitleComp';
import { ButtonComp } from '../../../components/button/ButtonComp';

import { findAllByQuery } from '../../../api/student/findAllByQuery';

import type { Student } from '../../../domains/Student';

import styles from "./style.module.css";

export default function StudentsListScreen() {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await findAllByQuery(searchTerm);
        if (data != undefined) {
          setStudents(data);
        }
      } catch (error) {
        console.error('Erro ao buscar estudantes: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [searchTerm]);

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
      <header className={styles.header}>
        <img src={logoFatec} className={styles.logoLeft} alt="Logo Fatec" />
        <img src={logosGov} className={styles.logoRight} alt="Logos Governo" />
      </header>

      <TitleComp text='Listagem de alunos' />

      <SearchBarComp
        label='Pequisar por alunos'
        placeholder='Ex: nome, email, CPF, RG ou RA'
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <h2>Lista de estudantes</h2>
          <span className={styles.totalCount}>
            Total: {students.length} aluno(s)
          </span>
        </div>

        {students.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? (
              <>
                <p>Nenhum estudante encontrado para "{searchTerm}"</p>
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
                  <th>Email</th>
                  <th>CPF</th>
                  <th>Curso</th>
                  <th>Período</th>
                  <th>Data de Nascimento</th>
                  <th>Admissão</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <StudentCardComp student={student} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <ButtonComp
          text='Deslogar'
          onClick={() => { navigate("/login") }}
        />

        <ButtonComp
          text='Registrar aluno'
          onClick={() => { navigate("/register") }}
        />
      </footer>
    </div>
  );
}

type StudentCardProps = {
  student: Student;
}

const StudentCardComp = ({ student }: StudentCardProps) => {
  return (
    <tr key={student.ra}>
      <td>{student.ra}</td>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>{student.rg}</td>
      <td>{student.cpf}</td>
      <td>{student.course}</td>
      <td>{student.period}</td>
      <td>{student.admission}</td>
      <td>{student.birthDate}</td>
      <td>{student.dueDate}</td>
      <td>
        <span className={`${styles.status} ${styles[student.status]}`}>
          {student.status}
        </span>
      </td>
    </tr>
  );
};



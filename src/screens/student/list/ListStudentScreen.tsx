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
        label='Pesquisar por alunos'
        placeholder='Ex: nome, CPF, RG, e-mail, curso, periodo, status ou RA'
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
              <p>Nenhum estudante encontrado para "{searchTerm}"</p>
            ) : (
              <p>Nenhum estudante cadastrado.</p>
            )}
          </div>
        ) : (
          <div className={styles.cardsContainer}>
            {students.map(student => (
              <StudentCardComp
                key={student.id}
                student={student}
                onAction={() => { navigate(`/update/${student.id}`) }}
              />
            ))}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <ButtonComp
          text='Deslogar'
          onClick={() => {
            sessionStorage.removeItem('token')
            navigate("/login")
          }}
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
  onAction: () => void
};

const StudentCardComp = ({ student, onAction }: StudentCardProps) => {
  return (
    <div className={styles.studentCard}>
      <div className={styles.cardHeader}>
        <span className={styles.ra}>RA: {student.ra}</span>
        <span className={`${styles.status} ${styles[student.status]}`}>
          {student.status}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p><strong>Nome:</strong> {student.name}</p>
        <p><strong>Email:</strong> {student.email}</p>
        <p><strong>CPF:</strong> {student.cpf}</p>
        <p><strong>RG:</strong> {student.rg}</p>
        <p><strong>Curso:</strong> {student.course}</p>
        <p><strong>Período:</strong> {student.period}</p>
        <p><strong>Data de nascimento:</strong> {student.birthDate}</p>
        <p><strong>Admissão:</strong> {student.admission}</p>
        <p><strong>Vencimento:</strong> {student.dueDate}</p>
      </div>

      <div className={styles.container_button}>
        <ButtonComp
          text='Gerenciar informações'
          onClick={onAction}
        />
      </div>
    </div>
  );
};

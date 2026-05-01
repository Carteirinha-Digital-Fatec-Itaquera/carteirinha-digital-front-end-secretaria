import { useNavigate } from 'react-router-dom';
import type { Student } from '../../domains/Student';
import styles from './style.module.css';

type Props = {
  students: Student[];
};

const statusLabel: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
};

const formatAdmission = (admission: Date | string | number) => {
  if (!admission) return '-';
  const date = new Date(admission);
  if (!isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
  return String(admission);
};

function TabelaStudents({ students }: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.tableWrapper}>
      <div className="table-responsive table-lg">
        <table className={`table mb-0 ${styles.tabela}`}>
          <thead className={styles.colunas}>
            <tr>
              <th>RA</th>
              <th>Situação</th>
              <th>Ingresso</th>
              <th>Curso</th>
              <th>Nome</th>
              <th>CPF</th>
              <th>Nascimento</th>
              
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.semAlunos}>
                  Nenhum aluno encontrado.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.ra} className={styles.linhas}>
                  <td>{student.ra}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        student.status === 'Em curso' || student.status === 'Concluido'
                          ? styles.badgeActive
                          : styles.badgeInactive
                          
                      }`}
                    >
                      {statusLabel[student.status] ?? student.status}
                    </span>
                  </td>
                  <td>{formatAdmission(student.admission)}</td>
                  <td>{student.course}</td>
                  <td>{student.name}</td>
                  <td>{student.cpf}</td>
                  <td>{formatAdmission(student.birthDate)}</td>
                  
                  <td>{student.email}</td>
                  <td className={styles.colunaBotao}>
                    <button
                      className={styles.botaoGerenciar}
                      onClick={() => navigate(`/update/${student.ra}`)}
                    >
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TabelaStudents;

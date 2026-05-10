import { useNavigate } from 'react-router-dom';
import type { Student } from '../../domains/Student';
import styles from './style.module.css';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react';

type Props = {
  students: Student[];
};



const formatAdmissionYear = (admission: Date | string | number) => {
  if (!admission) return '-';
  const str = String(admission);
  
  // Se já está no formato 20241 ou 20242, retorna direto
  if (/^\d{5}$/.test(str)) return str;
  
  // Se é uma data, converte para semestre
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const semester = month <= 6 ? 1 : 2;
    return `${year}${semester}`;
  }

  return str;
};

function TabelaStudents({ students }: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.tableWrapper}>
      <div className="table-responsive table-lg">
        <table className={`table mb-0 ${styles.tabela}`}>
          <thead className={styles.colunas}>
            <tr>
              <th>Foto</th>
              <th>RA</th>
              <th>Situação</th>
              <th>Ingresso</th>
              <th>Curso</th>
              <th>Nome</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Editar</th>
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
          <td>
            {student.photo && student.photoForAnalysis === 'APPROVED' ? 
            (<img
                src={student.photo}
                alt="Foto"
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />) : 
              (
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Sem foto</span>
              )}
          </td>
  <td>{student.ra}</td>
  <td>
    <span className={`${styles.badge} ${
      ['em curso', 'concluido', 'ativo'].includes(student.status?.trim().toLowerCase())
        ? styles.badgeActive
        : styles.badgeInactive
    }`}>
      {student.status || 'Desconhecido'}
    </span>
  </td>
  <td>{formatAdmissionYear(student.admission)}</td>
  <td>{student.course}</td>
  <td>{student.name}</td>
  <td>{student.cpf}</td>
  <td>{student.email}</td>
  <td className={styles.colunaBotao}>
    <button
      className={styles.botaoGerenciar}
      onClick={() => navigate(`/update/${student.ra}`)}
    >
      <DotsThreeVerticalIcon size={35} color="#005C6D" weight="bold" className={styles.iconMenu}/>
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

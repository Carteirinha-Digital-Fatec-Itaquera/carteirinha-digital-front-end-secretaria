import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaUpload, FaPlus, FaSignOutAlt, FaUserGraduate } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { findAllByQuery } from '../../../api/student/findAllByQuery';
import { deleteById } from '../../../api/student/deleteById';
import type { Student } from '../../../domains/Student';
import styles from './style.module.css';

export default function ListStudentScreen() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRas, setSelectedRas] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const data = await findAllByQuery('');
      if (data) setStudents(data);
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.ra.includes(searchTerm) ||
    student.cpf.includes(searchTerm) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (ra: string) => {
    setSelectedRas(prev =>
      prev.includes(ra) ? prev.filter(r => r !== ra) : [...prev, ra]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRas.length === filteredStudents.length) {
      setSelectedRas([]);
    } else {
      setSelectedRas(filteredStudents.map(s => s.ra));
    }
  };

  const handleDelete = async (ra: string) => {
    if (!ra) {
      toast.error('RA inválido');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir este aluno permanentemente?')) return;
    const result = await deleteById(ra);
    if ('ok' in result) {
      toast.success('Aluno removido com sucesso');
      setStudents(prev => prev.filter(s => s.ra !== ra));
      setSelectedRas(prev => prev.filter(r => r !== ra));
    } else {
      toast.error(result.message || 'Erro ao excluir aluno');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRas.length === 0) {
      toast.warning('Nenhum aluno selecionado');
      return;
    }
    if (!window.confirm(`Excluir ${selectedRas.length} aluno(s) permanentemente?`)) return;
    for (const ra of selectedRas) {
      await deleteById(ra);
    }
    toast.success(`${selectedRas.length} aluno(s) removido(s)`);
    setStudents(prev => prev.filter(s => !selectedRas.includes(s.ra)));
    setSelectedRas([]);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoBox}>
            <img src="/fatec_ra_metropolitana_sp_capital_itaquera_cor.png" alt="Fatec" className={styles.logoImage} />
          </div>
        </div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${styles.navItemActive}`}>
            <FaUserGraduate /> Alunos
          </div>
          <div className={styles.navItem} onClick={() => navigate('/upload-alunos')}>
            <FaUpload /> Importar
          </div>
          <div className={styles.navItem} onClick={() => navigate('/register')}>
            <FaPlus /> Novo Aluno
          </div>
        </nav>
        <div className={styles.sidebarFooter}>
             <img src="/logos_cps_governo_com_slogan_horizontal_cor.png" alt="Governo" className={styles.logoImageCps} />
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Gerenciar Alunos</h1>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Buscar por nome, RA, CPF..."
            className={styles.filterInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {selectedRas.length > 0 && (
            <button className={styles.btnDeleteSelected} onClick={handleDeleteSelected}>
              <FaTrash /> Excluir selecionados ({selectedRas.length})
            </button>
          )}
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedRas.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleSelectAll} /></th>
                <th>RA</th>
                <th>Nome</th>
                <th>Email</th>
                <th>CPF</th>
                <th>Curso</th>
                <th>Admissão</th>
                <th>Período</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.ra} className={selectedRas.includes(student.ra) ? styles.rowSelected : ''}>
                  <td><input type="checkbox" checked={selectedRas.includes(student.ra)} onChange={() => toggleSelect(student.ra)} /></td>
                  <td>{student.ra}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.cpf}</td>
                  <td>{student.course}</td>
                  <td>{student.admission}</td>
                  <td>{student.period === 'MANHA' ? 'Manhã' : student.period === 'TARDE' ? 'Tarde' : 'Noite'}</td>
                  <td><span className={`${styles.badge} ${student.status === 'ATIVO' ? styles.badgeActive : styles.badgeInactive}`}>{student.status}</span></td>
                  <td className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => navigate(`/update/${student.ra}`)}><FaEdit /></button>
                    <button className={styles.btnDelete} onClick={() => handleDelete(student.ra)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
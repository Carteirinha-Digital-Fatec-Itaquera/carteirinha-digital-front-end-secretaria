import { useState, useEffect, useMemo } from 'react';

import { TitleComp } from '../../../components/title/TitleComp';
import MenuLateral from '../../../components/menuLateral/MenuLateral';

import { findAllByQuery } from '../../../api/student/findAllByQuery';

import type { Student } from '../../../domains/Student';

import styles from "./style.module.css";
import layoutStyles from '../../../styles/layoutWithMenu.module.css';
import { AlertModalComp } from '../../../components/alertmodal/AlertModalComp';
import type { ErrorField } from '../../../utils/Types';
import { approvePhoto } from '../../../api/student/approvePhoto';
import { toast } from 'react-toastify';
import { ErrorModalComp } from '../../../components/errormodal/ErrorModalComp';
import { LoadingComp } from '../../../components/loading/LoadingComp';
import TabelaStudents from '../../../components/tabelaStudents/TabelaStudents';
import { FiSearch } from 'react-icons/fi';

export default function StudentsListScreen() {

  const [idStudentSelected,] = useState<string>("")
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [situacaoFilter, setSituacaoFilter] = useState('');
  const [cursoFilter, setCursoFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState("");

  const [messageError, setMessageError] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>([]);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [modalAlertVisible, setModalAlertVisible] = useState(false);

     const cursos = useMemo(() => {
    const set = new Set(students.map((s) => s.course).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

    const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSituacao = !situacaoFilter || s.status === situacaoFilter;
      const matchCurso = !cursoFilter || s.course === cursoFilter;
      return matchSituacao && matchCurso;
    });
  }, [students, situacaoFilter, cursoFilter]);

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


  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>

      <TitleComp text='Listagem de Alunos' />

      <div className={styles.filterBar}>

        {/* barra de pesquisa */}
        <div className={styles.searchArea} >
      <div className={styles.searchBox}>
        <input
              type="text"
              className={styles.searchInput}
              placeholder="Busca por Nome, CPF, E-mail, ou RA"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              
            />
        <span className={styles.searchIcon}>
          <FiSearch/>
        </span>
      </div>
    </div >
            {/* selects com os filtros */}
            <div style={{ width: '30%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>

            <select
              className={styles.filterSelect}
              value={situacaoFilter}
              onChange={(e) => setSituacaoFilter(e.target.value)}
            >
              <option value="">Todas as situações</option>
              <option value="Em curso">Em Curso</option>
              <option value="Trancado">Trancado</option>
              <option value="Concluido">Concluído</option>
              <option value="Desistente">Desistente</option>
            </select>

            <select
              className={styles.filterSelect}
              value={cursoFilter}
              onChange={(e) => setCursoFilter(e.target.value)}
            >
              <option value="">Todos os cursos</option>
              {cursos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            </div>
          </div>



      <ErrorModalComp
        visible={modalErrorVisible}
        error={messageError}
        fields={errorFields?.map((val: ErrorField) => val.description) ?? []}
        onClose={() => {
          setModalErrorVisible(false);
          setMessageError("");
          setErrorFields([]);
        }}
      />


      <AlertModalComp
        visible={modalAlertVisible}
        message={"Você deseja aprovar ou reprovar esta imagem? (Esta acão é irreversível)"}
        textCancel="Reprovar"
        textConfirm="Aprovar"
        onConfirm={async () => {
          const result = await approvePhoto(idStudentSelected, true);
          if ('ok' in result) {
            toast.success('A foto foi aprovada!', {
              position: 'top-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } else {
            setMessageError(result.message);
            setModalErrorVisible(true);
          }
          setModalAlertVisible(false);
        }}
        onCancel={async () => {
          const result = await approvePhoto(idStudentSelected, false);
          if ('ok' in result) {
            toast.success('A foto foi reprovada!', {
              position: 'top-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } else {
            setMessageError(result.message);
            setModalErrorVisible(true);
          }
          setModalAlertVisible(false);
        }}
      />

      <div className={styles.list}>
        <div className={styles.listHeader}>
            Total:  <span className={styles.totalCount}>{filteredStudents.length} aluno(s)
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <LoadingComp />
          </div>
        ) : (
          <TabelaStudents students={filteredStudents} />
        )}
      </div>

      
        </div>
      </div>
    </div>
  );
}

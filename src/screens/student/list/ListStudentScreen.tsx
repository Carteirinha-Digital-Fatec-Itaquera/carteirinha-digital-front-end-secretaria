import { useState, useEffect } from 'react';

import { useNavigate } from "react-router-dom";

import { SearchBarComp } from '../../../components/searchbar/SearchBarComp';
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

export default function StudentsListScreen() {
  const navigate = useNavigate();

  const [idStudentSelected, setIdStudentSelected] = useState<string>("");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [messageError, setMessageError] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>([]);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [modalAlertVisible, setModalAlertVisible] = useState(false);



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

      <SearchBarComp
        label='Pesquisar por Aluno'
        placeholder='Ex: Nome, CPF, E-mail, Curso, Status ou RA'
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />


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
            Total:  <span className={styles.totalCount}>{students.length} aluno(s)
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <LoadingComp />
          </div>
        ) : (
          <TabelaStudents students={students} />
        )}
      </div>

      
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { InputComp } from "../../../components/input/InputComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { TitleComp } from "../../../components/title/TitleComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { DatePickerComp } from "../../../components/dataPicker/DatePickerComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { AlertModalComp } from "../../../components/alertmodal/AlertModalComp";

import { Student } from "../../../domains/Student";
import type { ErrorField } from "../../../utils/Types";

import { update } from "../../../api/student/update";
import { findById } from "../../../api/student/findById";
import { deleteById } from "../../../api/student/deleteById";

import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";

import { FaBook, FaEnvelope, FaFlag, FaIdCard, FaUser, FaCalendarCheck } from "react-icons/fa";
 
import { removePhoto } from "../../../api/student/removePhoto";

const generateAdmissionOptions = (): string[] => {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    options.push(`${year}1`);
    options.push(`${year}2`);
  }
  return options;
};

const OPTIONS_ADMISSION = generateAdmissionOptions();

const OPTIONS_COURSE = [
  "Automação Industrial",
  "Fabricação Mecanica",
  "Desenvolvimento de Software Multiplataforma",
  "Manutenção Industrial",
  "Mecânica: Processos de Soldagem",
  "Refrigeração, Ventilação e Ar Condicionado",
];

const OPTIONS_STATUS = ["Em curso", "Trancado", "Concluído", "Desistente"];

interface SelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const SelectComp = ({ label, icon, value, options, onChange }: SelectProps) => (
  <div className={styles.selectContainer}>
    <label className={styles.label}>{label}</label>
    <div className={styles.inputContainer}>
      <span className={styles.icon}>{icon}</span>
      <select className={styles.selectField} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Selecione uma opção...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  </div>
);

export default function UpdateStudentScreen() {
  const [photo, setPhoto] = useState<string | null>(null);
  const navigate = useNavigate();
  const { ra: paramRa } = useParams();

  const [student, setStudent] = useState<Student | undefined>(undefined);
  const [ra, setRa] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [course, setCourse] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [admission, setAdmission] = useState("");
  const [status, setStatus] = useState("");

  const [isCalendarOpenBirthDate, setIsCalendarOpenBirthDate] = useState(false);

  const [messageError, setMessageError] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>([]);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [modalAlertVisible, setModalAlertVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(true);

  const maskCPF = (v: string) => v.replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);

  const formatISOToBR = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  useEffect(() => {
    if (!paramRa) {
      setLoadingStudent(false);
      return;
    }


    const loadStudent = async () => {
      try {
        const data = await findById(paramRa);
        setStudent(data);
      } catch (error) {
        console.error("Erro ao carregar aluno:", error);
      } finally {
        setLoadingStudent(false);
      }
    };

    loadStudent();
  }, [paramRa]);

  useEffect(() => {
    if (student) {
      setRa(student.ra ?? "");
      setName(student.name ?? "");
      setEmail(student.email ?? "");
      setCpf(student.cpf ?? "");
      setCourse(student.course ?? "");
      setBirthDate(formatISOToBR(student.birthDate ?? ""));
      setAdmission(student.admission ?? "");
      setStatus(student.status ?? "");
      setAdmission(student.admission ?? "");
      setPhoto(student.photo ?? null);
    }
  }, [student]);

  

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>

          <TitleComp text="Atualizar aluno" />

{photo && (
  <div className={styles.photoContainer}>
    <img
     src={photo}
      alt="Foto do aluno"
      className={styles.photoPreview}
    />
    <ButtonComp
      text="Remover foto"
      color="#bd0909"
      onClick={async () => {
        const result = await removePhoto(paramRa ?? "");
        if ('ok' in result) {
          setPhoto(null);
        } else {
          setMessageError(result.message);
          setModalErrorVisible(true);
        }
      }}
    />
  </div>
)}

          {loadingStudent ? (
            <LoadingComp />
          ) :  (
            <form className={styles.form}>
            <div className={styles.containerInputs}>
              <InputComp
                label="RA"
                placeholder="Ex: 1234567890123"
                icon={<FaIdCard />}
                value={ra}
                onChangeText={() => {}}
                
              />
              <SelectComp
               label="Ingresso"
               icon={<FaCalendarCheck />}
               value={admission}
               options={OPTIONS_ADMISSION}
               onChange={setAdmission}
              />
            </div>

            <div className={styles.containerInputs}>
              <InputComp label="Nome" placeholder="Ex: João Silva dos Santos" icon={<FaUser />} value={name} onChangeText={setName} />
              <DatePickerComp
                label="Data de Nascimento"
                value={birthDate}
                onChange={setBirthDate}
                isOpen={isCalendarOpenBirthDate}
                onToggle={() => setIsCalendarOpenBirthDate(!isCalendarOpenBirthDate)}
              />
            </div>

            <div className={styles.containerInputs}>
              <InputComp label="Email" type="email" placeholder="Ex: joao.santos@dominio.com" icon={<FaEnvelope />} value={email} onChangeText={setEmail} />
              <InputComp label="CPF" placeholder="000.000.000-00" icon={<FaIdCard />} value={cpf} onChangeText={(v) => setCpf(maskCPF(v))} />
            </div>

            <div className={styles.containerInputs}>
              <SelectComp label="Curso" icon={<FaBook />} value={course} options={OPTIONS_COURSE} onChange={setCourse} />
              <SelectComp label="Situação" icon={<FaFlag />} value={status} options={OPTIONS_STATUS} onChange={setStatus} />
            </div>

            <div className={styles.containerInputs}>
            </div>
          </form>
          
          )}

          

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
            message="Você tem certeza que deseja deletar este aluno? (Esta ação é irreversível)"
            onConfirm={async () => {
              setOnLoading(true);
              const result = await deleteById(paramRa ?? "");
              if ('ok' in result) {
                navigate("/students");
              } else {
                setMessageError(result.message);
                setModalErrorVisible(true);
              }
              setOnLoading(false);
              setModalAlertVisible(false);
            }}
            onCancel={() => setModalAlertVisible(false)}
          />

          {onLoading ? (
            <LoadingComp />
          ) : (
            <div className={styles.buttons}>
              <ButtonComp
                text="Atualizar"
                onClick={async () => {
                  setOnLoading(true);
                  const studentData = new Student({
                    ra: paramRa ?? "",
                    name,
                    email,
                    cpf,
                    course,
                    status,
                    admission,
                    birthDate: formatDateToISO(birthDate),
                  });

                  const result = await update(paramRa ?? "", studentData);
                  if ('ok' in result) {
                    navigate("/students");
                  } else {
                    setMessageError(result.message);
                    setErrorFields(result.errorFields ?? []);
                    setModalErrorVisible(true);
                  }
                  setOnLoading(false);
                }}
              />

              <ButtonComp
                text="Deletar"
                color="#bd0909ff"
                onClick={() => setModalAlertVisible(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
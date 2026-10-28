import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBook,
  FaEnvelope,
  FaFlag,
  FaIdCard,
  FaUser,
  FaCalendarCheck,
} from "react-icons/fa";

import { InputComp } from "../../../components/input/InputComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { TitleComp } from "../../../components/title/TitleComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { DatePickerComp } from "../../../components/dataPicker/DatePickerComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";

import { create } from "../../../api/student/create";
import { Student } from "../../../domains/Student";
import type { ErrorField } from "../../../utils/Types";
import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";

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

const SelectComp = ({ label, icon, value, options, onChange }: SelectProps) => {
  const selectId = useId();
  return (
  <div className={styles.selectContainer}>
    <label htmlFor={selectId} className={styles.label}>{label}</label>
    <div className={styles.inputContainer}>
      <span className={styles.icon}>{icon}</span>
      <select id={selectId} aria-label={label}
        className={styles.selectField}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>Selecione uma opção...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  </div>
  );
};

export default function RegisterStudentScreen() {
  const navigate = useNavigate();

  const [ra, setRa] = useState("");
  const [socialName, setSocialName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isCalendarOpenBirthDate, setIsCalendarOpenBirthDate] = useState(false);
  const [course, setCourse] = useState("");
  const [admission, setAdmission] = useState("");
  const [status, setStatus] = useState("");

  const [message, setMessage] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>();
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);

  const maskRA = (v: string) => v.replace(/\D/g, "").substring(0, 13);
  const maskCPF = (value: string) => value.replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2");

  const birthDateToISO = (value: string): string | null => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
        date.getDate() !== day || date.getTime() > Date.now()) return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <TitleComp text="Registro de aluno" />

          <form className={styles.form}>
            <div className={styles.containerInputs}>
              <InputComp label="RA" placeholder="Ex: 1234567890123" icon={<FaIdCard />} value={ra} onChangeText={(v) => setRa(maskRA(v))} />
              <SelectComp label="Ingresso" icon={<FaCalendarCheck />} value={admission} options={OPTIONS_ADMISSION} onChange={setAdmission} />
            </div>

            <div className={styles.containerInputs}>
              <InputComp label="Nome" placeholder="Ex: João Silva dos Santos" icon={<FaUser />} value={name} onChangeText={setName} />
              <InputComp label="Email" type="email" placeholder="Ex: joao.santos@dominio.com" icon={<FaEnvelope />} value={email} onChangeText={setEmail} />
            </div>

            <div className={styles.containerInputs}>
              <InputComp label="CPF" placeholder="000.000.000-00" icon={<FaIdCard />} value={cpf} onChangeText={(value) => setCpf(maskCPF(value))} />
              <InputComp label="Nome social (opcional)" placeholder="Nome utilizado nas novas emissões" icon={<FaUser />} value={socialName} onChangeText={setSocialName} />
              <DatePickerComp
                label="Data de nascimento"
                value={birthDate}
                onChange={setBirthDate}
                isOpen={isCalendarOpenBirthDate}
                onToggle={() => setIsCalendarOpenBirthDate((open) => !open)}
              />
            </div>

            <div className={styles.containerInputs}>
              <SelectComp label="Curso" icon={<FaBook />} value={course} options={OPTIONS_COURSE} onChange={setCourse} />
              <SelectComp label="Situação" icon={<FaFlag />} value={status} options={OPTIONS_STATUS} onChange={setStatus} />
            </div>
          </form>

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => val.description) ?? []}
            onClose={() => {
              setModalErrorVisible(false);
              setMessage("");
              setErrorFields([]);
            }}
          />

          {onLoading ? (
            <LoadingComp />
          ) : (
            <ButtonComp
              text="Registrar"
              onClick={async () => {
                if (ra.length !== 13) {
                  setMessage("O RA deve ter exatamente 13 dígitos.");
                  setModalErrorVisible(true);
                  return;
                }
                if (cpf.replace(/\D/g, "").length !== 11) {
                  setMessage("Informe um CPF com 11 dígitos.");
                  setModalErrorVisible(true);
                  return;
                }
                const formattedBirthDate = birthDateToISO(birthDate);
                if (!formattedBirthDate) {
                  setMessage("Informe uma data de nascimento válida (DD/MM/AAAA).");
                  setModalErrorVisible(true);
                  return;
                }

                setOnLoading(true);

                const result = await create(new Student({
                  ra, name, socialName, email, cpf, birthDate: formattedBirthDate, course, status, admission,
                }));

                if ('ok' in result) {
                  navigate("/students");
                } else {
                  setMessage(result.message);
                  setErrorFields(result.errorFields ?? []);
                  setModalErrorVisible(true);
                }
                setOnLoading(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
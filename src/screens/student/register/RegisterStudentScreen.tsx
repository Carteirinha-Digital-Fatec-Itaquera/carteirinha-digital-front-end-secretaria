import { useState } from "react";
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

const SelectComp = ({ label, icon, value, options, onChange }: SelectProps) => (
  <div className={styles.selectContainer}>
    <label className={styles.label}>{label}</label>
    <div className={styles.inputContainer}>
      <span className={styles.icon}>{icon}</span>
      <select
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

export default function RegisterStudentScreen() {
  const navigate = useNavigate();

  const [ra, setRa] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [admission, setAdmission] = useState("");
  const [status, setStatus] = useState("");

  const [message, setMessage] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>();
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);

  const maskRA = (v: string) => v.replace(/\D/g, "").substring(0, 13);

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

                setOnLoading(true);

                const result = await create(new Student({
                  ra, name, email, course, status, admission,
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
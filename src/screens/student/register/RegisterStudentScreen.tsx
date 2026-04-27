import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBirthdayCake,
  FaBook,
  FaCalendar,
  FaCalendarCheck,
  FaClock,
  FaEnvelope,
  FaFlag,
  FaIdCard,
  FaUser
} from "react-icons/fa";

import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";

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

// --- CONSTANTES DE OPÇÕES ---
const OPTIONS_COURSE = [
  "Automação Industrial",
  "Fabricação Mecanica",
  "Desenvolvimento de Software Multiplataforma",
  "Manutenção Industrial",
  "Mecânica: Processos de Soldagem",
  "Refrigeração, Ventilação e Ar Condicionado",
];
const OPTIONS_PERIOD = ["Manhã", "Tarde", "Noite"];
const OPTIONS_STATUS = ["Em curso", "Trancado", "Concluído", "Desistente"];
const OPTIONS_ADMISSION = ["20241", "20242", "20251", "20252", "20261"];

// --- COMPONENTE DE SELEÇÃO UNIFICADO ---
interface SelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const SelectComp = ({ label, icon, value, options, onChange }: SelectProps) => {
  return (
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
};

export default function RegisterStudentScreen() {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [ra, setRa] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [course, setCourse] = useState("");
  const [period, setPeriod] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [admission, setAdmission] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");

  const [message, setMessage] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>();
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);

  // --- MÁSCARAS ---
  const maskRA = (v: string) => v.replace(/\D/g, "").substring(0, 13);
  const maskCPF = (v: string) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").substring(0, 14);
  const maskRG = (v: string) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").substring(0, 12);
  const maskDate = (v: string) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").substring(0, 10);

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
           <InputComp label="Data de Nascimento" placeholder="DD/MM/AAAA" icon={<FaBirthdayCake />} value={birthDate} onChangeText={(v) => setBirthDate(maskDate(v))} />

         </div>

          <div className={styles.containerInputs}>
            <InputComp label="Email" type="email" placeholder="Ex: joao.santos@dominio.com" icon={<FaEnvelope />} value={email} onChangeText={setEmail} />
            <InputComp label="CPF" placeholder="000.000.000-00" icon={<FaIdCard />} value={cpf} onChangeText={(v) => setCpf(maskCPF(v))} />
          </div>

          <div className={styles.containerInputs}>
            <SelectComp label="Curso" icon={<FaBook />} value={course} options={OPTIONS_COURSE} onChange={setCourse} />
            <SelectComp label="Situação" icon={<FaFlag />} value={status} options={OPTIONS_STATUS} onChange={setStatus} />
          </div>

      
       
        <InputComp label="RG" placeholder="00.000.000-0" icon={<FaIdCard />} value={rg} onChangeText={(v) => setRg(maskRG(v))} />
        

       
        <SelectComp label="Período" icon={<FaCalendar />} value={period} options={OPTIONS_PERIOD} onChange={setPeriod} />
        
       

       
        <InputComp label="Vencimento" placeholder="DD/MM/AAAA" icon={<FaClock />} value={dueDate} onChangeText={(v) => setDueDate(maskDate(v))} />
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

            const formatDateToISO = (dateStr: string) => {
              const parts = dateStr.split('/');
              if (parts.length !== 3) return dateStr;
              return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };

            const result = await create(new Student({
              ra, name, email, rg, cpf, course, period, status, admission,
              birthDate: formatDateToISO(birthDate),
              dueDate: formatDateToISO(dueDate),
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
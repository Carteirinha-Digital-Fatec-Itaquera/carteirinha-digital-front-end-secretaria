import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBirthdayCake,
  FaBook, FaCalendar,
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

import { create } from "../../../api/student/create";
import { Student } from "../../../domains/Student";
import type { ErrorField } from "../../../utils/Types";
import styles from "./style.module.css";

export default function RegisterStudentScreen() {
  const navigate = useNavigate();

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

  const [message, setMessage] = useState("")
  const [errorFields, setErrorFields] = useState<ErrorField[]>()
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [onLoading, setOnLoading] = useState(false)

  // --- FUNÇÕES DE MÁSCARA ---
  const maskRA = (value: string) => {
    return value.replace(/\D/g, "").substring(0, 13);
  };

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .substring(0, 14);
  };

  const maskRG = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .substring(0, 12);
  };

  const maskDate = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .substring(0, 10);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={logoFatec} alt="Logo Fatec" className={styles.logoLeft} />
        <img src={logosGov} alt="Logos Governo" className={styles.logoRight} />
      </header>

      <TitleComp text="Registro de aluno" />

      <button className={styles.backButton} onClick={() => navigate("/students")}>
        <FaArrowLeft />
      </button>

      <form className={styles.form}>
        <InputComp label="Nome" placeholder="Ex: João Silva dos Santos" icon={<FaUser />} value={name} onChangeText={setName} />
        <InputComp label="Email" type="email" placeholder="Ex: joao.santos@dominio.com" icon={<FaEnvelope />} value={email} onChangeText={setEmail} />

        <InputComp
          label="RA"
          placeholder="Ex: 1234567890123"
          icon={<FaIdCard />}
          value={ra}
          onChangeText={(v) => setRa(maskRA(v))}
        />

        <InputComp
          label="RG"
          placeholder="00.000.000-0"
          icon={<FaIdCard />}
          value={rg}
          onChangeText={(v) => setRg(maskRG(v))}
        />

        <InputComp
          label="CPF"
          placeholder="000.000.000-00"
          icon={<FaIdCard />}
          value={cpf}
          onChangeText={(v) => setCpf(maskCPF(v))}
        />

        <InputComp label="Curso" placeholder="Ex: Desenvolvimento de Software" icon={<FaBook />} value={course} onChangeText={setCourse} />
        <InputComp label="Período" placeholder="Ex: Tarde, Manhã" icon={<FaCalendar />} value={period} onChangeText={setPeriod} />
        <InputComp label="Situação" placeholder="Ex: em curso, trancado" icon={<FaFlag />} value={status} onChangeText={setStatus} />
        <InputComp label="Ingresso" placeholder="Ex: 20251" icon={<FaCalendarCheck />} value={admission} onChangeText={setAdmission} />

        <InputComp
          label="Data de Nascimento"
          placeholder="DD/MM/AAAA"
          icon={<FaBirthdayCake />}
          value={birthDate}
          onChangeText={(v) => setBirthDate(maskDate(v))}
        />

        <InputComp
          label="Vencimento"
          placeholder="DD/MM/AAAA"
          icon={<FaClock />}
          value={dueDate}
          onChangeText={(v) => setDueDate(maskDate(v))}
        />
      </form>

      <ErrorModalComp
        visible={modalErrorVisible}
        error={message}
        fields={errorFields?.map((val: ErrorField) => val.description) ?? []}
        onClose={() => {
          setModalErrorVisible(false)
          setMessage("")
          setErrorFields([])
        }}
      />

      {onLoading ? (
        <LoadingComp />
      ) : (
        <ButtonComp
          text="Registrar"
          onClick={async () => {
            // VERIFICAÇÃO DE 13 DÍGITOS NO RA
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

            const student = new Student({
              ra,
              name,
              email,
              rg,
              cpf,
              course,
              period,
              status,
              admission,
              birthDate: formatDateToISO(birthDate),
              dueDate: formatDateToISO(dueDate),
            });

            const result = await create(student);
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
  );
}
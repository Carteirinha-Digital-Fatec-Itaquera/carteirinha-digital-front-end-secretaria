import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";
import { useState } from "react";
import { InputComp } from "../../components/input/InputComp";
import { FaArrowLeft, FaBirthdayCake, FaBook, FaCalendar, FaCalendarCheck, FaClock, FaEnvelope, FaFlag, FaIdCard, FaUser } from "react-icons/fa";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";

export default function RegisterStudentScreen() {
  const navigate = useNavigate();

  const [ra, setRa] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [course, setCourse] = useState("");
  const [period, setPeriod] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [admission, setAdmission] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");

  return (
    <div className={styles.container}>

      <header className={styles.header}>
        <img src={logoFatec} alt="Logo Fatec" className={styles.logoLeft} />
        <img src={logosGov} alt="Logos Governo" className={styles.logoRight} />
      </header>

      <TitleComp text="Registro de aluno" />

      <button
        className={styles.backButton}
        onClick={() => navigate("/students")}>
        <FaArrowLeft />
      </button>

      <form className={styles.form}>
        <InputComp
          label="RA"
          type="text"
          placeholder="Ex: 123456"
          icon={<FaIdCard />}
          value={ra}
          onChangeText={setRa}
        />

        <InputComp
          label="Nome"
          type="text"
          placeholder="Ex: João Moreira"
          icon={<FaUser />}
          value={name}
          onChangeText={setName}
        />

        <InputComp
          label="Email"
          type="email"
          placeholder="Ex: joao@dominio.com"
          icon={<FaEnvelope />}
          value={email}
          onChangeText={setEmail}
        />

        <InputComp
          label="CPF"
          type="text"
          placeholder="Ex: 123.456.789-00"
          icon={<FaIdCard />}
          value={cpf}
          onChangeText={setCpf}
        />

        <InputComp
          label="Curso"
          type="text"
          placeholder="Ex: Desenvolvimento de Software"
          icon={<FaBook />}
          value={course}
          onChangeText={setCourse}
        />

        <InputComp
          label="Período"
          type="number"
          placeholder="Ex: 5"
          icon={<FaCalendar />}
          value={period}
          onChangeText={setPeriod}
        />

        <InputComp
          label="Data de Nascimento"
          type="date"
          placeholder=""
          icon={<FaBirthdayCake />}
          value={birthDate}
          onChangeText={setBirthDate}
        />

        <InputComp
          label="Admissão"
          type="date"
          placeholder=""
          icon={<FaCalendarCheck />}
          value={admission}
          onChangeText={setAdmission}
        />

        <InputComp
          label="Vencimento"
          type="date"
          placeholder=""
          icon={<FaClock />}
          value={dueDate}
          onChangeText={setDueDate}
        />

        <InputComp
          label="Situação"
          type="text"
          placeholder="Ex: ativo, inativo, trancado"
          icon={<FaFlag />}
          value={status}
          onChangeText={setStatus}
        />

      </form>

      <ButtonComp
        text="Registrar"
        onClick={() => {}}
      />
    </div>
  );
}
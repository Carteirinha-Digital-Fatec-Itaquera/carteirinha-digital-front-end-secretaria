import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

import { Student } from "../../../domains/Student";

import type { ErrorField } from "../../../utils/Types";

import { update } from "../../../api/student/update";
import { findById } from "../../../api/student/findById";

import styles from "./style.module.css";

export default function UpdateStudentScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [student, setStudent] = useState<Student | undefined>(undefined);
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
  const [errorFields, setErrorFields] = useState<ErrorField[]>([]);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoadingStudent(false);
      return;
    }

    const loadStudent = async () => {
      try {
        const data = await findById(id);
        setStudent(data);
      } catch (error) {
        console.error("Erro ao carregar aluno:", error);
      } finally {
        setLoadingStudent(false);
      }
    };

    loadStudent();
  }, [id]);

  useEffect(() => {
    if (student) {
      setRa(student.ra ?? "");
      setName(student.name ?? "");
      setEmail(student.email ?? "");
      setRg(student.rg ?? "");
      setCpf(student.cpf ?? "");
      setCourse(student.course ?? "");
      setPeriod(student.period ?? "");
      setBirthDate(student.birthDate ?? "");
      setAdmission(student.admission ?? "");
      setDueDate(student.dueDate ?? "");
      setStatus(student.status ?? "");
    }
  }, [student]);

  if (loadingStudent) {
    return <LoadingComp />;
  }

  return (
    <div className={styles.container}>

      <header className={styles.header}>
        <img src={logoFatec} alt="Logo Fatec" className={styles.logoLeft} />
        <img src={logosGov} alt="Logos Governo" className={styles.logoRight} />
      </header>

      <TitleComp text="Atualizar aluno" />

      <button
        className={styles.backButton}
        onClick={() => navigate("/students")}>
        <FaArrowLeft />
      </button>

      <form className={styles.form}>
        <InputComp
          label="RA"
          placeholder="Ex: 1234567890000"
          icon={<FaIdCard />}
          value={ra}
          onChangeText={setRa}
        />

        <InputComp
          label="Nome"
          placeholder="Ex: João Silva dos Santos"
          icon={<FaUser />}
          value={name}
          onChangeText={setName}
        />

        <InputComp
          label="E-mail"
          type="email"
          placeholder="Ex: joao.santos@dominio.com"
          icon={<FaEnvelope />}
          value={email}
          onChangeText={setEmail}
        />

        <InputComp
          label="RG"
          placeholder="Ex: 12.345.678-9"
          icon={<FaIdCard />}
          value={rg}
          onChangeText={setRg}
        />

        <InputComp
          label="CPF"
          placeholder="Ex: 123.456.789-00"
          icon={<FaIdCard />}
          value={cpf}
          onChangeText={setCpf}
        />

        <InputComp
          label="Curso"
          placeholder="Ex: Desenvolvimento de Software"
          icon={<FaBook />}
          value={course}
          onChangeText={setCourse}
        />

        <InputComp
          label="Período"
          placeholder="Ex: Tarde, Manhã"
          icon={<FaCalendar />}
          value={period}
          onChangeText={setPeriod}
        />

        <InputComp
          label="Situação"
          placeholder="Ex: em curso, trancado"
          icon={<FaFlag />}
          value={status}
          onChangeText={setStatus}
        />

        <InputComp
          label="Ingresso"
          placeholder="Ex: 20251"
          icon={<FaCalendarCheck />}
          value={admission}
          onChangeText={setAdmission}
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
          label="Vencimento"
          type="date"
          placeholder=""
          icon={<FaClock />}
          value={dueDate}
          onChangeText={setDueDate}
        />

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
          text="Atualizar"
          onClick={async () => {
            setOnLoading(true);
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
              birthDate,
              dueDate,
            });
            const result = await update(id ?? "", student);
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
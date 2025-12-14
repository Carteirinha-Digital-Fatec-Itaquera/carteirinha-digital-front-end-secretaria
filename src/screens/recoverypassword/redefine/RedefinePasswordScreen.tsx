import { useState } from "react";

import { FaArrowLeft, FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { sendEmail } from "../../../api/recoverypassword/sendEmail";
import { FooterComp } from "../../../components/footer/FooterComp";
import { HeaderComp } from "../../../components/header/HeaderComp";
import { InputComp } from "../../../components/input/InputComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";

import type { ErrorField } from "../../../utils/Types";
import { Email } from "../../../domains/Email";
import styles from "./style.module.css";

export default function RedefinePasswordScreen() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("")
  const [errorFields, setErrorFields] = useState<ErrorField[]>()
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [onLoading, setOnLoading] = useState(false)

  return (
    <div className={styles.container}>
      <HeaderComp />

      <div className={styles.card}>

        <div className={styles.cardContent}>

          <TitleComp text="Redefinir senha" />

          <button
            className={styles.backButton}
            onClick={() => navigate("/login")}>
            <FaArrowLeft />
          </button>

          <p style={{ color: "#000", fontSize: "14px", margin: "30px" }}>
            Insira seu e-mail institucional para enviarmos um código de segurança.
          </p>

          <InputComp
            label="Email"
            type="email"
            placeholder="Ex: joao.santos@dominio.com"
            icon={<FaEnvelope />}
            value={email}
            onChangeText={setEmail}
          />

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => { return val.description }) ?? []}
            onClose={() => {
              setMessage("")
              setErrorFields([])
              setModalErrorVisible(false)
            }}
          />

          {onLoading ? (
            <LoadingComp />
          ) : (
            <ButtonComp
              text="Enviar e-mail"
              onClick={async () => {
                setOnLoading(true)
                const emailToSend = new Email({ email })
                const result = await sendEmail(emailToSend)
                if ('ok' in result) {
                  navigate(`/code/${email}`)
                } else {
                  setMessage(result.message)
                  setErrorFields(result.errorFields ?? [])
                  setModalErrorVisible(true)
                }
                setOnLoading(false)
              }}
            />
          )}
        </div>
      </div>

      <FooterComp />
    </div>
  );
}

import { useState } from "react";

import { FaArrowLeft, FaEnvelope } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { FooterComp } from "../../../components/footer/FooterComp";
import { HeaderComp } from "../../../components/header/HeaderComp";
import { InputComp } from "../../../components/input/InputComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";

import type { ErrorField } from "../../../utils/Types";

import { sendCode } from "../../../api/recoverypassword/sendCode";

import styles from "./style.module.css";

export default function RedefinePasswordScreen() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");

  const { email } = useParams();

  const [message, setMessage] = useState("")
  const [errorFields, setErrorFields] = useState<ErrorField[]>()
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [onLoading, setOnLoading] = useState(false)

  return (
    <div className={styles.container}>
      <HeaderComp />

      <div className={styles.card}>

        <div className={styles.cardContent}>

          <TitleComp text="Insira o código enviado" />

          <button
            className={styles.backButton}
            onClick={() => navigate("/redefine")}>
            <FaArrowLeft />
          </button>

          <p style={{ color: "#000", fontSize: "14px", margin: "30px" }}>
            Insira o código que enviamos no seu e-mail institucional.
          </p>

          <InputComp
            label="Código"
            placeholder="Ex: 000000"
            icon={<FaEnvelope />}
            value={code}
            onChangeText={setCode}
          />

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => { return val.description }) ?? []}
            onClose={() => { setModalErrorVisible(false) }}
          />

          {onLoading ? (
            <LoadingComp />
          ) : (
            <ButtonComp
              text="Enviar o código"
              onClick={async () => {
                setOnLoading(true)
                const result = await sendCode(email ?? "", code)
                if ('ok' in result) {
                  navigate(`/password/${email}/${code}`)
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

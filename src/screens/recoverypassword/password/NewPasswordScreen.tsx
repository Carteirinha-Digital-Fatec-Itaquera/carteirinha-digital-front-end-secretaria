import { useState } from "react";

import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { FooterComp } from "../../../components/footer/FooterComp";
import { HeaderComp } from "../../../components/header/HeaderComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { InputPasswordComp } from "../../../components/inputpassword/InputPasswordComp";

import { RecoveryPassword } from "../../../domains/RecoveryPassword";
import { sendPassword } from "../../../api/recoverypassword/sendPassword";
import type { ErrorField } from "../../../utils/Types";
import styles from "./style.module.css";

export default function RedefinePasswordScreen() {
  const navigate = useNavigate();

  const { email, code } = useParams();

  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

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
            onClick={() => navigate(`/code/${email}`)}>
            <FaArrowLeft />
          </button>

          <p style={{ color: "#000", fontSize: "14px", margin: "30px" }}>
            Código validado com sucesso! Redefina sua senha
          </p>

          <InputPasswordComp
            label="Senha"
            value={password}
            onChangeText={setPassword}
          />

          <InputPasswordComp
            label="Repita a senha"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
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
              text="Redefinir senha"
              onClick={async () => {
                setOnLoading(true)
                if (password !== passwordConfirm) {
                  setMessage("As senhas não são iguais.")
                  setModalErrorVisible(true)
                  setOnLoading(false)
                  return
                } 
                const recovery = new RecoveryPassword({
                  email: email ?? "",
                  code: code ?? "",
                  newPassword: password
                })
                const result = await sendPassword(recovery)
                if ('ok' in result) {
                  navigate(`/login`)
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

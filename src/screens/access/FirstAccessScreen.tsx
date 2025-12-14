import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { FaEnvelope, FaUser } from "react-icons/fa";

import { InputComp } from "../../components/input/InputComp";
import { InputPasswordComp } from "../../components/inputpassword/InputPasswordComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";
import { FooterComp } from "../../components/footer/FooterComp";
import { HeaderComp } from "../../components/header/HeaderComp";
import { TextWithActionComp } from "../../components/textwithaction/TextWithAction";
import { LoadingComp } from "../../components/loading/LoadingComp";
import { ErrorModalComp } from "../../components/errormodal/ErrorModalComp";

import { Secretary } from "../../domains/Secretary";

import type { ErrorField } from "../../utils/Types";

import { signup } from "../../api/auth/signup";

import styles from "./style.module.css";

export default function FirstAccessScreen() {
  const navigate = useNavigate();

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
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

          <TitleComp text="Cadastro secretaria" />

          <InputComp
            label="Nome"
            placeholder="Ex: João da Silva"
            icon={<FaUser />}
            value={name}
            onChangeText={setName}
          />

          <InputComp
            label="E-mail"
            type="email"
            placeholder="Ex: joao@dominio.com"
            icon={<FaEnvelope />}
            value={email}
            onChangeText={setEmail}
          />

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
              text="Cadastrar"
              onClick={async () => {
                setOnLoading(true)
                if (password !== passwordConfirm) {
                  setMessage("As senhas não são iguais.")
                  setModalErrorVisible(true)
                  setOnLoading(false)
                  return
                }
                const secretary = new Secretary({ name, email, password })
                const result = await signup(secretary)
                if ('ok' in result) {
                  navigate("/login")
                } else {
                  setMessage(result.message)
                  setErrorFields(result.errorFields ?? [])
                  setModalErrorVisible(true)
                }
                setOnLoading(false)
              }}
            />
          )}

          <TextWithActionComp
            text="Já possui uma conta?"
            textClickable="Clique aqui"
            onAction={() => {
              navigate("/login");
            }}
          />

        </div>
        <FooterComp />
      </div>
    </div>
  );
}

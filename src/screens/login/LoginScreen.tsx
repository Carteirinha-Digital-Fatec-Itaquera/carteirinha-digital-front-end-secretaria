import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";

import { InputComp } from "../../components/input/InputComp";
import { InputPasswordComp } from "../../components/inputpassword/InputPasswordComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";
import { FooterComp } from "../../components/footer/FooterComp";
import { HeaderComp } from "../../components/header/HeaderComp";
import { TextWithActionComp } from "../../components/textwithaction/TextWithAction";
import { ErrorModalComp } from "../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../components/loading/LoadingComp";

import { Auth } from "../../domains/Auth";

import { type ErrorField } from '../../utils/Types';

import { login } from "../../api/auth/login";

import styles from "./style.module.css";

export default function LoginScreen() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [message, setMessage] = useState("")
  const [errorFields, setErrorFields] = useState<ErrorField[]>()
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [onLoading, setOnLoading] = useState(false)

  return (
    <div className={styles.container}>

      <HeaderComp />

      <div className={styles.card}>

        <div className={styles.cardContent}>

          <TitleComp text="Login secretaria" />

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

          <div className={styles.containerRetrieve}>
            <TextWithActionComp
              text="Esqueceu a sua senha?"
              textClickable="Clique aqui"
              onAction={() => {
                navigate("/redefine")
              }}
            />
          </div>

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => { return val.description }) ?? []}
            onClose={() => { setModalErrorVisible(false) }}
          />

          {onLoading ? (
            <LoadingComp />
          ): (
              <ButtonComp
                text="Entrar"
                onClick={async () => {
                  setOnLoading(true)
                  const auth = new Auth({ email, password })
                  const result = await login(auth)
                  if ('token' in result) {
                    sessionStorage.setItem("token", result.token)
                    navigate("/students")
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
            text="Este é o seu primeiro acesso?"
            textClickable="Clique aqui"
            onAction={() => {
              navigate("/access")
            }}
          />

        </div>
        <FooterComp />
      </div>
    </div>
  );
}

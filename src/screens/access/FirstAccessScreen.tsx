import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { FaEnvelope, FaUser } from "react-icons/fa";

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
import { signup, confirmSignup } from "../../api/auth/signup";

import styles from "./style.module.css";
import { InputLogin } from "../../components/inputLoginCadastro/InputLogin";

export default function FirstAccessScreen() {
  const navigate = useNavigate();

  // Etapa: 1 = formulário, 2 = código de verificação
  const [step, setStep] = useState<1 | 2>(1)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [code, setCode] = useState("")

  const [isSuccess, setIsSuccess] = useState(false)
  const [message, setMessage] = useState("")
  const [errorFields, setErrorFields] = useState<ErrorField[]>()
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [onLoading, setOnLoading] = useState(false)

  const handleSignup = async () => {
    setOnLoading(true)

    if (!email.endsWith('@cps.sp.gov.br')) {
      setMessage("Apenas e-mails com domínio @cps.sp.gov.br são permitidos.")
      setModalErrorVisible(true)
      setOnLoading(false)
      return
    }

    if (password !== passwordConfirm) {
      setMessage("As senhas não são iguais.")
      setModalErrorVisible(true)
      setOnLoading(false)
      return
    }

    const secretary = new Secretary({ name, email, password })
    const result = await signup(secretary)

    if ('ok' in result) {
      setStep(2)
    } else {
      setMessage(result.message)
      setErrorFields(result.errorFields ?? [])
      setModalErrorVisible(true)
    }

    setOnLoading(false)
  }

  const handleConfirm = async () => {
    setOnLoading(true)

    if (code.trim().length !== 6) {
      setMessage("Digite o código de 6 dígitos enviado para o seu e-mail.")
      setModalErrorVisible(true)
      setOnLoading(false)
      return
    }

    const secretary = new Secretary({ name, email, password })
    const result = await confirmSignup(email, code.trim(), secretary)

    if ('ok' in result) {
      setMessage("Conta criada com sucesso! Faça login para continuar.")
      setIsSuccess(true)
      setModalErrorVisible(true)
    } else {
      setMessage(result.message)
      setErrorFields(result.errorFields ?? [])
      setModalErrorVisible(true)
    }

    setOnLoading(false)
  }

  return (
    <div className={styles.container}>
      <HeaderComp />
      <div className={styles.card}>
        <div className={styles.cardContent}>

          <TitleComp text={step === 1 ? "Cadastro secretaria" : "Confirmar e-mail"} />

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => val.description) ?? []}
            onClose={() => {
              setModalErrorVisible(false)
              setMessage("")
              setErrorFields([])
              if (isSuccess) navigate("/login")
            }}
          />

          {step === 1 ? (
            <>
              <InputLogin
                label="Nome"
                placeholder="Ex: João da Silva"
                icon={<FaUser />}
                value={name}
                onChangeText={setName}
              />

              <InputLogin
                label="E-mail"
                type="email"
                placeholder="Ex: joao@cps.sp.gov.br"
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

              {onLoading ? (
                <LoadingComp />
              ) : (
                <ButtonComp text="Cadastrar" onClick={handleSignup} />
              )}
            </>
          ) : (
            <>
              <p style={{ textAlign: "center", color: "#555", marginBottom: 20 }}>
                Enviamos um código de 6 dígitos para <strong>{email}</strong>.
                <br />Digite-o abaixo para confirmar seu cadastro.
              </p>

              <InputLogin
                label="Código de verificação"
                placeholder="000000"
                icon={<FaEnvelope />}
                value={code}
                onChangeText={setCode}
              />

              {onLoading ? (
                <LoadingComp />
              ) : (
                <>
                  <ButtonComp text="Confirmar" onClick={handleConfirm} />
                  <TextWithActionComp
                    text="Não recebeu o código?"
                    textClickable="Reenviar"
                    onAction={handleSignup}
                  />
                </>
              )}
            </>
          )}

          {step === 1 && (
            <TextWithActionComp
              text="Já possui uma conta?"
              textClickable="Clique aqui"
              onAction={() => navigate("/login")}
            />
          )}

        </div>
        <FooterComp />
      </div>
    </div>
  );
}
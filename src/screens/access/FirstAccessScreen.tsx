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

import { signup } from "../../api/auth/signup";

import styles from "./style.module.css";
import { InputLogin } from "../../components/inputLoginCadastro/InputLogin";

export default function FirstAccessScreen() {
  const navigate = useNavigate();

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [isSuccess, setIsSuccess] = useState(false)

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

          {step === 'form' ? (
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
                <ButtonComp
                  text="Cadastrar"
                  onClick={async () => {
                    setOnLoading(true)

                    if (!email.endsWith('@cps.sp.gov.br')) {
                      setMessage("Apenas e-mails com domínio @cps.sp.gov.br podem criar conta.")
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

                    const response = await fetch(`${import.meta.env.VITE_BASE_URL}/autenticacao/enviar-codigo-secretaria`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    })

                    if (response.ok) {
                      setStep('verify')
                    } else {
                      setMessage('Erro ao enviar código de verificação.')
                      setModalErrorVisible(true)
                    }
                    setOnLoading(false)
                  }}
                />
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: '14px', color: '#000', textAlign: 'center', margin: '16px 0' }}>
                Enviamos um código para <strong>{email}</strong>. Digite abaixo para confirmar:
              </p>

              <InputLogin
                label="Código de verificação"
                placeholder="Ex: 123456"
                value={code}
                onChangeText={setCode}
              />

              {onLoading ? (
                <LoadingComp />
              ) : (
                <ButtonComp
                  text="Confirmar código"
                  onClick={async () => {
                    setOnLoading(true)

                    const verifyResponse = await fetch(`${import.meta.env.VITE_BASE_URL}/autenticacao/verificar-codigo-secretaria`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, code })
                    })

                    const verifyResult = await verifyResponse.json() // ✅ lê o body

                    if (!verifyResult) { // ✅ verifica o valor boolean retornado
                        setMessage('Código inválido ou expirado.')
                        setModalErrorVisible(true)
                        setOnLoading(false)
                      return
                    }

                    const secretary = new Secretary({ name, email, password })
                    const result = await signup(secretary)
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
                  }}
                />
              )}

              <TextWithActionComp
                text="Não recebeu o código?"
                textClickable="Reenviar"
                onAction={async () => {
                  const response = await fetch(`${import.meta.env.VITE_BASE_URL}/autenticacao/enviar-codigo-secretaria`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                  })
                  if (response.ok) {
                    setMessage('Código reenviado com sucesso!')
                    setModalErrorVisible(true)
                  }
                }}
              />
            </>
          )}

          <TextWithActionComp
            text="Já possui uma conta?"
            textClickable="Clique aqui"
            onAction={() => navigate("/login")}
          />

        </div>
        <FooterComp />
      </div>
    </div>
  );
}
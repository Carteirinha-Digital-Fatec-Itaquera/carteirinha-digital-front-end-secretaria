import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { FaUser } from "react-icons/fa";

import { InputComp } from "../../components/input/InputComp";
import { InputPasswordComp } from "../../components/inputpassword/InputPasswordComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";
import { FooterComp } from "../../components/footer/FooterComp";
import { HeaderComp } from "../../components/header/HeaderComp";
import { TextWithActionComp } from "../../components/textwithaction/TextWithAction";

import styles from "./style.module.css";

export default function FirstAccessScreen() {
  const navigate = useNavigate();

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

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
            icon={<FaUser />}
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

          <ButtonComp
            text="Cadastrar"
            onClick={() => navigate("/login")}
          />

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

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
import { useState } from "react";

export default function LoginScreen() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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
            icon={<FaUser />}
            value={email}
            onChangeText={setEmail}
          />

          <InputPasswordComp
            label="Senha"
            value={password}
            onChangeText={setPassword}
          />

          <ButtonComp
            text="Entrar"
            onClick={() => navigate("/students")}
          />

          <TextWithActionComp
            text="Este é o seu primeiro acesso?"
            textClickable="Clique aqui"
            onAction={() => {
              navigate("/access");
            }}
          />

        </div>
        <FooterComp />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { FooterComp } from "../../../components/footer/FooterComp";
import { HeaderComp } from "../../../components/header/HeaderComp";
import { InputComp } from "../../../components/input/InputComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";

import { GLOBAL_VAR } from "../../../api/config/globalVar";
import styles from "./style.module.css";

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      setModalErrorVisible(true);
      return;
    }

    setOnLoading(true);

    const response = await fetch(`${GLOBAL_VAR.BASE_URL}/autenticacao/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, id, type, newPass: newPassword }),
    });

    const data = response.ok ? null : await response.json();
    if (response.ok) { 
      navigate("/login");
    } else {
      setMessage(data.message ?? "Erro ao redefinir senha.");
      setModalErrorVisible(true);
    }

    setOnLoading(false);
  };

  return (
    <div className={styles.container}>
      <HeaderComp />

      <div className={styles.card}>
        <div className={styles.cardContent}>
          <TitleComp text="Nova senha" />

          <p style={{ color: "#000", fontSize: "14px", margin: "30px" }}>
            Digite sua nova senha abaixo.
          </p>

          <InputComp
            label="Nova senha"
            type="password"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <InputComp
            label="Confirmar senha"
            type="password"
            placeholder="Confirme a nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={[]}
            onClose={() => {
              setMessage("");
              setModalErrorVisible(false);
            }}
          />

          {onLoading ? <LoadingComp /> : (
            <ButtonComp text="Redefinir senha" onClick={handleReset} />
          )}
        </div>
      </div>

      <FooterComp />
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { InputPasswordComp } from "../../components/inputpassword/InputPasswordComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { TitleComp } from "../../components/title/TitleComp";
import { FooterComp } from "../../components/footer/FooterComp";
import { HeaderComp } from "../../components/header/HeaderComp";
import { ErrorModalComp } from "../../components/errormodal/ErrorModalComp";
import { LoadingComp } from "../../components/loading/LoadingComp";

import { changePassword } from "../../api/auth/changePassword";

import type { ErrorField } from "../../utils/Types";

import styles from "./style.module.css";

export default function ChangePasswordScreen() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorFields, setErrorFields] = useState<ErrorField[]>([]);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [onLoading, setOnLoading] = useState(false);

  const handleSubmit = async () => {
    // Validações no frontend antes de chamar a API
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Preencha todos os campos.");
      setModalErrorVisible(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("A nova senha e a confirmação não coincidem.");
      setModalErrorVisible(true);
      return;
    }

    if (newPassword.length < 6) {
      setMessage("A nova senha deve ter pelo menos 6 caracteres.");
      setModalErrorVisible(true);
      return;
    }

    setOnLoading(true);
    const result = await changePassword({ currentPassword, newPassword });

    if ("ok" in result) {
      navigate("/students");
    } else {
      setMessage(result.message);
      setErrorFields(result.errorFields ?? []);
      setModalErrorVisible(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setOnLoading(false);
  };

  return (
    <div className={styles.container}>
      <HeaderComp />

      <div className={styles.card}>
        <div className={styles.cardContent}>

          <TitleComp text="Redefinir senha" />

          <p style={{ color: "#000", fontSize: "14px", margin: "16px 0 24px" }}>
            Seu acesso está vencido. Por favor, redefina sua senha para continuar.
          </p>

          <InputPasswordComp
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <InputPasswordComp
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <InputPasswordComp
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <ErrorModalComp
            visible={modalErrorVisible}
            error={message}
            fields={errorFields?.map((val: ErrorField) => val.description) ?? []}
            onClose={() => {
              setMessage("");
              setErrorFields([]);
              setModalErrorVisible(false);
            }}
          />

          {onLoading ? (
            <LoadingComp />
          ) : (
            <ButtonComp
              text="Salvar nova senha"
              onClick={handleSubmit}
            />
          )}

        </div>
        <FooterComp />
      </div>
    </div>
  );
}

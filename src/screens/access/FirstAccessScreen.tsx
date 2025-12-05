import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";

export default function FirstAccessScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleForgotPassword() {
    navigate("/redefine"); // tela de redefinir senha
  }

  function handleRegister() {
    navigate("/login"); // volta pra login após cadastro
  }

  function handleGoToLogin() {
    navigate("/login");
  }

  return (
    <div className={styles.container}>
      {/* TOPO */}
      <header className={styles.header}>
        <img
          src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png"
          alt="Logo Fatec"
          className={styles.logoTop}
        />
      </header>

      {/* CARD CENTRAL */}
      <div className={styles.card}>
        <h2 className={styles.title}>Primeiro acesso</h2>

        {/* EMAIL */}
        <label className={styles.label}>E-mail</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>👤</span>
          <input
            type="email"
            placeholder="Ex: fulano@dominio.com"
            className={styles.input}
          />
        </div>

        {/* SENHA */}
        <label className={styles.label}>Senha</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>🔒</span>

          <input
            type={showPassword ? "text" : "password"}
            className={styles.input}
          />

          <span
            className={styles.toggle}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </span>
        </div>

        {/* Esqueceu a senha */}
        <p className={styles.forgotPassword}>
          <a onClick={handleForgotPassword} style={{ cursor: "pointer" }}>
            Esqueceu sua senha?
          </a>
        </p>

        {/* BOTÃO */}
        <button className={styles.button} onClick={handleRegister}>
          Cadastrar
        </button>

        {/* Já possui conta */}
        <p className={styles.firstAccess}>
          Já possui conta?{" "}
          <a onClick={handleGoToLogin} style={{ cursor: "pointer" }}>
            Entrar
          </a>
        </p>
      </div>

      {/* LOGOS INFERIORES */}
      <footer className={styles.footer}>
        <img
          src="/logos_cps_governo_com_slogan_horizontal_cor.png"
          alt="Logos Governo"
          className={styles.logoBottom}
        />
      </footer>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";

export default function NewPasswordScreen() {
  const navigate = useNavigate();

  function handleDefinePassword() {
    navigate("/login"); // Volta para a tela de login
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
        <h2 className={styles.title}>Redefinir senha</h2>

        {/* TEXTO INFORMATIVO */}
        <p style={{ color: "#000", fontSize: "14px", marginBottom: "20px" }}>
          Código validado com sucesso. Redefina sua senha.
        </p>

        {/* NOVA SENHA */}
        <label className={styles.label}>Digite sua nova senha</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>🔒</span>
          <input
            type="password"
            placeholder="Digite sua nova senha"
            className={styles.input}
          />
        </div>

        {/* REPETIR SENHA */}
        <label className={styles.label}>Repita sua nova senha</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>🔒</span>
          <input
            type="password"
            placeholder="Repita sua nova senha"
            className={styles.input}
          />
        </div>

        {/* BOTÃO */}
        <button className={styles.button} onClick={handleDefinePassword}>
          Definir senha
        </button>
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

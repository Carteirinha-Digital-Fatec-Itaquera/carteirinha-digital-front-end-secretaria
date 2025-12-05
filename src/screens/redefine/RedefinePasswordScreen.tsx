import styles from "./style.module.css";
import { useNavigate } from "react-router-dom";

export default function RedefinePasswordScreen() {
  const navigate = useNavigate();

  function handleSendEmail() {
    navigate("/code"); // Vai para a tela de código de segurança
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
          Insira seu e-mail institucional para enviarmos um código de segurança.
        </p>

        {/* EMAIL */}
        <label className={styles.label}>E-mail institucional</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>👤</span>
          <input
            type="email"
            placeholder="Ex: fulano@fatec.sp.gov.br"
            className={styles.input}
          />
        </div>

        {/* BOTÃO */}
        <button className={styles.button} onClick={handleSendEmail}>
          Enviar E-mail
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

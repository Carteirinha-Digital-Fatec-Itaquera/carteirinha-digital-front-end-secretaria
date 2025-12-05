import { useNavigate } from "react-router-dom";
import styles from "./style.module.css"; 

export default function SecurityCodeScreen() {

  const navigate = useNavigate();

function handleSendCode() {
  navigate("/password"); 
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
          Insira o código de segurança que enviamos no seu e-mail institucional.
        </p>

        {/* CÓDIGO */}
        <label className={styles.label}>Insira o código</label>
        <div className={styles.inputArea}>
          <span className={styles.icon}>🔐</span>
          <input
            type="text"
            placeholder="Ex: 123456"
            className={styles.input}
          />
        </div>

        {/* BOTÃO */}
        <button className={styles.button} onClick={handleSendCode}>
        Enviar o código
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

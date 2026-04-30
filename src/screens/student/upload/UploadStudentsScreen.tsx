import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

import styles from "./style.module.css";
import layoutStyles from '../../../styles/layoutWithMenu.module.css';
import { uploadStudentsFile } from "../../../api/secretary/uploadStudentsFile";
import { HeaderComp } from "../../../components/header/HeaderComp";
import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { IconBase } from "react-icons";
import { CloudArrowUpIcon } from "@phosphor-icons/react";

export default function UploadStudentsScreen() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleCancel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFile(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Selecione um arquivo CSV, TXT ou PDF");
      return;
    }

    setLoading(true);
    const response = await uploadStudentsFile(file);
    setLoading(false);

    if ("ok" in response) {
      toast.success("Arquivo processado com sucesso!");
      setResult(response.ok);
    } else {
      toast.error(response.message || "Erro ao processar arquivo");
      setResult(response);
    }
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        
    <div className={styles.container}>

         <TitleComp text="Importar alunos" />



      <div className={styles.card}>
        {/* Botão voltar */}

       
        <p className={styles.info}>
          Envie um arquivo <strong>.CSV</strong>, <strong>.TXT</strong> ou <strong>.PDF</strong> com os dados dos alunos.
          <br />
          <strong>Formato esperado:</strong>
          <br />
          (RA: 13 digitos, Status: Em Curso, Trancado, Concluido ou Desistente e Admission: ex: 20241, 20242...)
          <br />
          (separado por vírgulas ou ponto e vírgula):
          <br />
          Parametros:
          <br />
          <code>ra;course;status;name;admission;email;cpf;birthDate</code>
        </p>

        <div className={styles.uploadBox}>
          <label htmlFor="fileUpload" className={styles.fileInputLabel}>
            <input
              id="fileUpload"
              type="file"
              accept=".csv,.txt,.pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className={styles.fileInput}
            />
            <div className={styles.uploadOverlay}>
                <CloudArrowUpIcon size={100} color="#005C6D" />
              <h3>Importe seu arquivo</h3>
              <p>
                {file
                  ? `Arquivo selecionado: ${file.name}`
                  : "Arraste e solte seu arquivo aqui ou clique para selecionar"}
              </p>
            </div>
          </label>
        </div>

        <div className={styles.actionsRow}>
          <ButtonComp text="Enviar arquivo" onClick={handleUpload} />
          <ButtonComp text="Cancelar" onClick={handleCancel} color="#999999" />
        </div>

        {loading && <LoadingComp />}

        {result && (
          <div className={styles.resultBox}>
            <h3>Resultado do processamento</h3>
            <p>📌 Total de registros: {result.total}</p>
            <p>✅ Cadastrados com sucesso: {result.sucesso}</p>
            <p>❌ Erros: {result.erros?.length || 0}</p>
            {result.erros?.length > 0 && (
              <details>
                <summary>Ver detalhes dos erros</summary>
                <ul>
                  {result.erros.map((err: any, idx: number) => (
                    <li key={idx}>Linha {err.linha}: RA {err.ra} - {err.erro}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
    </div>
  );
}
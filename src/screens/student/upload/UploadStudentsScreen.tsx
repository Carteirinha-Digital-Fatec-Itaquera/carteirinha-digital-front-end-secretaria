import { useState, useRef } from "react";
import { toast } from "react-toastify";

import styles from "./style.module.css";
import layoutStyles from '../../../styles/layoutWithMenu.module.css';
import { uploadStudentsFile } from "../../../api/secretary/uploadStudentsFile";
import { TitleComp } from "../../../components/title/TitleComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { CloudArrowUpIcon } from "@phosphor-icons/react";

export default function UploadStudentsScreen() {
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
      
        <div className={styles.caixaUpload}>
          <label htmlFor="fileUpload" className={styles.inputArquivoArea}>
            <input
              id="fileUpload"
              type="file"
              accept=".csv,.txt,.pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className={styles.fileInput}
            />
            <div className={styles.textoUpload}>
                <CloudArrowUpIcon size={100} color="#005C6D" />
              <h3>Importe seu arquivo</h3>
              <p>Arraste e solte seu arquivo aqui ou clique para selecionar</p>
            </div>
          </label>
          {file && (
            <div className={styles.containerArquivo}>
              <img src="/iconDoc.svg" alt="" />
              <p>{file.name}</p>
            </div>
          )}
          <div className={styles.containerBotao}>
          <button className={styles.btnEnviar} onClick={handleUpload}>Enviar arquivo</button>
          <button className={styles.btnCancelar} onClick={handleCancel} color="#999999" >Cancelar</button>
        </div>
          
        </div>

        {loading && <LoadingComp />}

        {result && (
          <div className={styles.containerResultado}>
            <h3>Resultado do processamento</h3>
            <p>Total de registros: {result.total}</p>
            <p>Cadastrados com sucesso:  <span className={styles.cadastrados}>{result.sucesso}</span></p>
            <p>Erros: <span className={styles.numErros}>{result.erros?.length || 0}</span></p>
            {result.erros?.length > 0 && (
              <details>
                <summary>Ver detalhes dos erros</summary>
                <ul className={styles.listaErros}>
                  {result.erros.map((err: any, idx: number) => (
                    <li className={styles.itemErro} key={idx}>Linha {err.linha}: RA {err.ra} - <span className={styles.erros}>{err.erro}</span>
                    </li>
                    
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
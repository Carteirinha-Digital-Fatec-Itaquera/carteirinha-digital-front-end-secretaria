import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

import { HeaderComp } from "../../components/header/HeaderComp";
import { TitleComp } from "../../components/title/TitleComp";
import { ButtonComp } from "../../components/button/ButtonComp";
import { LoadingComp } from "../../components/loading/LoadingComp";

import { uploadStudentsFile } from "../../api/secretary/uploadStudentsFile";

import styles from "./style.module.css";

export default function UploadStudentsScreen() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Selecione um arquivo CSV ou TXT");
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
    <div className={styles.container}>
      <HeaderComp />

      <div className={styles.card}>
        {/* Botão voltar */}
        <button className={styles.backButton} onClick={() => navigate("/students")}>
          <FaArrowLeft /> Voltar para lista de alunos
        </button>

        <TitleComp text="Importar alunos" />

        <p className={styles.info}>
          Envie um arquivo <strong>.csv</strong> ou <strong>.txt</strong> com os dados dos alunos.
          <br />
          Formato esperado (separado por vírgulas ou ponto e vírgula):
          <br />
          <code>
            ra;course;period;status;name;admission;email;cpf;rg;birthDate;dueDate;password
          </code>
        </p>

        <input type="file" accept=".csv,.txt" onChange={handleFileChange} className={styles.fileInput} />

        <ButtonComp text="Enviar arquivo" onClick={handleUpload} disabled={!file || loading} />

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
  );
}
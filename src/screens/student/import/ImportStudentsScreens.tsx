import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaFileUpload } from "react-icons/fa";

import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";

import { TitleComp } from "../../../components/title/TitleComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import { ErrorModalComp } from "../../../components/errormodal/ErrorModalComp";
import { AlertModalComp } from "../../../components/alertmodal/AlertModalComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";

import { createMany } from "../../../api/student/createMany";
import { Student } from "../../../domains/Student";
import { parseStudentFile } from "../../../utils/StudentFileParser";

import styles from "./style.module.css";

export default function ImportStudentsScreen() {
   const navigate = useNavigate();

   const [file, setFile] = useState<File | null>(null);
   const [students, setStudents] = useState<Student[]>([]);

   const [loading, setLoading] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");
   const [errorFields, setErrorFields] = useState<string[]>([]);
   const [showError, setShowError] = useState(false);

   const [confirmVisible, setConfirmVisible] = useState(false);

   async function handleFileChange(file: File | null) {
      if (!file) return;
      
      setLoading(true);

      try {
         const parsedStudents = await parseStudentFile(file);
         setStudents(parsedStudents);
      } catch {
         setErrorMessage("Erro ao processar o arquivo")
         setShowError(true)
      }
      setLoading(false);
   }

   async function handleImport() {
      setConfirmVisible(false);
      setLoading(true);

      const result = await createMany(students);

      if ("ok" in result) {
         navigate("/students");
      } else {
         setErrorMessage(result.message);
         setErrorFields(
            result.errorFields?.map(f => f.description) ?? []
         );
         setShowError(true);
      }
      setLoading(false);
   }

   return (
      <div className={styles.container}>
         <header className={styles.header}>
            <img src={logoFatec} className={styles.logoLeft} />
            <img src={logosGov} className={styles.logoRight} />
         </header>

         <TitleComp text="Importação de alunos" />

         <button
            className={styles.backButton}
            onClick={() => navigate("/students")}
         >
            <FaArrowLeft />
         </button>

         <div className={styles.form}>
            <label className={styles.fileInput}>
               <FaFileUpload size={22} />
               <span>{file?.name ?? "Selecionar arquivo CSV ou XLSX"}</span>
               <input
                  type="file"
                  accept=".csv,.xlsx"
                  hidden
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
               />
            </label>

            <p className={styles.helperText}>
               O arquivo deve conter: RA, Nome, Email, RG, CPF, Curso, Período,
               Situação, Ingresso, Data de Nascimento e Vencimento.
            </p>
         </div>

         {loading ? (
         <LoadingComp />
         ) : (
         <ButtonComp
            text="Importar alunos"
            onClick={() => setConfirmVisible(true)}
         />
         )}

         <AlertModalComp
            visible={confirmVisible}
            message={`Deseja importar ${students.length} alunos?`}
            onCancel={() => setConfirmVisible(false)}
            onConfirm={handleImport}
         />

         <ErrorModalComp
            visible={showError}
            error={errorMessage}
            fields={errorFields}
            onClose={() => setShowError(false)}
         />
    </div>
   )
}
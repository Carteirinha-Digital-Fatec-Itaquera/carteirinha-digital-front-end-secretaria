import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import logoFatec from "/fatec_ra_metropolitana_sp_capital_itaquera_cor.png";
import logosGov from "/logos_cps_governo_com_slogan_horizontal_cor.png";
import Swal from 'sweetalert2';
import { StudentApi } from "../../services/StudentApi";

function RegisterStudentScreen() {
  const navigate = useNavigate();

  const [estudante, setEstudante] = useState({
    ra: '',
    nome: '',
    email: '',
    cpf: '',
    rg: '',
    curso: '',
    periodo: '',
    situacao: '',
    dataNascimento: '',
    ingresso: '',
    foto: null,
    qrcode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'foto' && files && files[0]) {
      const imageFile = files[0];
      setEstudante({ ...estudante, [name]: imageFile });
      setPreviewImage(URL.createObjectURL(imageFile));
    } else {
      setEstudante({ ...estudante, [name]: value });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validações básicas
    if (!estudante.ra || !estudante.nome || !estudante.email) {
      Swal.fire({
        title: 'Campos obrigatórios!',
        text: 'Preencha RA, Nome e E-mail.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setLoading(true);
    
    try {
      const estudanteData = new FormData();
      
      Object.keys(estudante).forEach(key => {
        if (key === 'foto' && estudante[key]) {
          estudanteData.append('foto', estudante[key]);
        } else if (estudante[key] !== null && estudante[key] !== '') {
          estudanteData.append(key, estudante[key]);
        }
      });
      
      const novoEstudante = {
        ra: estudante.ra,
        nome: estudante.nome,
        email: estudante.email,
        cpf: estudante.cpf,
        rg: estudante.rg,
        curso: estudante.curso,
        periodo: estudante.periodo,
        situacao: estudante.situacao,
        dataNascimento: estudante.dataNascimento,
        ingresso: estudante.ingresso,
        qrcode: estudante.qrcode
      };
      
      await StudentApi.create(novoEstudante);
      
      Swal.fire({
        title: 'Estudante Registrado!',
        text: 'Estudante foi registrado com sucesso',
        icon: 'success',
        confirmButtonText: 'OK'
      }).then(() => {
        navigate('/students');
      });
      
      setEstudante({
        ra: '',
        nome: '',
        email: '',
        cpf: '',
        rg: '',
        curso: '',
        periodo: '',
        situacao: '',
        dataNascimento: '',
        ingresso: '',
        foto: null,
        qrcode: ''
      });
      setPreviewImage(null);
      
    } catch (error) {
      console.error("Erro ao registrar estudante:", error);
      Swal.fire({
        title: 'Erro!',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  function handleBack() {
    navigate("/students");
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <img src={logoFatec} alt="Logo Fatec" className={styles.logoLeft} />
        <h1 className={styles.title}>Registro de aluno</h1>
        <img src={logosGov} alt="Logos Governo" className={styles.logoRight} />
      </header>

      {/* BACK BUTTON */}
      <button className={styles.backButton} onClick={handleBack} type="button">
        ❮ Voltar
      </button>

      {/* FORM */}
      <form className={styles.form} onSubmit={handleRegister}>
        <div className={styles.formGroup}>
          <label htmlFor="ra">RA *</label>
          <input 
            type="text"
            id="ra"
            name="ra"
            value={estudante.ra}
            onChange={handleInputChange}
            placeholder="Ex: 2023000001"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="nome">Nome Completo *</label>
          <input 
            type="text"
            id="nome"
            name="nome"
            value={estudante.nome}
            onChange={handleInputChange}
            placeholder="Ex: Fulano da Silva"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">E-mail *</label>
          <input 
            type="email"
            id="email"
            name="email"
            value={estudante.email}
            onChange={handleInputChange}
            placeholder="Ex: fulano.silva@fatec.sp.gov.br"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cpf">CPF</label>
          <input 
            type="text"
            id="cpf"
            name="cpf"
            value={estudante.cpf}
            onChange={handleInputChange}
            placeholder="Ex: 000.000.000-00"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rg">RG</label>
          <input 
            type="text"
            id="rg"
            name="rg"
            value={estudante.rg}
            onChange={handleInputChange}
            placeholder="Ex: 00.000.000-0"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="curso">Curso</label>
          <select
            id="curso"
            name="curso"
            value={estudante.curso}
            onChange={handleInputChange}
          >
            <option value="">Selecione o curso</option>
            <option value="DSM">Desenvolvimento de Software Multiplataforma</option>
            <option value="AUI">Automação Industrial</option>
            <option value="FME">Fabricação Mecânica</option>
            <option value="MNI">Manutenção Industrial</option>
            <option value="MPS">Mecânica: Processos de Soldagem</option>
            <option value="RVA">Refrigeração, Ventilação e Ar Condicionado</option>
            {/* Adicione outros cursos */}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="periodo">Período</label>
          <select
            id="periodo"
            name="periodo"
            value={estudante.periodo}
            onChange={handleInputChange}
          >
            <option value="">Selecione</option>
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
            <option value="NOITE">Noite</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="situacao">Situação</label>
          <select
            id="situacao"
            name="situacao"
            value={estudante.situacao}
            onChange={handleInputChange}
          >
            <option value="">Selecione</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="TRANCADO">Trancado</option>
            <option value="FORMADO">Formado</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="dataNascimento">Data de Nascimento</label>
          <input 
            type="date"
            id="dataNascimento"
            name="dataNascimento"
            value={estudante.dataNascimento}
            onChange={handleInputChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="ingresso">Ingresso</label>
          <input 
            type="text"
            id="ingresso"
            name="ingresso"
            value={estudante.ingresso}
            onChange={handleInputChange}
            placeholder="Ex: 2025-1"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="foto">Foto</label>
          <input 
            type="file"
            id="foto"
            name="foto"
            accept="image/*"
            onChange={handleInputChange}
          />
          {previewImage && (
            <div className={styles.previewContainer}>
              <img 
                src={previewImage} 
                alt="Preview" 
                className={styles.previewImage}
              />
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="qrcode">QR Code (URL)</label>
          <input 
            type="text"
            id="qrcode"
            name="qrcode"
            value={estudante.qrcode}
            onChange={handleInputChange}
            placeholder="Ex: https://api.qrserver.com/v1/create-qr-code/?data=RA20230001"
          />
        </div>

        {/* REGISTER BUTTON */}
        <button 
          type="submit" 
          className={styles.registerButton}
          disabled={loading}
        >
          {loading ? 'Registrando...' : 'Registrar Aluno'}
        </button>
      </form>
    </div>
  );
}

export default RegisterStudentScreen;
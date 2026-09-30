import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginScreen from "./screens/login/LoginScreen";
import FirstAccessScreen from "./screens/access/FirstAccessScreen";
import RegisterStudentScreen from "./screens/student/register/RegisterStudentScreen";
import RedefinePasswordScreen from "./screens/recoverypassword/redefine/RedefinePasswordScreen";
import SecurityCodeScreen from "./screens/recoverypassword/code/SecurityCodeScreen";
import NewPasswordScreen from "./screens/recoverypassword/password/NewPasswordScreen";
import UpdateStudentScreen from "./screens/student/update/UpdateStudentScreen";
import ListStudentScreen from "./screens/student/list/ListStudentScreen";
import UploadStudentsScreen from "./screens/student/upload/UploadStudentsScreen";
import ProfileScreen from "./screens/secretary/profile/ProfileScreen";
import ResetPasswordScreen from "./screens/recoverypassword/reset/ResetPasswordScreen";
import PhotosScreen from "./screens/secretary/photos/PhotosScreen";
import ChangePasswordScreen from "./screens/changepassword/ChangePasswordScreen";

import RequireSecretarySession from "./components/auth/RequireSecretarySession";
import EventsRouteScaffold from "./screens/events/EventsRouteScaffold";
import CertificadoVerificarScreen from "./screens/certificate/CertificadoVerificarScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/access" element={<FirstAccessScreen />} />
        <Route path="/redefine" element={<RedefinePasswordScreen />} />
        <Route path="/code/:email" element={<SecurityCodeScreen />} />
        <Route path="/password/:email/:code" element={<NewPasswordScreen />} />
        <Route path="/students" element={<ListStudentScreen />} />
        <Route path="/register" element={<RegisterStudentScreen />} />
        <Route path="/update/:ra" element={<UpdateStudentScreen />} />
        <Route path="/upload-alunos" element={<UploadStudentsScreen />} />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/fotos" element={<PhotosScreen />} />
        <Route path="/redefinir-senha" element={<ChangePasswordScreen />} />

        {/* Alias de criacao de evento */}
        <Route path="/criar-evento" element={<Navigate to="/eventos/novo" replace />} />

        {/* Rotas administrativas de eventos */}
        <Route element={<RequireSecretarySession />}>
          <Route path="/eventos" element={<EventsRouteScaffold />} />
          <Route path="/eventos/novo" element={<EventsRouteScaffold />} />
          <Route path="/eventos/:id/gerenciar" element={<EventsRouteScaffold />} />
        </Route>

        {/* Rota publica de verificacao de certificado */}
        <Route path="/certificados/verificar" element={<CertificadoVerificarScreen />} />
        <Route path="/certificados/verificar/:code" element={<CertificadoVerificarScreen />} />
        <Route path="/certificado/verificar/:codigo" element={<CertificadoVerificarScreen />} />
      </Routes>
    </BrowserRouter>
  );
}


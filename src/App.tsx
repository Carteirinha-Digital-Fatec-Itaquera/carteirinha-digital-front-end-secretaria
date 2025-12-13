import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginScreen from "./screens/login/LoginScreen";
import FirstAccessScreen from "./screens/access/FirstAccessScreen";
import RegisterStudentScreen from "./screens/student/register/RegisterStudentScreen";
import RedefinePasswordScreen from "./screens/redefine/RedefinePasswordScreen";
import SecurityCodeScreen from "./screens/code/SecurityCodeScreen";
import NewPasswordScreen from "./screens/password/NewPasswordScreen";
import StudentsListScreen from "./screens/student/list/ListStudentScreen";
import UpdateStudentScreen from "./screens/student/update/UpdateStudentScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<LoginScreen />} />

        <Route path="/login" element={<LoginScreen />} />
        <Route path="/access" element={<FirstAccessScreen />} />
        <Route path="/redefine" element={<RedefinePasswordScreen />} />
        <Route path="/code" element={<SecurityCodeScreen />} />
        <Route path="/password" element={<NewPasswordScreen />} />

        <Route path="/students" element={<StudentsListScreen />} />
        <Route path="/register" element={<RegisterStudentScreen />} />
        <Route path="/update/:id" element={<UpdateStudentScreen />} />
        
      </Routes>
    </BrowserRouter>
  );
}


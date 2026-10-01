export const GLOBAL_VAR = {
  BASE_URL: import.meta.env.VITE_BASE_URL ?? 'http://localhost:3000',
  STUDENT_APP_URL:
    import.meta.env.VITE_STUDENT_APP_URL ??
    'https://carteirinha-digital-front-end-aluno.vercel.app',
};

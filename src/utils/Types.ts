export type Token = {
  token: string,
}

export type ApiError = {
  code: string,
  status: string,
  message: string,
  timestamp: string,
  path: string,
  errorFields: ErrorField[] | null,
}

export type ErrorField = {
  name: string,
  description: string,
  value: string,
}

export type StudentImport = {
  ra: string;
  name: string;
  email: string;
  rg: string;
  cpf: string;
  course: string;
  period: string;
  status: string;
  admission: string;
  birthDate: string;
  dueDate: string;
};

export type Ok = { ok: string }
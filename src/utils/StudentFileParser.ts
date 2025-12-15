import Papa from 'papaparse';
import * as XLSX from "xlsx";
import { Student } from "../domains/Student";

function normalizeHeader(value: string): string {
   return value
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
}

function normalizeDate(value?: string): string {
   if (!value) return "";

   if (!isNaN(Number(value))) {
      const date = XLSX.SSF.parse_date_code(Number(value));
      if (!date) return "";
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
         date.d
      ).padStart(2, "0")}`;
   }

   if (value.includes("/")) {
      const [d, m, y] = value.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
   }

   return value;
}

function mapRowToStudent(row: Record<string, any>): Student {
  const normalizedRow: Record<string, any> = {};

  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });

  return new Student({
    ra: normalizedRow.ra,
    name: normalizedRow.nome,
    email: normalizedRow.email,
    rg: normalizedRow.rg,
    cpf: normalizedRow.cpf,
    course: normalizedRow.curso,
    period: normalizedRow.periodo,
    status: normalizedRow.situacao,
    admission: normalizedRow.ingresso,
    birthDate: normalizeDate(normalizedRow.datadenascimento),
    dueDate: normalizeDate(normalizedRow.vencimento),
  });
}

function isEmptyRow(row: Record<string, any>): boolean {
  return Object.values(row).every(
    (value) => !value || value.toString().trim() === ""
  );
}

export function parseStudentFile(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const students = result.data
            .filter((row) => !isEmptyRow(row))
            .map((row) => mapRowToStudent(row));

          resolve(students);
        },
        error: reject,
      });
    }

    else if (extension === "xlsx") {
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const students = rows
          .filter((row) => !isEmptyRow(row))
          .map((row) => mapRowToStudent(row));

        resolve(students);
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }

    else {
      reject(new Error("Formato de arquivo não suportado"));
    }
  });
}
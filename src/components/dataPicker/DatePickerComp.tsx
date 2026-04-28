import React from "react";
import { FaCalendar, FaCalendarCheck } from "react-icons/fa";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import styles from "./style.module.css";

// --- FUNÇÕES DE CONVERSÃO DE DATA ---
const dateStringToDateObject = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const dateObjectToDateString = (date: Date | null): string => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// --- INTERFACE DE PROPRIEDADES ---
interface DatePickerProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// --- COMPONENTE DE DATA COM CALENDÁRIO ---
export const DatePickerComp = ({ label, value, onChange, isOpen, onToggle }: DatePickerProps) => {
  const maskDate = (v: string) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").substring(0, 10);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskDate(e.target.value);
    onChange(maskedValue);
  };

  const handleCalendarChange = (date: Date) => {
    onChange(dateObjectToDateString(date));
    onToggle();
  };

  return (
    <div className={styles.datePickerContainer}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputContainer}>
        <span className={styles.icon}><button
          type="button"
          className={styles.calendarButton}
          onClick={(e) => {
            e.preventDefault();
            onToggle();
          }}
        >
          <FaCalendar />
        </button></span>
        <input
          type="text"
          className={styles.dateInput}
          value={value}
          onChange={handleInputChange}
          placeholder="DD/MM/AAAA"
        />
        
      </div>
      {isOpen && (
        <div className={styles.calendarWrapper} onClick={(e) => e.stopPropagation()}>
          <Calendar
            onChange={handleCalendarChange as any}
            value={dateStringToDateObject(value)}
            locale="pt-BR"
          />
        </div>
      )}
    </div>
  );
};

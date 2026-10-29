import { useId } from 'react';
import styles from './style.module.css';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  name?: string;
};

/** Controlled setting: the caller decides when a confirmed change takes effect. */
export default function SettingSwitch({ label, checked, onChange, description, disabled, name }: Props) {
  const id = useId();
  return <label className={styles.setting} htmlFor={id}>
    <span className={styles.control}>
      <input id={id} className={styles.input} type="checkbox" role="switch" name={name} checked={checked} disabled={disabled} aria-label={label} aria-describedby={description ? `${id}-description` : undefined} onChange={event => onChange(event.target.checked)} />
      <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
    </span>
    <span className={styles.copy}>
      <span className={styles.title}>{label}</span>
      {description && <span id={`${id}-description`} className={styles.description}>{description}</span>}
      <span className={styles.state} aria-hidden="true">{checked ? 'Ligado' : 'Desligado'}</span>
    </span>
  </label>;
}

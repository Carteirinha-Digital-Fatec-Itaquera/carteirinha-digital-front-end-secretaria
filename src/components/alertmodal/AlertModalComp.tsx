import MessageModal from '../messageModal/MessageModal';

type AlertModalProps = {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  textConfirm?: string;
  textCancel?: string;
};

export const AlertModalComp = ({
  visible,
  message,
  onConfirm,
  onCancel,
  textConfirm = 'Confirmar',
  textCancel = 'Cancelar',
}: AlertModalProps) => (
  <MessageModal
    visible={visible}
    tone="warning"
    title="Confirmar ação"
    message={message}
    confirmText={textConfirm}
    cancelText={textCancel}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

import MessageModal from '../messageModal/MessageModal';

type ErrorModalProps = {
  visible: boolean;
  error: string;
  fields?: string[];
  onClose: () => void;
};

export const ErrorModalComp = ({
  visible,
  error,
  fields = [],
  onClose,
}: ErrorModalProps) => (
  <MessageModal
    visible={visible}
    tone="error"
    title="Não foi possível concluir"
    message={error}
    details={fields}
    confirmText="Fechar"
    onConfirm={onClose}
    onDismiss={onClose}
  />
);

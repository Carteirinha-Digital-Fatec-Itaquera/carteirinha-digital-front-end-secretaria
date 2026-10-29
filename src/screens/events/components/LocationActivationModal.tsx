import MessageModal from '../../../components/messageModal/MessageModal';
export default function LocationActivationModal({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <MessageModal visible={visible} tone="warning" title="Ativar verificação por geolocalização?"
    message="Alunos e visitantes precisarão permitir o GPS e estar dentro da área configurada para confirmar presença. Localização negada, imprecisa ou fora da área poderá impedir o registro. Confira a configuração antes de ativar."
    confirmText="Sim, ativar geolocalização" cancelText="Manter desligada" onConfirm={onConfirm} onCancel={onCancel} onDismiss={onCancel} />;
}

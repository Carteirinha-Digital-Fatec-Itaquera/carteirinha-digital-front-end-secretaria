import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ManualCertificatePanel } from './ManualCertificatePanel';
import * as api from '../../../api/event/publicEventService';
import type { EventView } from '../../../domains/Event';

const event: EventView = { id: 'event-id', title: 'Atividade', description: null, speaker: 'Docente', location: 'Sala', startsAt: '2026-10-26T10:00:00Z', endsAt: '2026-10-26T11:00:00Z', workloadMinutes: 60, status: 'COMPLETED', cancelReason: null, cancelledAt: null, cancelledById: null, certificateEnabled: true, checkpoints: [], createdAt: '', updatedAt: '' };
const response = { certificateId: 'certificate-id', verificationCode: 'FATEC-EVT-TEST', recipientName: 'Pessoa teste', email: 'person@example.test', alreadyIssued: false, deliveryState: 'PENDING', artifactState: 'PENDING_RENDER', message: 'Certificado e envio por e-mail enfileirados.' };
const openForm = () => fireEvent.click(screen.getByRole('button', { name: 'Emitir e enviar certificado' }));
const confirm = () => {
  fireEvent.change(screen.getByLabelText('Justificativa da regularização'), { target: { value: 'Participação conferida após falha de rede.' } });
  fireEvent.click(screen.getByLabelText(/Confirmo que esta pessoa participou/));
};
beforeEach(() => vi.restoreAllMocks());
describe('ManualCertificatePanel', () => {
  it('keeps the action inside event management and blocks unavailable events', () => {
    render(<ManualCertificatePanel event={{ ...event, status: 'CANCELLED' }} onUpdated={vi.fn()} />);
    openForm();
    expect(screen.getByRole('alert')).toHaveTextContent('não cancelados');
    expect(screen.queryByRole('button', { name: /Confirmar participação e enfileirar envio/ })).not.toBeInTheDocument();
  });
  it('submits RA with reason and attestation, displays queued rather than delivered', async () => {
    const request = vi.spyOn(api, 'management').mockResolvedValue(response);
    const updated=vi.fn(); render(<ManualCertificatePanel event={event} onUpdated={updated} />); openForm();
    fireEvent.change(screen.getByLabelText('RA'), { target: { value: '12345' } }); confirm();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar participação e enfileirar envio/ }));
    await screen.findByText(response.message);
    expect(request).toHaveBeenCalledWith('events/event-id/manual-certificates', { identityType: 'STUDENT', ra: '12345', reason: 'Participação conferida após falha de rede.', participationConfirmed: true });
    expect(screen.getByRole('status')).toHaveTextContent('Envio na fila');
    expect(updated).toHaveBeenCalledTimes(1);
  });
  it('submits contact and CPF without creating an application account', async () => {
    const request = vi.spyOn(api, 'management').mockResolvedValue(response);
    render(<ManualCertificatePanel event={event} onUpdated={vi.fn()} />); openForm();
    fireEvent.change(screen.getByLabelText('Tipo de identificação'), { target: { value: 'EXTERNAL' } });
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Pessoa teste' } });
    fireEvent.change(screen.getByLabelText('E-mail para envio'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } }); confirm();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar participação e enfileirar envio/ }));
    await screen.findByText(response.message);
    expect(request).toHaveBeenCalledWith('events/event-id/manual-certificates', expect.objectContaining({ identityType: 'EXTERNAL', name: 'Pessoa teste', email: 'person@example.test', cpf: '52998224725' }));
  });
  it('retains form data after failure and prevents duplicate concurrent submissions', async () => {
    let reject!: (error: Error) => void;
    const request = vi.spyOn(api, 'management').mockImplementation(() => new Promise((_, fail) => { reject=fail; }));
    render(<ManualCertificatePanel event={event} onUpdated={vi.fn()} />); openForm();
    fireEvent.change(screen.getByLabelText('RA'), { target: { value: '12345' } }); confirm();
    const submit = screen.getByRole('button', { name: /Confirmar participação e enfileirar envio/ });
    fireEvent.click(submit); fireEvent.click(submit);
    expect(request).toHaveBeenCalledTimes(1);
    reject(new Error('Falha de conexão'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de conexão');
    expect(screen.getByLabelText('RA')).toHaveValue('12345');
  });
  it('refreshes delivery status and offers existing PDF download after processing', async () => {
    const request = vi.spyOn(api, 'management').mockResolvedValueOnce(response).mockResolvedValueOnce([{ certificate: { id: 'certificate-id', artifact: { state: 'READY', deliveryState: 'SENT' } } }]);
    render(<ManualCertificatePanel event={event} onUpdated={vi.fn()} />); openForm();
    fireEvent.change(screen.getByLabelText('RA'), { target: { value: '12345' } }); confirm();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar participação e enfileirar envio/ }));
    await screen.findByText(response.message);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar situação' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('E-mail aceito pelo provedor'));
    expect(screen.getByRole('button', { name: 'Baixar certificado' })).toBeEnabled();
    expect(request).toHaveBeenLastCalledWith('events/event-id/participants');
  });
});

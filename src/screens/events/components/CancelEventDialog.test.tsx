import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CancelEventDialog } from './CancelEventDialog';

describe('CancelEventDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <CancelEventDialog
        isOpen={false}
        eventTitle="Palestra de IA"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with event title and warning message when isOpen is true', () => {
    render(
      <CancelEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Cancelar Evento')).toBeDefined();
    expect(screen.getByText('Palestra de IA')).toBeDefined();
    expect(
      screen.getByText(/quaisquer certificados já emitidos para os participantes serão/i)
    ).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button when reason has at least 3 characters and calls onConfirm', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <CancelEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      />
    );

    const textarea = screen.getByPlaceholderText(/Informe o motivo formal do cancelamento/i);
    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });

    expect(confirmBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Motivo de força maior' } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirmMock).toHaveBeenCalledWith('Motivo de força maior');
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message when onConfirm rejects', async () => {
    const onConfirmMock = vi.fn().mockRejectedValue(new Error('Falha no servidor ao revogar certificados'));
    const onCloseMock = vi.fn();

    render(
      <CancelEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      />
    );

    const textarea = screen.getByPlaceholderText(/Informe o motivo formal do cancelamento/i);
    fireEvent.change(textarea, { target: { value: 'Cancelamento por chuva forte' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Falha no servidor ao revogar certificados')).toBeDefined();
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  it('calls onClose when Escape key is pressed', () => {
    const onCloseMock = vi.fn();

    render(
      <CancelEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={onCloseMock}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking close button or "Manter Evento"', () => {
    const onCloseMock = vi.fn();

    render(
      <CancelEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={onCloseMock}
        onConfirm={vi.fn()}
      />
    );

    const keepBtn = screen.getByRole('button', { name: 'Manter Evento' });
    fireEvent.click(keepBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByLabelText('Fechar modal');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});

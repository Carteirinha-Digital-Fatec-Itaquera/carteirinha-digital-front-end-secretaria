import { useCallback, useEffect, useRef, useState } from 'react';

export function useCreditMessages() {
  const [messageDialog, setMessageDialog] = useState<{ message: string; confirmation: boolean } | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  const closeMessage = useCallback((answer = false) => {
    resolver.current?.(answer);
    resolver.current = null;
    setMessageDialog(null);
  }, []);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);
  const notify = useCallback((message: string) => { setMessageDialog({ message, confirmation: false }); }, []);
  const confirm = useCallback((message: string) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setMessageDialog({ message, confirmation: true });
  }), []);
  return { messageDialog, closeMessage, notify, confirm };
}

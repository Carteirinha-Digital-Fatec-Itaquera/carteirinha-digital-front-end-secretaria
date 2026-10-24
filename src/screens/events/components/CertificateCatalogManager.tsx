import { useEffect, useRef, useState } from 'react';
import { management, uploadAsset, type Template, type Signer } from '../../../api/event/publicEventService';
import styles from './styleCertificateCatalog.module.css';

type Items = { templates: Template[]; signers: Signer[] };
type Editor = { kind: 'templates'; item?: Template } | { kind: 'signers'; item?: Signer };
export function CertificateCatalogManager({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [items, setItems] = useState<Items>({ templates: [], signers: [] });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  async function reload() { setItems(await management<Items>('catalog/manage')); }
  useEffect(() => {
    const controller = new AbortController();
    management<Items>('catalog/manage', undefined, 'GET', controller.signal).then(setItems).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível carregar os cadastros.');
    });
    return () => controller.abort();
  }, []);
  function open(value: Editor) { setEditor(value); setDeleting(null); setError(''); setNotice(''); uploaded.current = null; }
  function close() { setEditor(null); setDeleting(null); heading.current?.focus(); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      const file = data.get('file');
      let assetId = editor.kind === 'signers' ? editor.item?.assetId : editor.item?.config.backgroundAssetId;
      if (file instanceof File && file.size) {
        if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Envie PNG ou JPEG de até 2 MB.');
        if (uploaded.current?.file === file) assetId = uploaded.current.id;
        else {
          const asset = await uploadAsset(file, editor.kind === 'signers' ? 'SIGNATURE' : 'BACKGROUND');
          uploaded.current = { file, id: asset.id }; assetId = asset.id;
        }
      }
      const name = String(data.get('name') || '').trim();
      let body: Record<string, unknown>;
      if (editor.kind === 'signers') {
        if (!assetId) throw new Error('Selecione a imagem da assinatura.');
        body = { name, title: String(data.get('title') || '').trim(), course: String(data.get('course') || '').trim(), assetId, authorized: data.get('authorized') === 'on' };
      } else {
        body = { ...editor.item?.config, textColor: String(data.get('textColor') || '#FFFFFF'), name, role: editor.item?.role || data.get('role'), heading: String(data.get('heading') || '').trim(), edition: String(data.get('edition') || '').trim(), backgroundAssetId: assetId, design: editor.item?.config.design || 'TECHNOLOGY_BLUE_2026_DARK', autoPublish: true };
      }
      if (editor.item) body.expectedVersion = editor.item.version ?? 1;
      await management(`${editor.kind}${editor.item ? `/${editor.item.id}` : ''}`, body, editor.item ? 'PATCH' : 'POST');
      close(); setNotice('Cadastro salvo. Os certificados já emitidos mantêm seus dados anteriores.'); await reload(); await onChanged?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting?.item || busy) return;
    setBusy(true); setError('');
    try {
      await management(`${deleting.kind}/${deleting.item.id}`, { expectedVersion: deleting.item.version ?? 1 }, 'DELETE');
      close(); setNotice('Cadastro excluído das novas seleções. O histórico foi preservado.'); await reload(); await onChanged?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir.'); }
    finally { setBusy(false); }
  }
  const visible = { templates: items.templates.filter(item => history || (item.status !== 'ARCHIVED' && item.config.design === 'TECHNOLOGY_BLUE_2026_DARK')), signers: items.signers.filter(item => history || !item.archived) };
  const signer = editor?.kind === 'signers' ? editor.item : undefined;
  const template = editor?.kind === 'templates' ? editor.item : undefined;
  return <section className={styles.panel}>
    <h2 ref={heading} tabIndex={-1}>Modelos de certificado e assinaturas</h2>
    <p>Cadastre, corrija ou exclua itens do catálogo. Certificados emitidos e seus arquivos são preservados.</p>
    {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={() => { void reload().then(() => setError('')).catch(() => setError('Não foi possível atualizar.')); }}>Atualizar lista</button></p>}
    {notice && <p role="status">{notice}</p>}
    <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={() => open({ kind: 'templates' })}>Novo modelo</button>
      <button type="button" disabled={busy} onClick={() => open({ kind: 'signers' })}>Nova assinatura</button>
      <label><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)} /> Mostrar excluídos e versões anteriores</label>
    </div>
    {editor && <form key={`${editor.kind}-${editor.item?.id || 'new'}`} onSubmit={event => { void save(event); }} className={styles.editor}>
      <fieldset disabled={busy}><h3>{editor.item ? 'Editar' : 'Cadastrar'} {editor.kind === 'templates' ? 'modelo de certificado' : 'assinatura'}</h3>
      <label>Nome<input autoFocus name="name" required minLength={3} maxLength={editor.kind === 'signers' ? 160 : 120} defaultValue={editor.item?.name} /></label>
      {editor.kind === 'templates' ? <>
        <label>Papel<select name="role" defaultValue={template?.role || 'ATTENDEE'} disabled={!!template}><option value="ATTENDEE">Participante</option><option value="SPEAKER">Palestrante</option></select></label>
        <label>Cor do texto do certificado<input name="textColor" type="color" defaultValue={template?.config.textColor || '#FFFFFF'} /></label>
        <label>Título do certificado<input name="heading" required minLength={3} maxLength={160} defaultValue={template?.config.heading || 'CERTIFICADO'} /></label>
        <label>Edição ou identificação do evento<input name="edition" required minLength={3} maxLength={200} defaultValue={template?.config.edition || 'XIII Semana de Tecnologia da Fatec Itaquera'} /></label>
      </> : <>
        <label>Cargo<input name="title" required minLength={3} maxLength={160} defaultValue={signer?.title} /></label>
        <label>Curso (opcional)<input name="course" maxLength={120} defaultValue={signer?.course} /></label>
        <label><input type="checkbox" name="authorized" required /> Confirmo a autorização de uso desta assinatura</label>
      </>}
      <label>{editor.kind === 'signers' ? 'Imagem da assinatura' : 'Arte de fundo (opcional)'}<input type="file" name="file" accept="image/png,image/jpeg" required={editor.kind === 'signers' && !signer?.assetId} /></label>
      <p>PNG ou JPEG até 2 MB. Ao editar, deixe vazio para manter a imagem atual. Para assinatura, prefira PNG transparente.</p>
      <div className={styles.actions}><button disabled={busy} type="submit">{busy ? 'Salvando...' : 'Salvar cadastro'}</button><button disabled={busy} type="button" onClick={close}>Cancelar edição</button></div>
    </fieldset></form>}
    {deleting && <div role="alertdialog" aria-modal="false" aria-labelledby="catalog-delete-title" className={styles.editor}>
      <h3 id="catalog-delete-title">Excluir {deleting.item?.name}?</h3><p>O item deixa de aparecer nas novas seleções. Vínculos históricos e certificados emitidos serão mantidos.</p>
      <div className={styles.actions}><button autoFocus disabled={busy} type="button" onClick={close}>Cancelar exclusão</button><button disabled={busy} type="button" onClick={() => { void remove(); }}>Confirmar exclusão</button></div>
    </div>}
    {(['templates', 'signers'] as const).map(kind => <div key={kind}><h3>{kind === 'templates' ? 'Modelos de certificado' : 'Assinaturas'}</h3>
      <ul className={styles.list}>{visible[kind].map(item => {
        const archived = kind === 'templates' ? (item as Template).status === 'ARCHIVED' : (item as Signer).archived;
        return <li key={item.id}><div><strong>{item.name}</strong><p>{kind === 'templates' ? ((item as Template).role === 'SPEAKER' ? 'Palestrante' : 'Participante') : (item as Signer).title} · versão {item.version ?? 1}{archived ? ' · Excluído' : ''}</p></div>
          {!archived && <div className={styles.actions}><button type="button" disabled={busy} aria-label={`Editar ${item.name}`} onClick={() => open(kind === 'templates' ? { kind, item: item as Template } : { kind, item: item as Signer })}>Editar</button><button type="button" disabled={busy} aria-label={`Excluir ${item.name}`} onClick={() => { setEditor(null); setError(''); setDeleting(kind === 'templates' ? { kind, item: item as Template } : { kind, item: item as Signer }); }}>Excluir</button></div>}
        </li>;
      })}</ul>
      {visible[kind].length === 0 && <p>Nenhum cadastro disponível.</p>}
    </div>)}
  </section>;
}

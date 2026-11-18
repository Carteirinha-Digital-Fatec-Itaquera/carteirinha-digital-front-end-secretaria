# Cadastro manual de funcionários

A área **Funcionários** da Secretaria lista e pesquisa registros por nome, e-mail ou matrícula funcional. Em **Registrar funcionário**, informe os dados cadastrais e adicione uma ou mais funções. Após salvar, abra **Enviar convite** no detalhe e confirme o destinatário. O estado “envio aceito” indica aceitação pelo provedor, sem confirmar chegada à caixa de entrada. Depois que o titular definir senha, **Atualizar situação** mostra o acesso ativado.

## Evolução do cadastro e do acesso

Informe matrícula funcional no cadastro manual. No detalhe, use **Editar funcionário** e registre um motivo. Cada função é salva separadamente. Em conflito, compare a versão atual sem perder o formulário. **Excluir funcionário** arquiva e revoga o acesso. Para restaurar, marque **Mostrar arquivados** e confirme com um motivo.

Quando a API informa o método de primeiro acesso, a tela apresenta o estado de ativação e mantém o convite apenas para o contrato anterior. O titular usa e-mail e matrícula no portal e confirma pelo link enviado. Cadastros legados sem matrícula continuam com confirmação por e-mail.

## Integração

| Operação | Contrato |
| --- | --- |
| Consultar | GET /funcionarios com q, limit e cursor |
| Registrar | POST /funcionarios com requestId UUID e funções |
| Abrir cadastro | GET /funcionarios/:id |
| Consultar ativação e entrega | GET /funcionarios/:id/acesso |
| Enviar convite manual | POST /funcionarios/:id/convite com requestId e expectedVersion |

Todas as chamadas passam pelo cliente e pela sessão da Secretaria. A interface restringe o acesso ao papel secretary e o backend valida a autorização. O cadastro conserva o UUID durante novas tentativas com o mesmo conteúdo. Para 409 de convite, a página recarrega dados e versão antes de aceitar outra ação.

### Limite da API de convite

O backend atual usa requestId na auditoria de convite, mas não reserva uma chave de idempotência antes de emitir o token e de chamar o provedor. Uma falha entre o envio e a resposta deixa o resultado incerto. A interface evita envios paralelos, recarrega o estado e exige nova confirmação. Ela não repete o POST automaticamente.

Para garantir um único convite por operação, deduplicar no backend por funcionário, tipo de operação e requestId antes dos efeitos externos, gravar e reapresentar o resultado da primeira tentativa e confirmar a versão. Testar chamadas simultâneas, resposta perdida após envio, reutilização com conteúdo diferente e falha do provedor. A segurança e consistência do e-mail real também dependem da configuração do serviço e da origem do portal.

## Validar no VS Code

1. Abra os dois frontends em janelas separadas e use Node.js 24. Rode npm ci em ambos.
2. Na Secretaria, crie .env.local com VITE_BASE_URL=http://localhost:3000. No portal de Funcionários, use VITE_API_BASE_URL=http://localhost:3000.
3. Rode npm run dev -- --port 5173 na Secretaria e npm run dev -- --port 5174 no portal. Em backend local ou homologação, autorize ambas as origens e defina EMPLOYEE_APP_URL=http://localhost:5174 para os links de ativação. Use somente banco, conta de Secretaria e caixa de e-mail de teste.
4. Na Secretaria, crie um cadastro sintético. Teste primeiro o envio explícito de convite ou alterne para um novo cadastro e solicite primeiro acesso pelo Portal de Funcionários. Abra o link de teste, defina e confirme a senha, entre no portal e use **Conferir meus dados**. Consulte a situação de acesso na Secretaria.
5. Na Secretaria, rode npm run lint, npm run build e npm test. Para testes simulados do portal, faça build com VITE_API_BASE_URL=http://localhost:3099, instale Chromium com npx playwright install chromium e rode npm run test:browser. O teste intercepta chamadas e não entrega e-mails.

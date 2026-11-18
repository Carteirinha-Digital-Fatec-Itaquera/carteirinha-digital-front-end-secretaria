# Cadastro manual de funcionários

A área **Funcionários** da Secretaria lista e pesquisa registros por nome, e-mail ou matrícula funcional. Em **Registrar funcionário**, informe os dados cadastrais e adicione uma ou mais funções. Depois de salvar, confira **Primeiro acesso** no detalhe. Quando o titular definir a senha, **Atualizar situação** mostra o acesso ativado.

## Evolução do cadastro e do acesso

Informe matrícula funcional no cadastro manual. No detalhe, use **Editar funcionário** e registre um motivo. Cada função é salva separadamente. Em conflito, compare a versão atual sem perder o formulário. **Excluir funcionário** arquiva e revoga o acesso. Para restaurar, marque **Mostrar arquivados** e confirme com um motivo.

O funcionário usa o e-mail cadastrado e a matrícula no campo **Senha** do login do portal. Em seguida, cria a senha pessoal. Complete a matrícula de cadastros antigos usando **Editar funcionário**.

## Integração

| Operação | Contrato |
| --- | --- |
| Consultar | GET /funcionarios com q, limit e cursor |
| Registrar | POST /funcionarios com requestId UUID e funções |
| Abrir cadastro | GET /funcionarios/:id |
| Consultar situação do acesso | GET /funcionarios/:id/acesso |

Todas as chamadas passam pelo cliente e pela sessão da Secretaria. A interface restringe o acesso ao papel secretary e o backend valida a autorização. O cadastro conserva o UUID durante novas tentativas com o mesmo conteúdo.

## Validar no VS Code

1. Abra os dois frontends em janelas separadas e use Node.js 24. Rode npm ci em ambos.
2. Na Secretaria, crie .env.local com VITE_BASE_URL=http://localhost:3000. No portal de Funcionários, use VITE_API_BASE_URL=http://localhost:3000.
3. Rode npm run dev -- --port 5173 na Secretaria e npm run dev -- --port 5174 no portal. Em backend local ou homologação, autorize ambas as origens e defina EMPLOYEE_APP_URL=http://localhost:5174 para os links de recuperação. Use somente banco, conta de Secretaria e caixa de e-mail de teste.
4. Na Secretaria, crie um cadastro sintético com matrícula e e-mail de teste. No Portal de Funcionários, preencha **E-mail** e use a matrícula em **Senha**. Crie e confirme a senha pessoal. Entre novamente com a nova senha e use **Conferir meus dados**. Consulte a situação de acesso na Secretaria.
5. Na Secretaria, rode npm run lint, npm run build e npm test. Para testes simulados do portal, faça build com VITE_API_BASE_URL=http://localhost:3099, instale Chromium com npx playwright install chromium e rode npm run test:browser. O teste intercepta chamadas e não entrega e-mails.

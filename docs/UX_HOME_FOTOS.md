# UX da Home, carteirinha e avaliação de fotografias

Entrega para validação em PRs Draft. Não realizar merge ou deploy de produção sem nova autorização.

## Diagnóstico e solução do Portal

A proteção de sessão consultava GET /funcionarios/me e a Home criava uma segunda consulta para o mesmo perfil, além de GET /funcionarios/me/foto. Cada tela mantinha estado local. O retorno de rota recriava requisições e URLs de blobs. useResource também escondia o conteúdo ao mudar a versão de recarga ou ao receber erro. Não existia cache compartilhado nem deduplicação entre guard e telas. Isso explica o nome genérico, a perda momentânea do aviso e a foto reaparecendo, mesmo com uma API rápida. Não foi medido o tempo do backend de produção e não se atribui a ele uma conclusão sem evidência.

O novo resourceCache usa memória da sessão corrente e useSyncExternalStore, sem bibliotecas adicionais. Perfil e situação de foto são reutilizados por 15 segundos. Consultas simultâneas são deduplicadas. Foco da janela, retorno de visibilidade e verificação a cada 30 segundos nas telas montadas revalidam em segundo plano. Erros de conexão mantêm a última resposta com aviso. Carteirinha, verificação pública e suporte não reutilizam dados após desmontar a rota, exigindo nova leitura ao reabrir. O QR continua subordinado à resposta de elegibilidade do backend e fica indisponível quando há erro de consulta.

Upload e remoção invalidam perfil, situação e carteirinha. Uma resposta de foto atual remove e revoga blobs privados que deixaram de pertencer à foto aprovada ou pendente. O logout, uma troca de token ou o tratamento existente de 401/conta bloqueada cancelam consultas, limpam os dados e fechamentos em memória e revogam URLs. Respostas de épocas anteriores não podem repor dados ou fotos. Não há persistência adicional de imagens, dados pessoais ou tokens. O service worker permanece sem cache de respostas privadas.

A Home usa latestAttempt do contrato atual para apresentar Fotografia rejeitada e o motivo real disponível. Uma pendência mais recente tem precedência sobre rejeições antigas. A mensagem sobre a fotografia aprovada anterior depende da existência dessa fotografia. O botão X fecha somente o aviso em memória, por photoId e reviewedAt, durante a sessão. Outra ocorrência reaparece. O fechamento anterior de aprovação continua usando seu identificador de fotografia, conforme a implementação aprovada.

A frente da carteirinha mantém o cabeçalho e as cores, distribui os campos de forma compacta e apresenta NOME:, UNIDADE: e FUNÇÃO: em maiúsculas somente na UI. As funções são listadas separadamente, com quebra natural para textos longos. A fotografia usa object-fit: contain e proporção 3:4. Os controles Frente/Verso formam um grupo com estado aria-pressed, foco visível e acionamento por teclado. Conteúdo do verso e contrato de QR preservados.

## Secretaria

A grade usa a mesma lógica de colunas das solicitações de alunos (auto-fill, mínimo de 240 px), evitando que um único card ocupe toda a largura. A prévia e a ampliação continuam usando PendingPhotoPreview, com imagem privada obtida por autenticação. O componente de alunos e seus estilos não foram alterados.

A avaliação usa o MessageModal existente, com Foto aprovada com sucesso! ou Foto reprovada com sucesso! e botão OK. O sucesso depende de resposta válida do backend, incluindo identidade e versão esperadas e o resumo de fotografia. Erros HTTP, 401, 409, falha de conexão e respostas incompletas não abrem sucesso. O fluxo continua exigindo motivo na rejeição e não duplica a operação em processamento. Após fechar, o foco volta para Atualizar pendências quando a recarga termina. A solicitação concluída é retirada localmente e as contagens ficam em atualização até a consulta de resumo concluir.

## Executar no VS Code

1. Abra cada repositório na branch indicada pelo PR e execute npm ci.
2. Portal: defina VITE_API_BASE_URL no .env.local apontando para sua API de desenvolvimento. Execute npm run dev. Para build use npm run build; para lint, npm run lint.
3. Secretaria: defina VITE_BASE_URL no .env.local com a API de desenvolvimento e execute npm run dev. Não use contas reais para testar mutações.
4. Portal: npm run test:cache executa a suíte de memória/concorrência. Compile com VITE_API_BASE_URL=http://localhost:3099 e execute npm run test:browser e npm run test:ux. As APIs desses dois scripts são simuladas; não é necessário iniciar o backend. Instale o Chromium de teste com npx playwright install chromium se ainda não estiver disponível.
5. Secretaria: npm test executa Vitest. O ensaio de navegador reutiliza o Playwright já instalado no Portal, sem nova dependência. Defina EMPLOYEE_PORTAL_DIR como caminho absoluto da pasta do Portal. Compile com VITE_BASE_URL=http://localhost:3099 e execute npm run test:photos:browser. A API é inteiramente simulada.
6. Para capturas, defina UX_EVIDENCE_DIR como caminho absoluto de uma pasta de saída. Os scripts usam portas locais 4297 (Portal UX), 4177 (regressão Portal) e 4288 (Secretaria), com service workers bloqueados no ambiente de teste.

No PowerShell, use por exemplo $env:VITE_API_BASE_URL='http://localhost:3099' antes do build, e $env:EMPLOYEE_PORTAL_DIR='C:/projetos/carteirinha-digital-front-end-funcionarios' antes do teste da Secretaria. Nunca adicione .env.local ou credenciais ao Git.

## Método de comparação de desempenho

Foi preservada a compilação local anterior às alterações, cujos fontes da Home/hooks correspondem à main usada como base. O teste de referência usa UX_BASELINE=1 e espera essa compilação em ../ux-baseline-portal-dist. O teste normal não precisa desse diretório.

A medição utiliza a mesma conta fictícia e atraso simulado de 150 ms por chamada nos dois lados. Conta as chamadas de perfil/foto na entrada e as chamadas privadas de perfil/foto/blob em Home → Meus dados → Home. O tempo considera cliques e renderização local até foto/nome disponíveis. É uma amostra por largura, não um benchmark de produção ou do Render. Os JSONs de evidência contêm os números observados. Não se deve converter esses tempos em promessa para redes reais.

## Limitações

Os testes de navegador desta etapa usam fixtures e API simulada. Confirmam UI, cache, contratos consumidos e preservação das condições do QR na interface, sem homologar armazenamento, e-mail ou dados de produção. O backend e o frontend de aluno são referências e não foram modificados. A aprovação visual e funcional final cabe ao responsável pelo projeto. Nenhum merge foi autorizado nesta etapa.

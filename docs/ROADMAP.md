# Calisthenics Mastery — roadmap completo

Atualizado em 28/09/2026.

**Direção escolhida pelo usuário: Android/Kotlin é o aplicativo principal.**
O código web permanece como referência de comportamento e regressão. O backend
Supabase e o ADR 0005 continuam sendo a base arquitetural. Aprovação da versão web
não comprova paridade nem qualidade da versão Android.

## Estado atual

A recuperação web M1 foi incorporada pela PR #1. A inspeção M2 encontrou um projeto
Android diferente da main web. A decisão do usuário resolveu a escolha da
plataforma, mas não os problemas de implementação. A homologação móvel será
conduzida pelas etapas A0–A6 abaixo.

A1 estabeleceu a contenção do protótipo e o build reproduzível. A2 está implementado
na [PR #4](https://github.com/jcantarini/calisthenics-mastery-aistudio/pull/4), mantida
em rascunho e baseada na PR #3. As correções do AI Studio exportadas no ZIP (13)
foram incorporadas em `android/`, com correspondência registrada no
[manifesto A2-C3](./android-a2-c3-sync-manifest.json). O APK conectado revisado tem
SHA-256 `5133d95e30ae6645da21fa61665ab9e506aa457d944724cacbb2ec9c8aee58f8`.
Os XMLs entregues registram 73 testes sem falhas, erros ou skips; lint registra
58 avisos. Isso é inspeção dos artefatos do AI Studio, não uma nova execução local.
O CI da revisão `d8bf998` passou: 73 testes Android sem falhas ou skips, dois
testes instrumentados no emulador API 35, build e lint (57 avisos, zero erros).
A regressão web passou com 370 testes, typecheck, lint, build e smoke.
Dez WEBPs corrompidos do export foram excluídos; os ícones existentes foram preservados.

O proprietário confirmou no aparelho login Google, restauração, cancelamento,
logout offline, isolamento conta/convidado e conta A/B e retorno breve de segundo
plano. Após parada forçada, voltou diretamente à conta; o diagnóstico de leitura
fornecido pelo Lovable registra refresh HTTP 200 e verificação de usuário HTTP 200
às 16:49:21 UTC de 28/09, com rotação persistente de token. Essa evidência é de
restauração, não de renovação agendada nem de concorrência remota.

O perfil permanece temporário em memória e é descartado na troca de identidade.
Persistência durável e onboarding pertencem a A3. A2 ainda aguarda evidência de renovação agendada. A3 continua bloqueado.
Veja o [registro atual de homologação](./architecture/android-a2-device-homologation.md).

A0 preserva a exportação do AI Studio em `android/`, na branch
`android/native-baseline-a0`, com inventário e hashes. Essa baseline tem bloqueadores
de autenticação, integridade, paridade e build; não é uma versão de lançamento.

- [Auditoria Android e decisão](https://github.com/jcantarini/calisthenics-mastery-aistudio/blob/android/native-baseline-a0/docs/architecture/android-native-audit.md)
- [Validação A1](https://github.com/jcantarini/calisthenics-mastery-aistudio/blob/android/a1-containment/docs/architecture/android-a1-validation.md)
- [Implementação e gate A2](./architecture/android-a2-auth.md)
- [Próxima continuação: A2-C1](./android-a2-c1-prompt.md)
- [Fonte Android preservada](https://github.com/jcantarini/calisthenics-mastery-aistudio/tree/android/native-baseline-a0/android)

## Roadmap

| Fase / sprint    | Entrega                                           | Estado atualizado                                                                                                        |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Base / fases 1–2 | Estrutura, catálogo, tema e navegação             | Web preservada; UI Compose existente, sem paridade integral validada                                                     |
| Fase 3           | UX mobile, onboarding e acessibilidade            | Web existente; port e homologação Android em A3/A6                                                                       |
| Fase 4           | Avaliação, primeiro treino e plano personalizado  | Web existente; equivalentes nativos incompletos, A3                                                                      |
| Fase 5           | Dashboard, perfil e progresso                     | A1 removeu dados fictícios; paridade e persistência pendentes A3/8.3                                                     |
| Fase 6           | XP, níveis e conquistas                           | Web validada anteriormente; regras Android divergentes, A4                                                               |
| Fase 7           | Metas e recuperação de recompensas                | Web validada anteriormente; Android sem garantias equivalentes, A4                                                       |
| 8.0A             | Auditoria inicial de Progress History             | Concluída e preservada                                                                                                   |
| 8.0B-A + C1/C2   | Proposta arquitetural                             | Concluída e validada                                                                                                     |
| 8.0B-B           | ADR 0005 e contratos                              | Ratificados; invariantes continuam normativos para o cliente móvel                                                       |
| 8.1A1            | Schema central e segurança                        | Validado anteriormente e restaurado; sem nova aplicação a banco compartilhado                                            |
| 8.1A2            | Fatos auxiliares e snapshots                      | Validado anteriormente e restaurado                                                                                      |
| 8.1A3 + C1       | Schema da outbox e privilégios                    | Validado anteriormente e restaurado                                                                                      |
| M1               | Recuperação e portabilidade web                   | Concluída na PR #1; referência técnica preservada                                                                        |
| M2               | Homologação do ambiente                           | Não aprovada; escopo móvel distribuído entre A1, A2 e A6                                                                 |
| A0               | Decisão Android, baseline e auditoria inicial     | Decisão confirmada; fonte preservada em branch própria; 14 achados registrados                                           |
| A1               | Build reproduzível e contenção do protótipo       | Validado: build debug, 13 testes, lint sem erros; PR #3 pronta para revisão                                              |
| A2               | Autenticação e sessão reais                       | Implementado; testes manuais e restauração remota confirmados; CI da sincronização aprovado; renovação agendada pendente |
| A2-C1            | Validação final e homologação de autenticação     | Fontes do ZIP (13) incorporadas; evidências atuais no registro de homologação                                            |
| A3               | Paridade de onboarding, perfil e plano            | Bloqueado pela aprovação de A2/A2-C1; casos de equivalência planejados                                                   |
| A4               | Paridade de gamificação e metas                   | Planejado; preservar donos de domínio, curva e idempotência                                                              |
| 8.1B1            | Normalização canônica e fingerprints              | Não implementado; próximo sprint do backend após estabilizar a base nativa                                               |
| 8.1B2            | Ingestão transacional idempotente                 | Pendente B1; histórico, filhos, fatos e dispatch atômicos                                                                |
| 8.1B3            | Voids e correções append-only                     | Planejado; integridade e replay das cadeias                                                                              |
| 8.1C             | Operação da outbox                                | Planejado; claim, leases, retry, replay e retenção                                                                       |
| 8.1D             | Fronteira autenticada acessível ao Android        | Planejado; contrato HTTP, identidade verificada e RPC restrita no servidor                                               |
| A5 / 8.2         | Coordinator e fontes de conclusão Android         | Pendente backend; plano/timer/primeiro treino, confirmação e retries duráveis                                            |
| 8.3              | Leituras canônicas e UI nativa de histórico       | Planejado; relatórios, keyset pagination e estados vazios honestos                                                       |
| 8.4              | Isolamento local e retirada do legado             | Planejado; sem importar fixtures nem reconstruir histórico do plano                                                      |
| 8.5              | Captura detalhada da execução                     | Planejado; séries, substituições, desempenho e ciclo de vida Android                                                     |
| Fase 9           | Experiência nutricional                           | UI nativa parcial; persistência e paridade ainda pendentes                                                               |
| Fase 9B          | Food facts, ingestão calórica e CalorieCam        | Futuro; separado dos fatos auxiliares da fase 8                                                                          |
| Fase 10          | Segurança, privacidade, performance e recuperação | Planejado; inclui hardening Goals/XP e particularidades móveis                                                           |
| A6               | Homologação e distribuição Android                | Pendente; dispositivo, offline, processo encerrado, assinatura e release                                                 |
| Release          | Publicação e operação                             | Bloqueado pelos gates de plataforma e domínio; nenhum APK homologado                                                     |

## Regras preservadas

- O APK é um cliente não confiável: sem chave privilegiada nem escrita direta em
  histórico com recompensas. A fronteira confiável continua no servidor.
- As 21 migrations existentes permanecem imutáveis; aplicação a banco compartilhado
  exige autorização própria. Nenhuma foi aplicada durante esta migração.
- Firebase não substitui automaticamente a identidade Supabase. Corrigir a
  integração do protótipo sem manter identidades paralelas incompatíveis.
- Histórico canônico é append-only, idempotente e independente da prescrição;
  correções não reescrevem originais e dispatch é durável.
- Dados fictícios e legado não geram XP, conquistas, metas ou streaks.
- Android precisa de testes próprios; CI web/SQL não demonstra paridade nativa.
- GitHub e AI Studio exigem sincronização explícita. Um commit não comprova que o
  editor ou o preview recebeu a versão correspondente.

## Evidências e limites

Os checks pós-merge de M1 passaram na versão web:
[aplicação](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35539272380)
e [banco](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35539272524).

A0 encontrou logs `BUILD SUCCESSFUL` no AI Studio, mas preview em `Connecting to device...`.
A1 restaurou o wrapper, corrigiu os recursos inválidos e a assinatura debug, removeu
login/progresso/sync simulados e isolou convidados. A validação independente da revisão
`650d1fc69f93da772d044cb3cc8da7f581adfad3` passou:
[Android](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35630492895)
e [web](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35630499482).
São 13 testes Android sem falhas ou skips e 370 testes web. Lint passou com 49 avisos
Android e 13 avisos web, sem erros. As 21 migrations e dependências web foram preservadas;
SQL não foi reexecutado nesta etapa, mantendo a evidência anterior da baseline intacta.

Em A2, a revisão corrigida `a5b83ffeff0a55d8854dded398569211582689a7` passou em
[Android CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315322)
e [web CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315172).
O Android validou assembleDebug, testes unitários/Compose, lint e dois testes no
emulador API 35. O web validou 370 testes, typecheck, lint (0 erros/13 avisos), build
e smoke test. O merge sintético de CI `cbf881f` e o commit publicado têm a mesma
árvore Git `0396c800f426c0e46e8909ee25e8513bd57fe27d`.

Os relatórios Android foram publicados pelo CI. O download local do ZIP recebeu
403; por isso, não se declara uma contagem de testes unitários/skips ou avisos de
lint Android que não foi extraída dos relatórios. Os respectivos jobs passaram.
Esses resultados são históricos. A homologação de login, isolamento e restauração
remota de 28/09 está no registro atual vinculado acima. A renovação agendada e a assinatura de release não devem ser inferidas dessas
evidências. O CI atual está registrado no documento de homologação. O diagnóstico do backend foi fornecido pelo Lovable, sem alteração
de provedor ou banco nesta sincronização.

## Próxima execução

1. CI da revisão `d8bf998` concluído: [Android](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/36494523445) e [web](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/36494523390). Não repetir cenários manuais aprovados sem mudança relevante no código.
2. Correlacionar uma renovação **agendada** com evidência sanitizada, usando tempo
   natural e a duração efetiva da sessão; não alterar relógio nem provedor.
3. Atualizar o registro com commit, execuções e limites. O envio ao GitHub não
   significa que o AI Studio importou uma revisão posterior.
4. Liberar A3 somente após encerrar o gate A2. Não realizar merge, release,
   migrations ou retomar 8.1B1 implicitamente.

`A2 IMPLEMENTED — VALIDATION/HOMOLOGATION BLOCKED`

# Calisthenics Mastery — roadmap completo

Atualizado em 21/09/2026.

**Direção escolhida pelo usuário: Android/Kotlin é o aplicativo principal.**
O código web permanece como referência de comportamento e regressão. O backend
Supabase e o ADR 0005 continuam sendo a base arquitetural. Aprovação da versão web
não comprova paridade nem qualidade da versão Android.

## Estado atual

A recuperação web M1 foi incorporada pela PR #1. A inspeção M2 encontrou um projeto
Android diferente da main web. A decisão do usuário resolveu a escolha da
plataforma, mas não os problemas de implementação. A homologação móvel será
conduzida pelas etapas A0–A6 abaixo.

A0 preserva a exportação do AI Studio em `android/`, na branch
`android/native-baseline-a0`, com inventário e hashes. Essa baseline tem bloqueadores
de autenticação, integridade, paridade e build; não é uma versão de lançamento.

- [Auditoria Android e decisão](https://github.com/jcantarini/calisthenics-mastery-aistudio/blob/android/native-baseline-a0/docs/architecture/android-native-audit.md)
- [Prompt completo do próximo sprint A1](https://github.com/jcantarini/calisthenics-mastery-aistudio/blob/android/native-baseline-a0/docs/android-a1-prompt.md)
- [Fonte Android preservada](https://github.com/jcantarini/calisthenics-mastery-aistudio/tree/android/native-baseline-a0/android)

## Roadmap

| Fase / sprint    | Entrega                                           | Estado atualizado                                                                |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Base / fases 1–2 | Estrutura, catálogo, tema e navegação             | Web preservada; UI Compose existente, sem paridade integral validada             |
| Fase 3           | UX mobile, onboarding e acessibilidade            | Web existente; port e homologação Android em A3/A6                               |
| Fase 4           | Avaliação, primeiro treino e plano personalizado  | Web existente; equivalentes nativos incompletos, A3                              |
| Fase 5           | Dashboard, perfil e progresso                     | UI Android presente com dados locais/fictícios; corrigir em A1/A3 e 8.3          |
| Fase 6           | XP, níveis e conquistas                           | Web validada anteriormente; regras Android divergentes, A4                       |
| Fase 7           | Metas e recuperação de recompensas                | Web validada anteriormente; Android sem garantias equivalentes, A4               |
| 8.0A             | Auditoria inicial de Progress History             | Concluída e preservada                                                           |
| 8.0B-A + C1/C2   | Proposta arquitetural                             | Concluída e validada                                                             |
| 8.0B-B           | ADR 0005 e contratos                              | Ratificados; invariantes continuam normativos para o cliente móvel               |
| 8.1A1            | Schema central e segurança                        | Validado anteriormente e restaurado; sem nova aplicação a banco compartilhado    |
| 8.1A2            | Fatos auxiliares e snapshots                      | Validado anteriormente e restaurado                                              |
| 8.1A3 + C1       | Schema da outbox e privilégios                    | Validado anteriormente e restaurado                                              |
| M1               | Recuperação e portabilidade web                   | Concluída na PR #1; referência técnica preservada                                |
| M2               | Homologação do ambiente                           | Não aprovada; escopo móvel distribuído entre A1, A2 e A6                         |
| A0               | Decisão Android, baseline e auditoria inicial     | Decisão confirmada; fonte preservada em branch própria; 14 achados registrados   |
| A1               | Build reproduzível e contenção do protótipo       | Implementado na branch android/a1-containment; build, testes e lint em validação |
| A2               | Autenticação e sessão reais                       | Pendente A1; Google/Supabase, refresh, logout, isolamento e retorno ao app       |
| A3               | Paridade de onboarding, perfil e plano            | Planejado; portar regras com casos de equivalência                               |
| A4               | Paridade de gamificação e metas                   | Planejado; preservar donos de domínio, curva e idempotência                      |
| 8.1B1            | Normalização canônica e fingerprints              | Não implementado; próximo sprint do backend após estabilizar a base nativa       |
| 8.1B2            | Ingestão transacional idempotente                 | Pendente B1; histórico, filhos, fatos e dispatch atômicos                        |
| 8.1B3            | Voids e correções append-only                     | Planejado; integridade e replay das cadeias                                      |
| 8.1C             | Operação da outbox                                | Planejado; claim, leases, retry, replay e retenção                               |
| 8.1D             | Fronteira autenticada acessível ao Android        | Planejado; contrato HTTP, identidade verificada e RPC restrita no servidor       |
| A5 / 8.2         | Coordinator e fontes de conclusão Android         | Pendente backend; plano/timer/primeiro treino, confirmação e retries duráveis    |
| 8.3              | Leituras canônicas e UI nativa de histórico       | Planejado; relatórios, keyset pagination e estados vazios honestos               |
| 8.4              | Isolamento local e retirada do legado             | Planejado; sem importar fixtures nem reconstruir histórico do plano              |
| 8.5              | Captura detalhada da execução                     | Planejado; séries, substituições, desempenho e ciclo de vida Android             |
| Fase 9           | Experiência nutricional                           | UI nativa parcial; persistência e paridade ainda pendentes                       |
| Fase 9B          | Food facts, ingestão calórica e CalorieCam        | Futuro; separado dos fatos auxiliares da fase 8                                  |
| Fase 10          | Segurança, privacidade, performance e recuperação | Planejado; inclui hardening Goals/XP e particularidades móveis                   |
| A6               | Homologação e distribuição Android                | Pendente; dispositivo, offline, processo encerrado, assinatura e release         |
| Release          | Publicação e operação                             | Bloqueado pelos gates de plataforma e domínio; nenhum APK homologado             |

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

A inspeção Android encontrou logs `BUILD SUCCESSFUL` na plataforma, mas o preview
ficou em `Connecting to device...`. A exportação apresenta 11 imagens inválidas,
wrapper incompleto e assinatura debug dependente de arquivo ausente. Build,
testes e lint Android independentes não foram executados; login e persistência
real também não foram homologados. O conector Supabase anteriormente negou acesso
ao projeto configurado. Não houve publicação, mudança de provedor ou escrita em
dados de usuários.

## Próxima execução

Finalizar a validação de **A1 — Android Build Baseline & Trust Boundary Containment**
e então iniciar A2. A auditoria A0 não significa que os 14 achados já
foram corrigidos. Manter o backend 8.1B1–8.1D no roadmap, sem reiniciar schemas
concluídos nem considerar o protótipo Kotlin equivalente à aplicação validada.

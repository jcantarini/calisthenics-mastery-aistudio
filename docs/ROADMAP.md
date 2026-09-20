# Calisthenics Mastery — roadmap completo

Atualizado em 20/09/2026. Repositório de continuidade: `jcantarini/calisthenics-mastery-aistudio`.

Este documento distingue código existente, validação, publicação e trabalho futuro.
A migração de plataforma não equivale a concluir Progress History nem a criar um aplicativo Android nativo.

## Estado atual

O repositório foi criado a partir de `db2de9fba869d2cfa6481b33f9f6b4aa6e8401ec`,
que continha a arquitetura 8.0, mas não a implementação validada do 8.1A.
A recuperação usa `c143d5451f51f2d08ea4749a6dc87a9e40c35fa3` do repositório original.
As 21 migrations foram preservadas integralmente, com as três suítes de banco.
Nenhuma migration foi aplicada a um banco compartilhado nesta migração.

## Roadmap

| Fase / sprint                    | Entrega                                                                             | Estado e próximo critério                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Base / fases 1–2                 | Estrutura web, catálogo, rotas, tema e PWA                                          | Código existente preservado; não representa homologação Android                                           |
| Fase 3                           | UX mobile, onboarding visual, responsividade e acessibilidade                       | Entregas anteriores preservadas; revisão final integrada na preparação do release                         |
| Fase 4                           | Avaliação inicial, primeiro treino e plano de quatro semanas                        | Implementado anteriormente; preservado                                                                    |
| Fase 5                           | Dashboard, perfil e experiência de progresso                                        | Implementado anteriormente; leituras históricas serão substituídas no 8.3                                 |
| Fase 6                           | XP, níveis, conquistas e orquestração                                               | Implementado; testes de regressão preservados                                                             |
| Fase 7                           | Metas, tracking e recuperação de recompensas                                        | Implementado; testes de regressão preservados                                                             |
| 8.0A                             | Auditoria do estado atual                                                           | Concluído e validado                                                                                      |
| 8.0B-A + C1/C2                   | Proposta arquitetural                                                               | Concluído e validado                                                                                      |
| 8.0B-B                           | ADR 0005 e contratos ratificados                                                    | Concluído; continuam normativos                                                                           |
| 8.1A1                            | Schema central e segurança                                                          | Validado anteriormente; restaurado nesta migração                                                         |
| 8.1A2                            | Hidratação, aderência alimentar e snapshots de metas                                | Validado anteriormente; restaurado                                                                        |
| 8.1A3 + C1                       | Outbox e correção dos privilégios                                                   | Validado anteriormente; restaurado                                                                        |
| M1                               | Recuperação e portabilidade para AI Studio                                          | Correção preparada; validação e limitações no relatório de migração                                       |
| M2                               | Configuração e homologação no ambiente real                                         | Pendente: variáveis, provedores Google/Apple, URLs autorizadas, preview independente e sessão persistente |
| 8.1B1                            | Normalização canônica e fingerprints                                                | Próximo sprint de domínio; não implementado                                                               |
| 8.1B2                            | Ingestão transacional e idempotência                                                | Pendente B1; sessões, filhos, fatos auxiliares e dispatch atômicos                                        |
| 8.1B3                            | Voids e correções append-only                                                       | Planejado; propriedade, replay e integridade de cadeias                                                   |
| 8.1C                             | Claim, leases, retry, replay e retenção da outbox                                   | Planejado; estados duráveis e recuperação                                                                 |
| 8.1D                             | Fronteira autenticada e validação integrada                                         | Planejado; user_id derivado no servidor e RPCs restritas                                                  |
| 8.2                              | Coordinator e integração plano/timer/primeiro treino                                | Bloqueado pelo 8.1; consumidores idempotentes, sem recompensas duplicadas                                 |
| 8.3                              | Leituras canônicas e UI de Progress/History                                         | Planejado; paginação keyset, relatórios e estados vazios honestos                                         |
| 8.4                              | Isolamento do estado local e retirada do legado                                     | Planejado; sem importação ou fallback de histórico reconstruído                                           |
| 8.5                              | Captura detalhada da execução do treino                                             | Planejado; séries, substituições e desempenho real                                                        |
| Fase 9 — experiência nutricional | Evolução da interface e integração dos fatos auxiliares                             | Interface atual preservada; decomposição posterior, sem antecipar food logging                            |
| Fase 9B                          | Food facts, ingestão calórica e CalorieCam                                          | Futuro; separado da aderência alimentar do 8.1A2                                                          |
| Fase 10 — hardening              | Segurança, fronteiras de Goals/XP, performance, privacidade e recuperação           | Planejado; ADR adicional somente quando necessário                                                        |
| Entrega Android                  | Empacotamento, permissões, notificações e testes em dispositivo                     | Pendente decisão técnica documentada; não há conversão Kotlin nem APK validado                            |
| Release                          | Homologação completa, acessibilidade, observabilidade, backup, publicação e suporte | Bloqueado pelos gates de domínio e plataforma                                                             |

As etapas Android e release consolidam objetivos já solicitados, sem afirmar que
existe uma decisão ratificada de reescrita nativa. Datas não são estimadas antes
da validação das dependências de cada etapa.

## Gates permanentes

- Progress History não pode ser reconstruído a partir do plano mutável.
- Conclusão confiável exige autenticação verificada, idempotência e transação atômica.
- RLS e grants continuam distintos; o navegador nunca escreve histórico com recompensas.
- Correções não alteram os registros originais.
- Usuários não recebem ações de correção antes do suporte dos consumidores.
- Banco compartilhado, configuração OAuth e publicação exigem verificação própria.
- CI verde não prova configuração do ambiente nem sucesso de login com provedores reais.

## Próxima execução

Finalizar M2 no ambiente real e então retomar 8.1B1. O prompt anterior de B1 deve
usar o novo baseline portátil registrado no relatório de migração, não reinstalar
o pacote Lovable 2.12.0 nem restaurar o lockfile antigo. Os 21 arquivos de migration
continuam sendo o baseline imutável para o próximo sprint aditivo.

# Android/Kotlin — auditoria inicial A0

## Decisão e alcance

O usuário escolheu Android/Kotlin como aplicativo principal. A versão web passa a
ser referência de comportamento, contratos e testes; não será apagada nem tratada
como prova de equivalência do aplicativo nativo. Esta decisão não aprova o código
Kotlin atual para lançamento.

O backend Supabase, as migrations existentes e os invariantes do ADR 0005 continuam
normativos. A fronteira confiável permanece no servidor: o APK, assim como o
navegador, é um cliente não confiável. A implementação dessa fronteira precisa ser
acessível ao Android por contrato HTTP autenticado; não deve depender de chamadas
internas exclusivas do cliente TanStack. A escolha do adaptador e do deploy será
documentada antes de implementar 8.1D. Não haverá migração implícita para Firebase
Auth nem substituição de identidade Supabase por UID local/Firebase.

## Origem reproduzível

- Projeto inspecionado: [AI Studio](https://aistudio.google.com/apps/ea998e0a-d223-40de-bb08-b94120125e34).
- ZIP exportado pela interface autenticada do AI Studio.
- SHA-256 do ZIP: `6b42225554ff1e62f6c30f377f79e69e01a1a51eac694d8132bba9e1dbbe2fcc`.
- 56 arquivos regulares; 21 arquivos Kotlin; 8 métodos anotados com `@Test`.
- A cópia em `android/` preserva o conteúdo dos 56 arquivos exportados.
- [Manifesto de hashes](./android-source-manifest.json) permite verificar essa cópia.
- Referência web: commit `a132cf0d51cc51c50cb225a30ec98957a1a13eec`.
- A importação é uma baseline de auditoria em branch própria, sem publicação de APK.
- Auditoria finalizada em 21/09/2026.

## Resultado

**NÃO HOMOLOGADO — a conversão ainda não preserva o comportamento validado.**

O painel do AI Studio registrou `BUILD SUCCESSFUL` para `assembleDebug`. Essa é
evidência do build registrado pela plataforma, não de um build independente desta
exportação. O preview permaneceu em `Connecting to device...` após recarga. A
mensagem de quota excedida é da conversa com o assistente; não foi demonstrado que
ela causou a falha de conexão.

## Achados prioritários

Os caminhos abaixo são relativos a `android/app/src/main/`.

| ID  | Prioridade | Evidência no código exportado                                                                                                                                                                                                             | Consequência e correção necessária                                                                                                                                                                                              |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | Bloqueador | `java/com/example/ui/screens/LoginScreen.kt` abre um seletor desenhado pelo aplicativo, com conta fixa e formulário de nome/e-mail; `CalisthenicsViewModel.signInWithGoogleAccount` gera UID local e `isGuest=false`.                     | Entrada sem autenticação é apresentada como login Google. Remover a simulação da produção; falhas e cancelamentos devem permanecer desautenticados.                                                                             |
| N02 | Bloqueador | `CalisthenicsViewModel.signInWithGoogle` usa Firebase e recorre ao login local quando há erro; `SupabaseManager` mantém sessão independente.                                                                                              | Não existe ponte de identidade demonstrada entre Google, Firebase e Supabase. Implementar autenticação Supabase verificada e uma única fonte de sessão.                                                                         |
| N03 | Alto       | `CalisthenicsRepository.initPreferences` restaura acesso só por UID salvo. `SupabaseManager` salva access token em SharedPreferences, declara refresh token mas não o persiste/renova. Backup está habilitado com regras de exemplo.      | Identidade local não comprova sessão válida; expiração e backup precisam de tratamento. Testar restauração, refresh, revogação, logout e troca de conta.                                                                        |
| N04 | Bloqueador | `SupabaseManager.logWorkoutSessionToCloud` faz POST direto em `workout_sessions`; `logHydrationToCloud` também escreve diretamente. Campos como `duration_sec`, `kcal_burned`, `label` e `date` não correspondem ao contrato canônico.    | Viola a fronteira de escrita aprovada. Grants atuais devem continuar bloqueando esses caminhos; não afrouxar RLS/grants para fazê-los funcionar. Usar ingestão confiável quando disponível.                                     |
| N05 | Alto       | `SupabaseCloudStatus` começa conectado e com 26 tabelas; `fetchTable` transforma falhas em listas vazias; `syncCloudData` retorna sucesso e seu resultado é descartado no ViewModel. A tela mostra `ONLINE` e `Supabase Conectado` fixos. | A interface declara sincronização sem evidência e não aplica dados retornados. Introduzir estados reais, propagação de erro e leitura integrada.                                                                                |
| N06 | Alto       | `CalisthenicsAppState` inicia com 420 XP, nível 2, cinco treinos, três dias de sequência, duas sessões e hidratação pré-preenchida; `CalisthenicsData` traz conquistas desbloqueadas e metas avançadas.                                   | Dados fictícios aparecem como progresso pessoal. Usar estado vazio honesto; fixtures somente em testes ou demonstração explicitamente isolada.                                                                                  |
| N07 | Alto       | `CalisthenicsRepository` mantém progresso em memória; `signOut` só retira o usuário e `setAuthUser` preserva métricas.                                                                                                                    | Reinício perde progresso e troca de conta pode reaproveitar estado de outra identidade na interface. Isolar e limpar todo estado por usuário.                                                                                   |
| N08 | Alto       | `claimGoalReward` não verifica conclusão nem resgate prévio; treino/timer creditam XP local; `calculateLevel` tem cinco níveis e limiares 300/700/1200/2000.                                                                              | Recompensas repetíveis e divergência da progressão web de até 100 níveis. Portar regras com testes de equivalência e idempotência, preservando os donos dos domínios.                                                           |
| N09 | Alto       | `finishActiveWorkout` força duração mínima de 60 s; o timer registra e premia ao atingir DONE, inclusive por avanço manual; `streakDays` soma a cada treino.                                                                              | Evidência e calendário não são confiáveis. Exigir confirmação e evidência não vazia, duração real, relógio adequado e streak por dia.                                                                                           |
| N10 | Alto       | `WorkoutSession` contém apenas ID, timestamp, rótulo, duração, calorias e origem. Não há chaves canônicas, timezone/local day, filhos, ajustes ou dispatch.                                                                               | O modelo não implementa ADR 0005. Continuar 8.1–8.5 com o Android como cliente, sem dar por concluído o backend ainda planejado.                                                                                                |
| N11 | Alto       | Cinco programas estáticos em `CalisthenicsData`; não há fluxo de avaliação/onboarding nem equivalente dos serviços de geração de plano da referência web.                                                                                 | A UI nativa não é port completo das fases 3–5. Produzir matriz de paridade e portar por domínio.                                                                                                                                |
| N12 | Alto       | Exportação não contém `gradlew`, `gradlew.bat`, wrapper JAR ou `debug.keystore`; Gradle aponta para 9.3.1 e o debug exige keystore no diretório raiz. `default_web_client_id` é placeholder.                                              | Build exportado não é reproduzível por checkout limpo como está. Restaurar ferramentas oficiais verificadas, assinatura debug padrão fora do AI Studio e CI Android antes de considerar correções validadas.                    |
| N13 | Médio      | Testes existentes cobrem catálogo, soma de XP local, água, atribuição local de usuário, nome do app e screenshot de `Greeting`.                                                                                                           | Oito testes não equivalem às suítes web/SQL. Faltam cenários de autenticação, falha de rede, isolamento, recompensas, timer e contratos.                                                                                        |
| N14 | Alto       | Os dez ícones WebP e o screenshot PNG da exportação falharam na leitura independente com Pillow; os dois JPEGs abriram normalmente. A assinatura do PNG começa por `c2 89 50 4e 47`, em vez de `89 50 4e 47`.                             | Há corrupção de recursos no ZIP recebido, não apenas um preview indisponível. Recuperar os binários originais e validar todas as imagens antes do build independente. Não atribuir esse defeito ao código Kotlin sem evidência. |

A chave encontrada no cliente é do papel `anon`, não uma chave privilegiada. Sua
presença não demonstra autorização de escrita. A busca estática não encontrou
padrões de chave `service_role`, `sb_secret_` ou chave privada; isso não substitui
uma varredura completa de secrets nem inspeção do APK.

## Matriz de continuidade

| Área                                        | Situação Android                      | Trabalho necessário                                                     |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| UI Compose, navegação, catálogo e imagens   | Código presente                       | Validar em dispositivo; manter identidade visual e acessibilidade       |
| Avaliação, onboarding e plano personalizado | Equivalência ausente                  | Portar fases 3–5 e conferir catálogo/IDs                                |
| Login e sessão                              | Simulação e integrações conflitantes  | A1 contenção e A2 autenticação real                                     |
| Perfil e nutrição                           | Dados padrão e cálculos locais        | Persistência por usuário, entradas explícitas e equivalência das regras |
| XP, níveis, conquistas e metas              | Versões simplificadas e locais        | A4 paridade, idempotência e integração com donos do domínio             |
| Schema Progress History e outbox            | Preservados no backend do repositório | Não duplicar no APK nem reescrever migrations                           |
| Ingestão, ajustes e workers                 | Ainda planejados no backend           | Continuar 8.1B1–8.1D; Android consome contratos autenticados            |
| Timer e execução                            | Código presente, evidência incorreta  | A5 e 8.2/8.5: relógio, ciclo de vida, confirmação e captura             |
| Relatórios e histórico canônico             | Não implementados no nativo           | 8.3, com estados vazios e keyset pagination                             |
| CalorieCam e food facts                     | Futuro                                | Permanecem na fase 9B                                                   |

## Sequência aprovada de plataforma

1. **A0 — decisão e baseline Android:** escolha registrada, exportação preservada,
   auditoria inicial e matriz de lacunas. Não é aprovação funcional.
2. **A1 — build reproduzível e contenção:** wrapper/CI/assinatura debug; remover login
   simulado, progresso fictício e alegações de sincronização; bloquear escrita
   direta e recompensas não verificadas até existir suporte correto.
3. **A2 — identidade e sessão:** Google/Supabase real, persistência segura, refresh,
   logout, troca de conta e testes de falha. Configuração de provedor tem gate próprio.
4. **A3 — paridade de onboarding, perfil e plano:** portar regras e comportamento
   preservando IDs e separar catálogo, prescrição, runtime e histórico.
5. **A4 — paridade de gamificação e metas:** recompensas e curva originais com
   testes de equivalência; não inventar novo ledger nem premiar fixtures.
6. **8.1B1–8.1D — backend confiável:** mesma sequência de domínio; adaptar a
   fronteira para cliente móvel sem mudar invariantes do ADR 0005 silenciosamente.
7. **A5 / 8.2–8.5 — integração nativa:** conclusão, leituras, isolamento e execução.
8. **A6 — homologação e distribuição Android:** emulador/dispositivo, acessibilidade,
   retorno de autenticação, offline, processo encerrado, assinatura release e publicação.

## Validação desta entrega

- Exportação aberta e inventariada; caminhos sem travessia de diretório.
- Arquivos e chamadas críticos comparados com código e contratos da referência web.
- Hashes individuais registrados para checar preservação da baseline.
- Validação de imagens: dois JPEGs válidos; dez WebPs e um PNG inválidos na exportação.
- Testes Kotlin, lint Android, instrumentação e build independente: **não executados**.
  O ambiente desta auditoria não dispõe de Gradle/SDK Android configurados e a
  exportação não inclui o wrapper completo.
- Login, sessão, requests reais de escrita e migrations em banco compartilhado:
  **não executados**. Não se testou escrita proibida contra dados reais.
- Logs de build da plataforma não aprovam os achados funcionais acima.

**A0: auditoria inicial concluída. A1 é o próximo sprint corretivo. Release bloqueado.**

# Seletor de idioma no app Barra

Hoje o app está todo em português com textos fixos no código. Vou introduzir um sistema de tradução (i18n) leve e conectar um seletor de idioma na tela de Preferências, dentro do Perfil.

## O que será construído

1. **Infraestrutura de tradução**
   - Novo arquivo `src/lib/i18n.ts` com:
     - Tipo `Locale = "pt" | "en" | "it" | "es" | "fr"`
     - Dicionários para os 5 idiomas (português como base)
     - Hook `useT()` que devolve a função `t("chave")` e o locale atual
     - Provider leve via Context + persistência do idioma escolhido no `localStorage` (`barra:locale`)
   - Idioma padrão: português. Na primeira visita, detecta `navigator.language` e usa se for um dos 5 suportados.

2. **Tela de Preferências**
   - Hoje `Preferências` em `src/routes/perfil.tsx` é apenas um item de lista sem destino. Vou criar a rota `src/routes/preferencias.tsx` com:
     - Cartão "Idioma" listando as 5 opções (bandeira + nome nativo: Português, English, Italiano, Español, Français)
     - Seleção marca visualmente a opção ativa e salva imediatamente
     - Head/meta traduzidos
   - No `perfil.tsx`, o item "Preferências" vira um `<Link to="/preferencias">`.

3. **Aplicar traduções nas telas**
   - Substituir strings fixas por `t(...)` em: navegação inferior, Home (`index.tsx`), Treinos, Timer, Dieta, Progresso, Relatório, Perfil e Preferências.
   - Elementos de conteúdo específico (nomes de exercícios de `programs.ts`, refeições do cardápio de `nutrition.ts`) permanecem em português nesta entrega — apenas rótulos de interface serão traduzidos. Isso é destacado abaixo em "Escopo".
   - Títulos de página (`head().meta`) também respeitam o locale.

## Escopo desta entrega

- **Traduzido:** rótulos de UI, botões, títulos de seção, mensagens de toast, textos de estado vazio, navegação.
- **Não traduzido nesta entrega:** conteúdo dos programas de treino (nomes/descrições dos exercícios) e itens do cardápio nutricional — esses são dados de domínio grandes e específicos, que ficam melhor em uma segunda passada dedicada se você quiser.

## Detalhes técnicos

- Sem dependências novas: implementação nativa com React Context, evitando peso de `i18next`.
- Chaves de tradução seguem convenção `escopo.chave` (ex.: `nav.home`, `timer.start`, `perfil.editar`).
- O provider envolve `RootComponent` em `src/routes/__root.tsx`.
- Reatividade: mudar o idioma re-renderiza toda a árvore via `useSyncExternalStore` sobre um pequeno store, sem reload da página.
- `<html lang="...">` é atualizado dinamicamente para acessibilidade/SEO.

## Confirmação

Quer que eu prossiga com esse escopo (só rótulos de UI), ou prefere que eu inclua também os nomes dos exercícios e do cardápio nesta mesma tarefa?

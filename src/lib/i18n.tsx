import { useSyncExternalStore, useEffect, type ReactNode } from "react";

export type Locale = "pt" | "en" | "it" | "es" | "fr";

export const LOCALES: { code: Locale; label: string; flag: string; htmlLang: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷", htmlLang: "pt-BR" },
  { code: "en", label: "English", flag: "🇺🇸", htmlLang: "en" },
  { code: "it", label: "Italiano", flag: "🇮🇹", htmlLang: "it" },
  { code: "es", label: "Español", flag: "🇪🇸", htmlLang: "es" },
  { code: "fr", label: "Français", flag: "🇫🇷", htmlLang: "fr" },
];

const STORAGE_KEY = "barra:locale";

type Dict = Record<string, string>;

const pt: Dict = {
  "nav.home": "Início",
  "nav.workouts": "Treinos",
  "nav.diet": "Dieta",
  "nav.progress": "Progresso",
  "nav.profile": "Perfil",

  "common.back": "Voltar",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.close": "Fechar",
  "common.retry": "Tentar novamente",
  "common.start": "Início",
  "common.settings": "Preferências",

  "404.title": "Página não encontrada",
  "404.desc": "Essa rota não existe. Volte para o treino.",
  "404.back": "Voltar ao início",
  "error.title": "Algo deu errado",
  "error.desc": "Tente novamente ou volte para o início.",

  "profile.title": "Perfil",
  "profile.athlete": "Atleta · Nível",
  "profile.since": "Desde",
  "profile.sessions": "sessões",
  "profile.edit": "Editar",
  "profile.editTitle": "Editar perfil",
  "profile.name": "Nome",
  "profile.weight": "Peso (kg)",
  "profile.height": "Altura (cm)",
  "profile.birthYear": "Ano de nascimento",
  "profile.sex": "Sexo biológico (para cálculo calórico)",
  "profile.male": "masculino",
  "profile.female": "feminino",
  "profile.saveChanges": "Salvar alterações",
  "profile.weeklyGoal": "Meta semanal",
  "profile.perWeek": "treinos/sem",
  "profile.achievements": "Conquistas",
  "profile.ach.sessions10": "10 sessões",
  "profile.ach.perfectWeek": "Semana perfeita",
  "profile.ach.programs3": "3 programas",
  "profile.appearance": "Aparência",
  "profile.dark": "Escuro",
  "profile.share": "Compartilhar app",
  "profile.settings": "Preferências",
  "profile.logout": "Sair",
  "profile.footer": "Barra v1.0 · Calistenia sem desculpa",
  "profile.updated": "Perfil atualizado",
  "profile.stat.weight": "Peso",
  "profile.stat.height": "Altura",
  "profile.stat.bmi": "IMC",
  "profile.stat.age": "Idade",

  "prefs.title": "Preferências",
  "prefs.subtitle": "Personalize o app do seu jeito",
  "prefs.language": "Idioma",
  "prefs.languageDesc": "Escolha o idioma da interface do app.",
  "prefs.languageSaved": "Idioma alterado",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.workouts": "Workouts",
  "nav.diet": "Diet",
  "nav.progress": "Progress",
  "nav.profile": "Profile",

  "common.back": "Back",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.retry": "Try again",
  "common.start": "Home",
  "common.settings": "Preferences",

  "404.title": "Page not found",
  "404.desc": "This route does not exist. Back to training.",
  "404.back": "Back to home",
  "error.title": "Something went wrong",
  "error.desc": "Try again or go back to the start.",

  "profile.title": "Profile",
  "profile.athlete": "Athlete · Level",
  "profile.since": "Since",
  "profile.sessions": "sessions",
  "profile.edit": "Edit",
  "profile.editTitle": "Edit profile",
  "profile.name": "Name",
  "profile.weight": "Weight (kg)",
  "profile.height": "Height (cm)",
  "profile.birthYear": "Year of birth",
  "profile.sex": "Biological sex (for calorie calc)",
  "profile.male": "male",
  "profile.female": "female",
  "profile.saveChanges": "Save changes",
  "profile.weeklyGoal": "Weekly goal",
  "profile.perWeek": "workouts/wk",
  "profile.achievements": "Achievements",
  "profile.ach.sessions10": "10 sessions",
  "profile.ach.perfectWeek": "Perfect week",
  "profile.ach.programs3": "3 programs",
  "profile.appearance": "Appearance",
  "profile.dark": "Dark",
  "profile.share": "Share the app",
  "profile.settings": "Preferences",
  "profile.logout": "Log out",
  "profile.footer": "Barra v1.0 · No-excuse calisthenics",
  "profile.updated": "Profile updated",
  "profile.stat.weight": "Weight",
  "profile.stat.height": "Height",
  "profile.stat.bmi": "BMI",
  "profile.stat.age": "Age",

  "prefs.title": "Preferences",
  "prefs.subtitle": "Personalize the app your way",
  "prefs.language": "Language",
  "prefs.languageDesc": "Choose the app interface language.",
  "prefs.languageSaved": "Language changed",
};

const it: Dict = {
  "nav.home": "Home",
  "nav.workouts": "Allenamenti",
  "nav.diet": "Dieta",
  "nav.progress": "Progressi",
  "nav.profile": "Profilo",

  "common.back": "Indietro",
  "common.save": "Salva",
  "common.cancel": "Annulla",
  "common.close": "Chiudi",
  "common.retry": "Riprova",
  "common.start": "Home",
  "common.settings": "Preferenze",

  "404.title": "Pagina non trovata",
  "404.desc": "Questa pagina non esiste. Torna all'allenamento.",
  "404.back": "Torna alla home",
  "error.title": "Qualcosa è andato storto",
  "error.desc": "Riprova o torna all'inizio.",

  "profile.title": "Profilo",
  "profile.athlete": "Atleta · Livello",
  "profile.since": "Dal",
  "profile.sessions": "sessioni",
  "profile.edit": "Modifica",
  "profile.editTitle": "Modifica profilo",
  "profile.name": "Nome",
  "profile.weight": "Peso (kg)",
  "profile.height": "Altezza (cm)",
  "profile.birthYear": "Anno di nascita",
  "profile.sex": "Sesso biologico (per calcolo calorico)",
  "profile.male": "maschio",
  "profile.female": "femmina",
  "profile.saveChanges": "Salva modifiche",
  "profile.weeklyGoal": "Obiettivo settimanale",
  "profile.perWeek": "allenamenti/sett",
  "profile.achievements": "Traguardi",
  "profile.ach.sessions10": "10 sessioni",
  "profile.ach.perfectWeek": "Settimana perfetta",
  "profile.ach.programs3": "3 programmi",
  "profile.appearance": "Aspetto",
  "profile.dark": "Scuro",
  "profile.share": "Condividi l'app",
  "profile.settings": "Preferenze",
  "profile.logout": "Esci",
  "profile.footer": "Barra v1.0 · Calisthenics senza scuse",
  "profile.updated": "Profilo aggiornato",
  "profile.stat.weight": "Peso",
  "profile.stat.height": "Altezza",
  "profile.stat.bmi": "IMC",
  "profile.stat.age": "Età",

  "prefs.title": "Preferenze",
  "prefs.subtitle": "Personalizza l'app come vuoi",
  "prefs.language": "Lingua",
  "prefs.languageDesc": "Scegli la lingua dell'interfaccia.",
  "prefs.languageSaved": "Lingua cambiata",
};

const es: Dict = {
  "nav.home": "Inicio",
  "nav.workouts": "Entrenos",
  "nav.diet": "Dieta",
  "nav.progress": "Progreso",
  "nav.profile": "Perfil",

  "common.back": "Volver",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.retry": "Reintentar",
  "common.start": "Inicio",
  "common.settings": "Preferencias",

  "404.title": "Página no encontrada",
  "404.desc": "Esta ruta no existe. Vuelve al entrenamiento.",
  "404.back": "Volver al inicio",
  "error.title": "Algo salió mal",
  "error.desc": "Inténtalo de nuevo o vuelve al inicio.",

  "profile.title": "Perfil",
  "profile.athlete": "Atleta · Nivel",
  "profile.since": "Desde",
  "profile.sessions": "sesiones",
  "profile.edit": "Editar",
  "profile.editTitle": "Editar perfil",
  "profile.name": "Nombre",
  "profile.weight": "Peso (kg)",
  "profile.height": "Altura (cm)",
  "profile.birthYear": "Año de nacimiento",
  "profile.sex": "Sexo biológico (para cálculo calórico)",
  "profile.male": "masculino",
  "profile.female": "femenino",
  "profile.saveChanges": "Guardar cambios",
  "profile.weeklyGoal": "Meta semanal",
  "profile.perWeek": "entrenos/sem",
  "profile.achievements": "Logros",
  "profile.ach.sessions10": "10 sesiones",
  "profile.ach.perfectWeek": "Semana perfecta",
  "profile.ach.programs3": "3 programas",
  "profile.appearance": "Apariencia",
  "profile.dark": "Oscuro",
  "profile.share": "Compartir la app",
  "profile.settings": "Preferencias",
  "profile.logout": "Cerrar sesión",
  "profile.footer": "Barra v1.0 · Calistenia sin excusas",
  "profile.updated": "Perfil actualizado",
  "profile.stat.weight": "Peso",
  "profile.stat.height": "Altura",
  "profile.stat.bmi": "IMC",
  "profile.stat.age": "Edad",

  "prefs.title": "Preferencias",
  "prefs.subtitle": "Personaliza la app a tu gusto",
  "prefs.language": "Idioma",
  "prefs.languageDesc": "Elige el idioma de la interfaz.",
  "prefs.languageSaved": "Idioma cambiado",
};

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.workouts": "Séances",
  "nav.diet": "Nutrition",
  "nav.progress": "Progrès",
  "nav.profile": "Profil",

  "common.back": "Retour",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.retry": "Réessayer",
  "common.start": "Accueil",
  "common.settings": "Préférences",

  "404.title": "Page introuvable",
  "404.desc": "Cette page n'existe pas. Retour à l'entraînement.",
  "404.back": "Retour à l'accueil",
  "error.title": "Une erreur est survenue",
  "error.desc": "Réessayez ou revenez à l'accueil.",

  "profile.title": "Profil",
  "profile.athlete": "Athlète · Niveau",
  "profile.since": "Depuis",
  "profile.sessions": "séances",
  "profile.edit": "Modifier",
  "profile.editTitle": "Modifier le profil",
  "profile.name": "Nom",
  "profile.weight": "Poids (kg)",
  "profile.height": "Taille (cm)",
  "profile.birthYear": "Année de naissance",
  "profile.sex": "Sexe biologique (pour calcul calorique)",
  "profile.male": "masculin",
  "profile.female": "féminin",
  "profile.saveChanges": "Enregistrer",
  "profile.weeklyGoal": "Objectif hebdo",
  "profile.perWeek": "séances/sem",
  "profile.achievements": "Trophées",
  "profile.ach.sessions10": "10 séances",
  "profile.ach.perfectWeek": "Semaine parfaite",
  "profile.ach.programs3": "3 programmes",
  "profile.appearance": "Apparence",
  "profile.dark": "Sombre",
  "profile.share": "Partager l'app",
  "profile.settings": "Préférences",
  "profile.logout": "Déconnexion",
  "profile.footer": "Barra v1.0 · Callisthénie sans excuse",
  "profile.updated": "Profil mis à jour",
  "profile.stat.weight": "Poids",
  "profile.stat.height": "Taille",
  "profile.stat.bmi": "IMC",
  "profile.stat.age": "Âge",

  "prefs.title": "Préférences",
  "prefs.subtitle": "Personnalisez l'app à votre goût",
  "prefs.language": "Langue",
  "prefs.languageDesc": "Choisissez la langue de l'interface.",
  "prefs.languageSaved": "Langue modifiée",
};

const DICTS: Record<Locale, Dict> = { pt, en, it, es, fr };

let currentLocale: Locale = "pt";
const listeners = new Set<() => void>();

function detectInitial(): Locale {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && DICTS[saved]) return saved;
    const nav = (navigator.language || "pt").slice(0, 2).toLowerCase() as Locale;
    if (DICTS[nav]) return nav;
  } catch {}
  return "pt";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Locale {
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return "pt";
}

export function setLocale(next: Locale) {
  if (!DICTS[next] || currentLocale === next) return;
  currentLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
    const html = document.documentElement;
    const info = LOCALES.find((l) => l.code === next);
    if (info) html.lang = info.htmlLang;
  } catch {}
  listeners.forEach((l) => l());
}

export function I18nBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    const initial = detectInitial();
    if (initial !== currentLocale) {
      currentLocale = initial;
      const info = LOCALES.find((l) => l.code === initial);
      if (info) document.documentElement.lang = info.htmlLang;
      listeners.forEach((l) => l());
    }
  }, []);
  return <>{children}</>;
}

export function useT() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dict = DICTS[locale];
  const t = (key: string) => dict[key] ?? DICTS.pt[key] ?? key;
  return { t, locale, setLocale };
}

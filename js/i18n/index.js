const SUPPORTED_LANGUAGES = ["en", "es", "fr", "swa"];
const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "meeting_program_language";

let currentLanguage = DEFAULT_LANGUAGE;
let translations = {};

const translationsData = {
  en: {
    churchName: "The Church of Jesus Christ <br> of Latter-day Saints",
    sacramentServices: "Sacrament Services",
    welcomeTo: "Welcome to",
    scanProgramQR: "Scan Program QR Code",
    useNewQR: "Use New QR Code",
    cancel: "Cancel",
    loading: "Loading Program...",
    scanNewProgram: "Scan New Program",
    managePrograms: "Manage Programs",
    close: "Close",
    add: "Add",
    delete: "Delete",
    remove: "Remove",
    offlineMode: "Showing last available program (offline mode)",
    tryNow: "Try Now",
    updateAvailable: "A new version is available.",
    update: "Update",
    reloadProgram: "Reload Program",
    addProgram: "Add Program?",
    found: "Found:",
    noSavedPrograms: "No saved programs",
    lastUpdated: "Last updated ",
    presiding: "Presiding",
    conducting: "Conducting",
    openingHymn: "Opening Hymn",
    openingPrayer: "Invocation",
    sacramentHymn: "Sacrament Hymn",
    speaker: "Speaker",
    intermediateHymn: "Intermediate Hymn",
    closingHymn: "Closing Hymn",
    closingPrayer: "Benediction",
    musicDirector: "Music Director",
    organist: "Organist",
    unableToLoad: "Unable to load program.",
    retry: "Retry",
    cameraUnavailable: "Camera access is not available in this browser.",
    cameraDenied: "Camera access denied or unavailable.",
    invalidQR: "Invalid QR code. Please scan a program QR code.",
    scannedUrl: "Scanned URL:",
    toggleDarkMode: "Toggle Dark Mode",
    selectLanguage: "Select Language",
    announcements: "Announcements",
    branchOrStakeBusiness: "Branch or Stake Business",
    ordinanceOfTheSacrament: "Ordinance of the Sacrament",
    dismissToClass: "Dismiss to Class",
    localLeaders: "Local Leaders",
    auxiliaryLeaders: "Auxiliary Leaders",
    otherLeaders: "Other Leaders",
    ldsApps: "LDS Apps",
    activitiesAndEvents: "Activities and Events",
    otherInformation: "Other Information",
    sacramentMeetingOnZoom: "Sacrament Meeting on Zoom",
    generalInformation: "General Information",
    hymn: "Hymn",
    leader: "Leader",
    at: "at",
    unknownUnit: "Unknown Unit",
    programHistory: "Program History",
    noHistory: "No previous programs saved",
    loadProgram: "Load",
    historyRetainedUntil: "Retained until",
    shareProgram: "Share Program",
    shareInstructions: "Scan this QR code to load the program on another device",
    helpTitle: "Help & FAQ",
    programArchives: "Program Archives",
    backToHome: "Back to Home",
    viewArchive: "View",
    noArchives: "No archives found for this profile.",
    archivesCreatedAutomatically:
      "Archives are created automatically when program changes are detected.",
    noProfileSelected: "No profile selected.",
    goToHome: "Go to Home",
    backToArchiveList: "Back to Archive List",
    storageWarning: "Storage warning: Approaching size limit",
    storageUsage: "Storage: {used}MB / {max}MB ({count} archives)"
  },
  es: {
    churchName: "La Iglesia de Jesucristo <br> de los Santos de los Últimos Días",
    sacramentServices: "Servicios Sacramentales",
    welcomeTo: "Bienvenido a",
    scanProgramQR: "Escanear Código QR del Programa",
    useNewQR: "Usar Nuevo Código QR",
    cancel: "Cancelar",
    loading: "Cargando Programa...",
    scanNewProgram: "Escanear Nuevo Programa",
    managePrograms: "Administrar Programas",
    close: "Cerrar",
    add: "Agregar",
    delete: "Eliminar",
    remove: "Quitar",
    offlineMode: "Mostrando último programa disponible (modo sin conexión)",
    tryNow: "Intentar Ahora",
    updateAvailable: "Una nueva versión está disponible.",
    update: "Actualizar",
    reloadProgram: "Recargar Programa",
    addProgram: "¿Agregar Programa?",
    found: "Encontrado:",
    noSavedPrograms: "No hay programas guardados",
    lastUpdated: "Última actualización ",
    presiding: "Presidiendo",
    conducting: "Conduciendo",
    openingHymn: "Himno de Apertura",
    openingPrayer: "Invocación",
    sacramentHymn: "Himno de la Santa Cena",
    speaker: "Orador",
    intermediateHymn: "Himno Intermedio",
    closingHymn: "Himno de Clausura",
    closingPrayer: "Bendición",
    musicDirector: "Director de Música",
    organist: "Organista",
    unableToLoad: "No se pudo cargar el programa.",
    retry: "Reintentar",
    cameraUnavailable: "El acceso a la cámara no está disponible en este navegador.",
    cameraDenied: "Acceso a la cámara denegado o no disponible.",
    invalidQR: "Código QR inválido. Por favor escanee un código QR del programa.",
    scannedUrl: "URL Escaneada:",
    toggleDarkMode: "Cambiar Modo Oscuro",
    selectLanguage: "Seleccionar Idioma",
    announcements: "Anuncios",
    branchOrStakeBusiness: "Negocios de la Rama o Estaca",
    ordinanceOfTheSacrament: "Ordenanza de la Santa Cena",
    dismissToClass: "Ir a Clase",
    localLeaders: "Líderes Locales",
    auxiliaryLeaders: "Líderes de Auxiliares",
    otherLeaders: "Otros Líderes",
    ldsApps: "Aplicaciones de la Iglesia",
    activitiesAndEvents: "Actividades y Eventos",
    otherInformation: "Otra Información",
    sacramentMeetingOnZoom: "Reunión Sacramental por Zoom",
    generalInformation: "Información General",
    hymn: "Himno",
    leader: "Líder",
    at: "a",
    unknownUnit: "Unidad Desconocida",
    programHistory: "Historial de Programas",
    noHistory: "No hay programas anteriores guardados",
    loadProgram: "Cargar",
    historyRetainedUntil: "Conservado hasta",
    shareProgram: "Compartir Programa",
    shareInstructions: "Escanee este código QR para cargar el programa en otro dispositivo",
    helpTitle: "Ayuda y Preguntas Frecuentes",
    programArchives: "Archivos de Programas",
    backToHome: "Volver al Inicio",
    viewArchive: "Ver",
    noArchives: "No se encontraron archivos para este perfil.",
    archivesCreatedAutomatically:
      "Los archivos se crean automáticamente cuando se detectan cambios en el programa.",
    noProfileSelected: "Ningún perfil seleccionado.",
    goToHome: "Ir al Inicio",
    backToArchiveList: "Volver a la Lista de Archivos",
    storageWarning: "Advertencia de almacenamiento: Acercándose al límite",
    storageUsage: "Almacenamiento: {used}MB / {max}MB ({count} archivos)"
  },
  fr: {
    churchName: "L'Église de Jésus-Christ <br> des Saints des Derniers Jours",
    sacramentServices: "Services du Sacrement",
    welcomeTo: "Bienvenue à",
    scanProgramQR: "Scanner le Code QR du Programme",
    useNewQR: "Utiliser un Nouveau Code QR",
    cancel: "Annuler",
    loading: "Chargement du Programme...",
    scanNewProgram: "Scanner un Nouveau Programme",
    managePrograms: "Gérer les Programmes",
    close: "Fermer",
    add: "Ajouter",
    delete: "Supprimer",
    remove: "Retirer",
    offlineMode: "Affichage du dernier programme disponible (mode hors ligne)",
    tryNow: "Essayer Maintenant",
    updateAvailable: "Une nouvelle version est disponible.",
    update: "Mettre à jour",
    reloadProgram: "Recharger le Programme",
    addProgram: "Ajouter un Programme?",
    found: "Trouvé:",
    noSavedPrograms: "Aucun programme enregistré",
    lastUpdated: "Dernière mise à jour ",
    presiding: "Présidant",
    conducting: "Conduisant",
    openingHymn: "Hymne d'Ouverture",
    openingPrayer: "Prière d'ouverture",
    sacramentHymn: "Hymne de la Sainte-Cène",
    speaker: "Intervenant",
    intermediateHymn: "Hymne Intermédiaire",
    closingHymn: "Hymne de Clôture",
    closingPrayer: "Bénédiction",
    musicDirector: "Directeur de Musique",
    organist: "Organiste",
    unableToLoad: "Impossible de charger le programme.",
    retry: "Réessayer",
    cameraUnavailable: "L'accès à la caméra n'est pas disponible dans ce navigateur.",
    cameraDenied: "Accès à la caméra refusé ou indisponible.",
    invalidQR: "Code QR invalide. Veuillez scanner un code QR de programme.",
    scannedUrl: "URL Scannée:",
    toggleDarkMode: "Basculer le Mode Sombre",
    selectLanguage: "Sélectionner la Langue",
    announcements: "Annonces",
    branchOrStakeBusiness: "Affaires de la Branche ou du Pieu",
    ordinanceOfTheSacrament: "Ordonnance du Sacrement",
    dismissToClass: "Retour en Classe",
    localLeaders: "Dirigeants Locaux",
    auxiliaryLeaders: "Dirigeants des Auxiliaires",
    otherLeaders: "Autres Dirigeants",
    ldsApps: "Applications de l'Église",
    activitiesAndEvents: "Activités et Événements",
    otherInformation: "Autres Informations",
    sacramentMeetingOnZoom: "Réunion du Sacrement sur Zoom",
    generalInformation: "Informations Générales",
    hymn: "Hymne",
    leader: "Dirigeant",
    at: "à",
    unknownUnit: "Unité Inconnue",
    programHistory: "Historique des Programmes",
    noHistory: "Aucun programme précédent enregistré",
    loadProgram: "Charger",
    historyRetainedUntil: "Conservé jusqu'au",
    shareProgram: "Partager le Programme",
    shareInstructions: "Scannez ce code QR pour charger le programme sur un autre appareil",
    helpTitle: "Aide et FAQ",
    programArchives: "Archives des Programmes",
    backToHome: "Retour à l'Accueil",
    viewArchive: "Voir",
    noArchives: "Aucune archive trouvée pour ce profil.",
    archivesCreatedAutomatically:
      "Les archives sont créées automatiquement lorsque des modifications sont détectées.",
    noProfileSelected: "Aucun profil sélectionné.",
    goToHome: "Aller à l'Accueil",
    backToArchiveList: "Retour à la Liste des Archives",
    storageWarning: "Avertissement stockage: Approche de la limite",
    storageUsage: "Stockage: {used}MB / {max}MB ({count} archives)"
  },
  swa: {
    churchName: "Kanisa La Yesu Kristo <br> La Watakatifu wa Siku za Mwisho",
    sacramentServices: "Huduma za Sakramenti",
    welcomeTo: "Karibu",
    scanProgramQR: "Chagua QR Code ya Mpango",
    useNewQR: "Tumia QR Code Mpya",
    cancel: "Ghairi",
    loading: "Inapakia Mpango...",
    scanNewProgram: "Chagua Mpango Mpya",
    managePrograms: "Dhibiti Programu",
    close: "Funga",
    add: "Ongeza",
    delete: "Futa",
    remove: "Ondoa",
    offlineMode: "Inaonyesha mpango wa mwisho uliopo (hali ya nje ya mtandao)",
    tryNow: "Jaribu Sasa",
    updateAvailable: "Toleo jipya linapatikana.",
    update: "Sasisha",
    reloadProgram: "Pakia Mpango Tena",
    addProgram: "Ongeza Mpango?",
    found: "Imepatikana:",
    noSavedPrograms: "Hakuna programu zilizohifadhiwa",
    lastUpdated: "Imesasishwa mara ya mwisho ",
    presiding: "Mwenyekiti",
    conducting: "Mwenye Kuongoza",
    openingHymn: "Nyimbo ya Kuanza",
    openingPrayer: "Ombi",
    sacramentHymn: "Nyimbo ya Sakramenti",
    speaker: "Mhudhuria",
    intermediateHymn: "Nyimbo ya Kati",
    closingHymn: "Nyimbo ya Mwisho",
    closingPrayer: "Baraka",
    musicDirector: "Mratibu wa Muziki",
    organist: "Mwandishi wa Muziki",
    unableToLoad: "Imeshindwa kupakia mpango.",
    retry: "Jaribu Tena",
    cameraUnavailable: "Ufikiaji wa kamera haupatikani kwenye kivinjari hiki.",
    cameraDenied: "Ufikiaji wa kamera umenguliwa au haupatikani.",
    invalidQR: "QR code batili. Tafadhali chagua QR code ya mpango.",
    scannedUrl: "URL Iliyochokwa:",
    toggleDarkMode: "Badilisha Halati ya Giza",
    selectLanguage: "Chagua Lugha",
    announcements: "Matangazo",
    branchOrStakeBusiness: "Shughuli za Tawi au Mkoa",
    ordinanceOfTheSacrament: "Sakramenti",
    dismissToClass: "Rudi Darasani",
    localLeaders: "Viongozi wa Ndani",
    auxiliaryLeaders: "Viongozi wa Majumba",
    otherLeaders: "Viongozi Wengine",
    ldsApps: "Programu za Kanisa",
    activitiesAndEvents: "Shughuli na Matukio",
    otherInformation: "Taarifa Nyingine",
    sacramentMeetingOnZoom: "Mkutano wa Sakramenti kwenye Zoom",
    generalInformation: "Taarifa za Kawaida",
    hymn: "Wimbo",
    leader: "Mwenyewe",
    at: "saa",
    unknownUnit: "Tawi Lisilojulikana",
    programHistory: "Historia ya Programu",
    noHistory: "Hakuna programu zilizopita",
    loadProgram: "Pakia",
    historyRetainedUntil: "Hifadhiwa mpaka",
    shareProgram: "Shiriki Programu",
    shareInstructions: "Skani QR hii ili kupakia programu kwenye kigogo kingine",
    helpTitle: "Msaada na Maswali",
    programArchives: "Vyandika vya Programu",
    backToHome: "Rudi Nyumbani",
    viewArchive: "Tazama",
    noArchives: "Hakuna vyandika vilivyopatikana kwa wasifu huu.",
    archivesCreatedAutomatically:
      "Vyandika huundwa kiotomatiki inapogunduliwa mabadiliko ya programu.",
    noProfileSelected: "Hakuna wasifu uliochaguliwa.",
    goToHome: "Nenda Nyumbani",
    backToArchiveList: "Rudi kwenye Orodha ya Vyandika",
    storageWarning: "Onyo la hifadhi: Inakaribia kiwango cha juu",
    storageUsage: "Hifadhi: {used}MB / {max}MB ({count} vyandika)"
  }
};

export function initI18n() {
  currentLanguage = getStoredLanguage() || detectBrowserLanguage() || DEFAULT_LANGUAGE;
  loadTranslations(currentLanguage);
  return currentLanguage;
}

function getStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function detectBrowserLanguage() {
  try {
    const browserLang = navigator.language || navigator.userLanguage || navigator.browserLanguage;
    if (!browserLang) return null;

    const langCode = browserLang.split("-")[0].toLowerCase();

    if (langCode === "en") return "en";
    if (langCode === "es") return "es";
    if (langCode === "fr") return "fr";
    if (langCode === "sw") return "swa";

    return null;
  } catch {
    return null;
  }
}

export function loadTranslations(lang) {
  const normalizedLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  try {
    translations = translationsData[normalizedLang] || translationsData[DEFAULT_LANGUAGE];
    currentLanguage = normalizedLang;
    saveLanguagePreference(normalizedLang);
    updateHtmlLangAttribute(normalizedLang);
  } catch (err) {
    console.warn("Failed to load translations for", lang, "- falling back to English:", err);
    translations = translationsData[DEFAULT_LANGUAGE];
    currentLanguage = DEFAULT_LANGUAGE;
  }

  return translations;
}

function saveLanguagePreference(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage not available
  }
}

function updateHtmlLangAttribute(lang) {
  const html = document.documentElement;
  if (html) {
    html.setAttribute("lang", lang);
  }
}

export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn("Unsupported language:", lang);
    return Promise.resolve();
  }
  loadTranslations(lang);
  return Promise.resolve();
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key) {
  if (!translations[key]) {
    console.warn("Missing translation for key:", key);
    return key;
  }
  return translations[key];
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, updateHtmlLangAttribute };

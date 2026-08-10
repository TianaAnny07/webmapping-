export type Language = 'fr' | 'mg';

/**
 * ⚠️ Les traductions malgaches (mg) sont une première version raisonnable,
 * mais n'ont PAS été relues par un locuteur natif. À faire vérifier avant
 * mise en production, en particulier les instructions de navigation
 * (gauche/droite) où une erreur pourrait induire en erreur un utilisateur
 * en train de se déplacer.
 */
export const translations = {
  fr: {
    // Onglets
    tab_map: 'Carte',
    tab_search: 'Rechercher',
    tab_measure: 'Distance',
    tab_profile: 'Profil',

    // Commun
    validate: 'Valider',
    cancel: 'Annuler',
    restart: 'Recommencer',
    close: 'Fermer',
    save: 'Enregistrer',
    loading: 'Chargement…',

    // Profil
    profile_title: 'Mon profil',
    profile_username: "Nom d'utilisateur",
    profile_theme: "Thème de l'application",
    profile_theme_dark: 'Sombre',
    profile_theme_light: 'Clair',
    profile_language: 'Langue',
    profile_password: 'Changer le mot de passe',
    profile_password_placeholder: 'Laisser vide pour ne pas changer',
    profile_password_confirm: 'Répéter le mot de passe',
    profile_logout: 'Déconnexion',
    profile_role_admin: 'Administrateur',
    profile_role_visitor: 'Visiteur',

    // Connexion / Inscription
    login_title: 'Connectez-vous pour continuer',
    login_email: 'Email',
    login_password: 'Mot de passe',
    login_button: 'Se connecter',
    login_no_account: "Pas encore de compte ? ",
    login_register_link: "S'inscrire",
    register_title: 'Créer un compte',
    register_username: "Nom d'utilisateur (optionnel)",
    register_button: "S'inscrire",
    register_have_account: 'Déjà un compte ? ',
    register_login_link: 'Se connecter',

    // Carte / Recherche
    search_placeholder: 'Rechercher un hôpital ou un CSB…',
    search_nearby: 'Près de moi',
    search_all: 'Tous',
    map_legend: 'Légende',
    map_locate: 'Me localiser',

    // Mesure de distance
    measure_title: 'Mesurer une distance',
    measure_point_a: 'Point A',
    measure_point_b: 'Point B',
    measure_placeholder: 'Ville ou établissement…',
    measure_straight_line: "Distance à vol d'oiseau",
    measure_by_route: 'Par la route',
    measure_walking: 'À pied',
    measure_cycling: 'Moto',
    measure_driving: 'Voiture',

    // Navigation
    nav_stop: 'Arrêter la navigation',
    nav_finish: 'Terminer',
    nav_arrived: 'Vous êtes arrivé',
    nav_off_route: "Vous semblez être hors de l'itinéraire prévu",
    nav_recalculate: 'Recalculer',
    nav_start: "Valider l'itinéraire",
  },
  mg: {
    // Onglets
    tab_map: 'Sarintany',
    tab_search: 'Karohy',
    tab_measure: 'Halavirana',
    tab_profile: 'Mombamomba',

    // Commun
    validate: 'Ekeo',
    cancel: 'Aoka',
    restart: 'Averina',
    close: 'Hidiy',
    save: 'Tehirizo',
    loading: 'Miandry…',

    // Profil
    profile_title: 'Mombamomba ahy',
    profile_username: 'Anarana',
    profile_theme: 'Endriky ny rindrankajy',
    profile_theme_dark: 'Maizina',
    profile_theme_light: 'Mazava',
    profile_language: 'Fiteny',
    profile_password: 'Ovay ny teny miafina',
    profile_password_placeholder: 'Avelao maty raha tsy ovaina',
    profile_password_confirm: 'Averino ny teny miafina',
    profile_logout: 'Hivoaka',
    profile_role_admin: 'Mpitantana',
    profile_role_visitor: 'Mpitsidika',

    // Connexion / Inscription
    login_title: 'Midira mba hanohy',
    login_email: 'Mailaka',
    login_password: 'Teny miafina',
    login_button: 'Hiditra',
    login_no_account: 'Mbola tsy manana kaonty? ',
    login_register_link: 'Hisoratra anarana',
    register_title: 'Mamorona kaonty',
    register_username: 'Anarana (tsy voatery)',
    register_button: 'Hisoratra anarana',
    register_have_account: 'Manana kaonty efa? ',
    register_login_link: 'Hiditra',

    // Carte / Recherche
    search_placeholder: 'Karohy hopitaly na CSB…',
    search_nearby: 'Akaiky ahy',
    search_all: 'Rehetra',
    map_legend: 'Famaritana',
    map_locate: 'Aiza aho',

    // Mesure de distance
    measure_title: 'Mandrefy halavirana',
    measure_point_a: 'Teboka A',
    measure_point_b: 'Teboka B',
    measure_placeholder: 'Tanàna na toby fahasalamana…',
    measure_straight_line: "Halavirana mahitsy",
    measure_by_route: "Amin'ny lalana",
    measure_walking: 'An-tongotra',
    measure_cycling: 'Môtô',
    measure_driving: 'Fiara',

    // Navigation
    nav_stop: 'Ajanony ny fitarihana',
    nav_finish: 'Vita',
    nav_arrived: 'Tonga ianao',
    nav_off_route: 'Toa tsy amin\'ny lalana voafaritra ianao',
    nav_recalculate: 'Averina kajy',
    nav_start: "Ekeo ny lalana",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;
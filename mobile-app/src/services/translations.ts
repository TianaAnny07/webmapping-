export type Language = 'fr' | 'mg';


export const translations = {
  fr: {
    // Marque
    brand_name: 'Santé Madagascar',

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
    ok: 'OK',
    ok_confirm: 'OK',
    km_h: 'km/h',

    // Connexion
    login_title: 'Connectez-vous pour continuer',
    login_email: 'Email',
    login_password: 'Mot de passe',
    login_button: 'Se connecter',
    login_no_account: 'Pas encore de compte ? ',
    login_register_link: "S'inscrire",
    login_error_empty: 'Veuillez renseigner votre email et votre mot de passe.',
    login_error_network: "Impossible de joindre le serveur. Vérifiez que le backend tourne et que l'adresse IP dans api.ts est correcte.",
    login_error_invalid: 'Connexion impossible. Vérifiez vos identifiants.',

    // Inscription
    register_title: 'Créer un compte',
    register_username: "Nom d'utilisateur (optionnel)",
    register_confirm_password: 'Confirmer le mot de passe',
    register_button: "S'inscrire",
    register_have_account: 'Déjà un compte ? ',
    register_login_link: 'Se connecter',
    register_error_required: 'Email et mot de passe sont obligatoires.',
    register_error_mismatch: 'Les mots de passe ne correspondent pas.',
    register_error_failed: 'Inscription impossible.',
    register_success_title: 'Compte créé',
    register_success_message: 'Votre compte a bien été créé. Connectez-vous pour continuer.',

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
    profile_logout_confirm: 'Voulez-vous vraiment vous déconnecter ?',
    profile_role_admin: 'Administrateur',
    profile_role_visitor: 'Visiteur',
    profile_error_mismatch: 'Les mots de passe ne correspondent pas.',
    profile_error_failed: 'Mise à jour impossible.',
    profile_success_title: 'Profil mis à jour',
    profile_success_message: 'Vos informations ont bien été enregistrées.',
    profile_placeholder_username: 'Votre nom',

    // Carte / Recherche
    search_placeholder: 'Rechercher un hôpital ou un CSB…',
    search_placeholder_map: 'Rechercher un hôpital ou un CSB sur la carte…',
    search_nearby: 'Près de moi',
    search_all: 'Tous',
    search_error_geo: 'Activez la géolocalisation pour voir les établissements les plus proches.',
    search_error_network: 'Recherche indisponible. Vérifiez votre connexion.',
    search_empty: 'Aucun établissement trouvé.',
    map_legend: 'Légende',
    map_legend_title: 'Légende de la carte',
    map_locate: 'Me localiser',

    // Mesure de distance
    measure_title: 'Mesurer une distance',
    measure_point_a: 'Point A',
    measure_point_b: 'Point B',
    measure_placeholder: 'Ville ou établissement…',
    measure_status_a: 'Tapez un nom ou touchez la carte pour placer le point A.',
    measure_status_b: 'Tapez un nom ou touchez la carte pour placer le point B.',
    measure_status_confirm: 'Appuyez sur "Valider" pour afficher la distance sur la carte.',
    measure_status_done: 'Distance affichée sur la carte. Choisissez un mode pour la distance réelle.',
    measure_straight_line: "Distance à vol d'oiseau",
    measure_by_route: 'Par la route',
    measure_walking: 'À pied',
    measure_cycling: 'Moto',
    measure_driving: 'Voiture',
    measure_calculating: "Calcul de l'itinéraire…",
    measure_error: "Impossible de calculer l'itinéraire pour le moment.",
    measure_place_label: 'Ville / lieu',

    // Fiche établissement
    facility_beds: 'Lits',
    facility_staff: 'Personnel',
    facility_accessibility: 'Accessibilité',
    facility_access_high: 'Haute',
    facility_access_medium: 'Moyenne',
    facility_access_low: 'Faible',
    facility_status: 'Statut',
    facility_status_operational: 'Opérationnel',
    facility_status_limited: 'Service limité',
    facility_status_closed: 'Fermé',
    facility_itinerary_section: 'Itinéraire',
    facility_preview_hint: 'Estimation basée sur une vitesse moyenne de',
    facility_preview_hint_end: "km/h. Vérifiez le trajet puis validez pour démarrer la navigation guidée (avec instructions vocales).",
    facility_route_recommended: 'Recommandé',
    facility_route_shortest: 'Le plus court',
    facility_validate_route: "Valider l'itinéraire",
    facility_on_duty: 'Pharmacie de garde',
    facility_no_info: 'Aucune information supplémentaire renseignée pour cet établissement.',

    // Navigation active
    nav_stop: 'Arrêter la navigation',
    nav_finish: 'Terminer',
    nav_arrived: 'Vous êtes arrivé',
    nav_off_route: "Vous semblez être hors de l'itinéraire prévu",
    nav_off_route_voice: "Attention, vous semblez être hors de l'itinéraire prévu.",
    nav_arrived_voice: 'Vous êtes arrivé à destination.',
    nav_thanks_voice: 'Merci pour votre confiance pour le guidage.',
    nav_recalculate: 'Recalculer',
    nav_start: "Valider l'itinéraire",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;
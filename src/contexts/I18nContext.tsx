import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@swissnovo/shared';

/**
 * Translation table for the room UI. Each key resolves to the matching
 * string in the active locale; missing keys fall back to English.
 *
 * Grouping convention:
 *   - nav.*              top navbar (search, exports, language)
 *   - panel.basemap.*    basemap switcher (MapControls)
 *   - panel.layers.*     opacity sliders & 3D toggle
 *   - panel.zoom.*       zoom/compass control
 *   - panel.info.*       parcel info panel (ZoneInfoPanel sections, fields)
 *   - panel.zone.*       zone distribution panel (ZonePanel + charts)
 *   - panel.images.*     "My Exports" gallery modal
 *   - panel.screenshot.* the capture button & overlay & toast
 *   - panel.tabs.*       right-side info pane tabs (Zone distribution / Parcel facts)
 *   - menu.*             user menu (sign in / sign out / view profile / active)
 *   - modal.location.*   location permission modal
 *   - map.locate.*       geolocation errors and toasts
 *   - prm.*              PRM save/track buttons
 *   - modal.parcels.*    saved parcels modal action labels
 *   - chart.*            chart axis labels, "You are here", tooltips
 *   - tour.*             onboarding tour (TourHelpButton + tour.config steps)
 *   - error.*            generic error strings
 *
 * The translator supports `{placeholder}` interpolation, e.g.
 *   t('panel.images.showing_latest', { visible: 3, total: 12 })
 */
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // ---------- navbar ----------
    'nav.search_placeholder': 'Search addresses in Switzerland...',
    'nav.searching': 'Searching…',
    'nav.my_exports': 'My Exports',
    'nav.select_language': 'Select language',

    // ---------- basemap switcher (MapControls) ----------
    'panel.basemap.fallback': 'Basemap',
    'panel.basemap.dark': 'Dark',
    'panel.basemap.streets': 'Streets',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite Streets',
    'panel.basemap.light': 'Light',
    'panel.basemap.outdoors': 'Outdoors',
    'panel.basemap.navigation_day': 'Navigation Day',
    'panel.basemap.navigation_night': 'Navigation Night',

    // ---------- opacity sliders + 3D toggle (MapControls) ----------
    'panel.layers.parcel': 'Parcel',
    'panel.layers.building': 'Building',
    'panel.layers.3d_view': '3D View',

    // ---------- ZoomControl ----------
    'panel.zoom.in': 'Zoom in',
    'panel.zoom.out': 'Zoom out',
    'panel.zoom.reset_north': 'Reset bearing to north',

    // ---------- right-side info pane tabs ----------
    'panel.tabs.zone_distribution': 'Zone distribution',
    'panel.tabs.parcel_facts': 'Parcel facts',

    // ---------- ZoneInfoPanel — sections & rows ----------
    'panel.info.title': 'Parcel Information',
    'panel.info.toggle_raw_json': 'Toggle raw JSON',
    'panel.info.close': 'Close',
    'panel.info.failed_to_load': 'Failed to load data',
    'panel.info.section.location': 'Location',
    'panel.info.section.zoning': 'Zoning',
    'panel.info.section.built': 'Built',
    'panel.info.section.age': 'Age',
    'panel.info.row.municipality': 'Municipality',
    'panel.info.row.fso': 'FSO',
    'panel.info.row.egrid': 'EGRID',
    'panel.info.row.cz_local': 'CZ Local',
    'panel.info.row.cz_canton': 'CZ Canton',
    'panel.info.row.allowed_util': 'Allowed util.',
    'panel.info.row.parcel_area': 'Parcel area',
    'panel.info.row.built_volume': 'Built volume',
    'panel.info.row.gfz': 'GFZ',
    'panel.info.row.height': 'Height',
    'panel.info.row.floors': 'Floors',
    'panel.info.row.year_built': 'Year built',
    'panel.info.ratio_v.label': 'ratioV (volume utilisation)',
    'panel.info.ratio_v.no_reference': 'No reference allowed-utilisation for this zone.',
    'panel.info.ratio_s.label': 'ratioS (site coverage)',
    'panel.info.no_data_for_parcel': 'No data for this parcel.',
    'panel.info.free_v.label': 'freeV (headroom)',
    'panel.info.free_v.positive': 'Allowed volume remaining.',
    'panel.info.free_v.negative': 'Built volume exceeds allowance.',

    // ---------- ZonePanel — zone selector, tabs, errors ----------
    'panel.zone.parcels_suffix': '{count} parcels',
    'panel.zone.zoning_category': 'Zoning category',
    'panel.zone.filter_zones_placeholder': 'Filter zones…',
    'panel.zone.no_matching_zones': 'No matching zones.',
    'panel.zone.tab.distributions': 'Distributions',
    'panel.zone.tab.scatter': 'Area vs. volume',
    'panel.zone.error_title': 'Could not load zone statistics',
    'panel.zone.error_generic': 'Failed to load zone stats.',
    'panel.zone.metric.ratio_v.title': 'ratioV (volume use)',
    'panel.zone.metric.free_v.title': 'freeV (headroom)',
    'panel.zone.metric.ratio_s.title': 'ratioS (site coverage)',
    'panel.zone.metric.gfz.title': 'GFZ (floor area)',
    'panel.zone.metric.bldg_height.title': 'Building height',
    'panel.zone.metric.bldg_floors.title': 'Number of floors',
    'panel.zone.boxplot_title': 'ratioV — zone distribution',
    'panel.zone.not_enough_data': 'Not enough data for this zone.',
    'panel.zone.no_data': 'No data for this zone.',
    'panel.zone.percentile_title': 'Zone utilisation percentile',
    'panel.zone.percentile_label': 'percentile',
    'panel.zone.gauge_aria': 'Percentile gauge',
    'panel.zone.over_time_title': 'Utilisation over time',
    'panel.zone.over_time_no_data': 'Not enough cohort data for this zone.',
    'panel.zone.scatter_title': 'Parcel area vs. built volume',
    'panel.zone.scatter_no_data': 'No parcels available for this zone.',
    'panel.zone.scatter_axis_area': 'Parcel area (m²)',
    'panel.zone.scatter_you_prefix': 'You: {area} m² / {volume} m³',
    'panel.zone.chart_you': 'You',
    'panel.zone.chart_you_prefix': 'You: {value}',
    'panel.zone.tooltip_count_one': '{count} parcel',
    'panel.zone.tooltip_count_other': '{count} parcels',
    'panel.zone.tooltip_count_label': 'Count',
    'panel.zone.cohort_tooltip': 'mean ratioV {value} (n={n})',
    'panel.zone.cohort_label': 'Cohort',
    'panel.zone.summary_line': 'n={n} · p50 {p50} · mean {mean}',

    // ---------- "My Exports" modal (SavedImagesPanel) ----------
    'panel.images.title': 'My Exports',
    'panel.images.see_all_in_showroom': 'See all publications in Showroom',
    'panel.images.refresh': 'Refresh',
    'panel.images.close': 'Close',
    'panel.images.close_preview': 'Close preview',
    'panel.images.delete': 'Delete',
    'panel.images.open': 'Open',
    'panel.images.try_again': 'Try again',
    'panel.images.empty_title': 'No images saved yet',
    'panel.images.empty_hint': 'Use the camera button in the top bar to capture and save the current view.',
    'panel.images.failed_to_load': 'Failed to load images',
    'panel.images.failed_to_delete': 'Failed to delete image',
    'panel.images.delete_confirm': 'Delete this saved image? This cannot be undone.',
    'panel.images.showing_latest': 'Showing latest {visible} of {total}.',
    'panel.images.more_in_showroom_one': '{count} more export available in Showroom.',
    'panel.images.more_in_showroom_other': '{count} more exports available in Showroom.',
    'panel.images.additional_metadata': 'Additional metadata',
    'panel.images.tilt_prefix': 'Tilt {value}',
    'panel.images.meta.app': 'App',
    'panel.images.meta.saved': 'Saved',
    'panel.images.meta.dimensions': 'Dimensions',
    'panel.images.meta.size': 'Size',
    'panel.images.meta.address': 'Address',
    'panel.images.meta.center': 'Center',
    'panel.images.meta.parcel_id': 'Parcel ID',
    'panel.images.meta.egrid': 'EGRID',
    'panel.images.meta.tilt': 'Tilt',
    'panel.images.meta.bearing': 'Bearing',
    'panel.images.meta.zoom': 'Zoom',
    'panel.images.meta.basemap': 'Basemap',
    'panel.images.meta.3d_mode': '3D mode',
    'panel.images.meta.on': 'On',
    'panel.images.meta.off': 'Off',

    // ---------- ScreenshotButton ----------
    'panel.screenshot.save_image': 'Save image',
    'panel.screenshot.sign_in_to_save': 'Sign in to save an image',
    'panel.screenshot.creating_image': 'Creating image.',
    'panel.screenshot.image_saved': 'Image saved',
    'panel.screenshot.view_image': 'View image',
    'panel.screenshot.dismiss': 'Dismiss',
    'panel.screenshot.failed': 'Failed to save image',

    // ---------- user menu ----------
    'menu.sign_in': 'Sign in',
    'menu.sign_out': 'Sign out',
    'menu.view_profile': 'View profile',
    'menu.my_saved_parcels': 'My saved parcels',
    'menu.active': 'Active',
    'menu.fallback_user': 'User',

    // ---------- PRM save button (shared semantics) ----------
    'prm.save': 'Save to PRM',
    'prm.saving': 'Saving…',
    'prm.saved': 'Saved to PRM',
    'prm.open_in_proom': 'Open in proom',
    'prm.signin_required': 'Sign in to save parcels',
    'prm.save_failed': 'Could not save — try again',

    // ---------- SavedParcelsModal "open here" action ----------
    'modal.parcels.open_here': 'Open here',

    // ---------- location permission modal ----------
    'modal.location.title': 'Enable location access',
    'modal.location.body': 'Allow room to use your location to center the map on your current position. This helps you find nearby parcels and buildings faster.',
    'modal.location.privacy': 'Your location is only used locally and never stored.',
    'modal.location.not_now': 'Not now',
    'modal.location.allow': 'Allow location',

    // ---------- LocateButton + geolocation errors / toasts ----------
    'map.locate.button': 'Locate me',
    'map.locate.moved': 'Moved to your current location.',
    'map.locate.not_supported': 'Geolocation is not supported by your browser.',
    'map.locate.permission_denied': 'Location access was denied. Please enable location permissions in your browser settings.',
    'map.locate.unavailable': 'Your location could not be determined. Please try again.',
    'map.locate.timeout': 'Location request timed out. Please try again.',
    'map.locate.unknown': 'An unexpected error occurred while retrieving your location.',

    // ---------- onboarding tour ----------
    'tour.help_button': 'Help',
    'tour.short_label': 'Quick tour',
    'tour.long_label': 'Take the tour',
    'tour.next': 'Next',
    'tour.back': 'Back',
    'tour.skip': 'Skip',
    'tour.done': 'Done',
    'tour.step_of': 'Step {index} of {total}',
    'tour.welcome.title': 'Welcome to room',
    'tour.welcome.body': 'See how densely built any Swiss zone actually is — and where the selected parcel sits on the distribution.',
    'tour.search.title': 'Find any address',
    'tour.search.body': 'Search for any Swiss address. The map flies there and selects the matching parcel.',
    'tour.map.title': 'Density at a glance',
    'tour.map.body': 'Click any parcel. The map then shades every other parcel in the same zone by its utilisation percentile — light to dark.',
    'tour.parcel_facts.title': 'Parcel facts',
    'tour.parcel_facts.body': 'Municipality, zoning category, parcel area, existing volume, year built, ratioV, freeV — all for the parcel you clicked.',
    'tour.zone_switcher.title': 'Compare other zones',
    'tour.zone_switcher.body': "room auto-selects this parcel's own zoning category. Switch to any other zone in the same municipality to compare.",
    'tour.charts.title': 'Where you stand',
    'tour.charts.body': 'Boxplot, six distribution histograms, a percentile gauge, a time-evolution line, and a parcel-area-vs-volume scatter — each marks the selected parcel.',
    'tour.layers.title': 'Tune the view',
    'tour.layers.body': 'Switch basemaps, adjust parcel and building opacity, or flip on the 3D building view.',
    'tour.tools.title': 'Locate & capture',
    'tour.tools.body': 'Jump to your location, or capture the map and its density overlay for reports and exports.',
    'tour.help.title': 'Restart anytime',
    'tour.help.body': 'You can replay this tour at any moment from this Help button.',

    // ---------- generic errors ----------
    'error.no_egrid': 'No EGRID available for this parcel',
    'error.unknown': 'Unknown error',

    // ---------- density legend (map) ----------
    'legend.title': 'Zone density',
    'legend.metric': 'utilisation',
    'legend.median': 'median',
    'legend.you': 'This parcel — {value} of allowance built',
    'legend.allowance_hint': '100% = built to the zone allowance',
    'legend.allowance_tooltip': '100% — built to the zone allowance',
  },
  fr: {
    // ---------- navbar ----------
    'nav.search_placeholder': 'Rechercher des adresses en Suisse...',
    'nav.searching': 'Recherche…',
    'nav.my_exports': 'Mes exports',
    'nav.select_language': 'Sélectionner la langue',

    // ---------- basemap ----------
    'panel.basemap.fallback': 'Fond de carte',
    'panel.basemap.dark': 'Sombre',
    'panel.basemap.streets': 'Rues',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite avec rues',
    'panel.basemap.light': 'Clair',
    'panel.basemap.outdoors': 'Plein air',
    'panel.basemap.navigation_day': 'Navigation (jour)',
    'panel.basemap.navigation_night': 'Navigation (nuit)',

    // ---------- layers ----------
    'panel.layers.parcel': 'Parcelle',
    'panel.layers.building': 'Bâtiment',
    'panel.layers.3d_view': 'Vue 3D',

    // ---------- zoom ----------
    'panel.zoom.in': 'Zoomer',
    'panel.zoom.out': 'Dézoomer',
    'panel.zoom.reset_north': 'Réinitialiser l’orientation au nord',

    // ---------- tabs ----------
    'panel.tabs.zone_distribution': 'Distribution de zone',
    'panel.tabs.parcel_facts': 'Faits de la parcelle',

    // ---------- ZoneInfoPanel ----------
    'panel.info.title': 'Informations de la parcelle',
    'panel.info.toggle_raw_json': 'Afficher/masquer le JSON brut',
    'panel.info.close': 'Fermer',
    'panel.info.failed_to_load': 'Échec du chargement des données',
    'panel.info.section.location': 'Localisation',
    'panel.info.section.zoning': 'Zonage',
    'panel.info.section.built': 'Bâti',
    'panel.info.section.age': 'Âge',
    'panel.info.row.municipality': 'Commune',
    'panel.info.row.fso': 'OFS',
    'panel.info.row.egrid': 'EGRID',
    'panel.info.row.cz_local': 'Zone locale',
    'panel.info.row.cz_canton': 'Zone cantonale',
    'panel.info.row.allowed_util': 'Util. autorisée',
    'panel.info.row.parcel_area': 'Surface de la parcelle',
    'panel.info.row.built_volume': 'Volume bâti',
    'panel.info.row.gfz': 'GFZ',
    'panel.info.row.height': 'Hauteur',
    'panel.info.row.floors': 'Étages',
    'panel.info.row.year_built': 'Année de construction',
    'panel.info.ratio_v.label': 'ratioV (utilisation du volume)',
    'panel.info.ratio_v.no_reference': 'Aucune utilisation autorisée de référence pour cette zone.',
    'panel.info.ratio_s.label': 'ratioS (emprise au sol)',
    'panel.info.no_data_for_parcel': 'Aucune donnée pour cette parcelle.',
    'panel.info.free_v.label': 'freeV (marge)',
    'panel.info.free_v.positive': 'Volume autorisé restant.',
    'panel.info.free_v.negative': 'Le volume bâti dépasse l’autorisation.',

    // ---------- ZonePanel ----------
    'panel.zone.parcels_suffix': '{count} parcelles',
    'panel.zone.zoning_category': 'Catégorie de zone',
    'panel.zone.filter_zones_placeholder': 'Filtrer les zones…',
    'panel.zone.no_matching_zones': 'Aucune zone correspondante.',
    'panel.zone.tab.distributions': 'Distributions',
    'panel.zone.tab.scatter': 'Surface vs. volume',
    'panel.zone.error_title': 'Impossible de charger les statistiques de zone',
    'panel.zone.error_generic': 'Échec du chargement des statistiques de zone.',
    'panel.zone.metric.ratio_v.title': 'ratioV (utilisation du volume)',
    'panel.zone.metric.free_v.title': 'freeV (marge)',
    'panel.zone.metric.ratio_s.title': 'ratioS (emprise au sol)',
    'panel.zone.metric.gfz.title': 'GFZ (surface de plancher)',
    'panel.zone.metric.bldg_height.title': 'Hauteur du bâtiment',
    'panel.zone.metric.bldg_floors.title': 'Nombre d’étages',
    'panel.zone.boxplot_title': 'ratioV — distribution de la zone',
    'panel.zone.not_enough_data': 'Pas assez de données pour cette zone.',
    'panel.zone.no_data': 'Aucune donnée pour cette zone.',
    'panel.zone.percentile_title': 'Percentile d’utilisation de la zone',
    'panel.zone.percentile_label': 'percentile',
    'panel.zone.gauge_aria': 'Jauge de percentile',
    'panel.zone.over_time_title': 'Utilisation dans le temps',
    'panel.zone.over_time_no_data': 'Pas assez de données de cohorte pour cette zone.',
    'panel.zone.scatter_title': 'Surface de la parcelle vs. volume bâti',
    'panel.zone.scatter_no_data': 'Aucune parcelle disponible pour cette zone.',
    'panel.zone.scatter_axis_area': 'Surface de la parcelle (m²)',
    'panel.zone.scatter_you_prefix': 'Vous : {area} m² / {volume} m³',
    'panel.zone.chart_you': 'Vous',
    'panel.zone.chart_you_prefix': 'Vous : {value}',
    'panel.zone.tooltip_count_one': '{count} parcelle',
    'panel.zone.tooltip_count_other': '{count} parcelles',
    'panel.zone.tooltip_count_label': 'Nombre',
    'panel.zone.cohort_tooltip': 'ratioV moyen {value} (n={n})',
    'panel.zone.cohort_label': 'Cohorte',
    'panel.zone.summary_line': 'n={n} · p50 {p50} · moyenne {mean}',

    // ---------- exports modal ----------
    'panel.images.title': 'Mes exports',
    'panel.images.see_all_in_showroom': 'Voir toutes les publications dans Showroom',
    'panel.images.refresh': 'Actualiser',
    'panel.images.close': 'Fermer',
    'panel.images.close_preview': 'Fermer l’aperçu',
    'panel.images.delete': 'Supprimer',
    'panel.images.open': 'Ouvrir',
    'panel.images.try_again': 'Réessayer',
    'panel.images.empty_title': 'Aucune image enregistrée',
    'panel.images.empty_hint': 'Utilisez le bouton appareil photo dans la barre supérieure pour capturer et enregistrer la vue actuelle.',
    'panel.images.failed_to_load': 'Échec du chargement des images',
    'panel.images.failed_to_delete': 'Échec de la suppression de l’image',
    'panel.images.delete_confirm': 'Supprimer cette image enregistrée ? Cette action est irréversible.',
    'panel.images.showing_latest': 'Affichage des {visible} plus récents sur {total}.',
    'panel.images.more_in_showroom_one': '{count} export supplémentaire disponible dans Showroom.',
    'panel.images.more_in_showroom_other': '{count} exports supplémentaires disponibles dans Showroom.',
    'panel.images.additional_metadata': 'Métadonnées supplémentaires',
    'panel.images.tilt_prefix': 'Inclinaison {value}',
    'panel.images.meta.app': 'Application',
    'panel.images.meta.saved': 'Enregistré',
    'panel.images.meta.dimensions': 'Dimensions',
    'panel.images.meta.size': 'Taille',
    'panel.images.meta.address': 'Adresse',
    'panel.images.meta.center': 'Centre',
    'panel.images.meta.parcel_id': 'ID de parcelle',
    'panel.images.meta.egrid': 'EGRID',
    'panel.images.meta.tilt': 'Inclinaison',
    'panel.images.meta.bearing': 'Orientation',
    'panel.images.meta.zoom': 'Zoom',
    'panel.images.meta.basemap': 'Fond de carte',
    'panel.images.meta.3d_mode': 'Mode 3D',
    'panel.images.meta.on': 'Activé',
    'panel.images.meta.off': 'Désactivé',

    // ---------- screenshot ----------
    'panel.screenshot.save_image': 'Enregistrer l’image',
    'panel.screenshot.sign_in_to_save': 'Connectez-vous pour enregistrer une image',
    'panel.screenshot.creating_image': 'Création de l’image.',
    'panel.screenshot.image_saved': 'Image enregistrée',
    'panel.screenshot.view_image': 'Voir l’image',
    'panel.screenshot.dismiss': 'Rejeter',
    'panel.screenshot.failed': 'Échec de l’enregistrement de l’image',

    // ---------- user menu ----------
    'menu.sign_in': 'Se connecter',
    'menu.sign_out': 'Se déconnecter',
    'menu.view_profile': 'Voir le profil',
    'menu.my_saved_parcels': 'Mes parcelles enregistrées',
    'menu.active': 'Actif',
    'menu.fallback_user': 'Utilisateur',

    // ---------- PRM ----------
    'prm.save': 'Enregistrer dans le PRM',
    'prm.saving': 'Enregistrement…',
    'prm.saved': 'Enregistré dans le PRM',
    'prm.open_in_proom': 'Ouvrir dans proom',
    'prm.signin_required': 'Connectez-vous pour enregistrer',
    'prm.save_failed': 'Échec — réessayez',

    'modal.parcels.open_here': 'Ouvrir ici',

    // ---------- location modal ----------
    'modal.location.title': 'Activer l’accès à la position',
    'modal.location.body': 'Autorisez room à utiliser votre position pour centrer la carte sur votre emplacement actuel. Cela vous aide à trouver plus rapidement les parcelles et bâtiments voisins.',
    'modal.location.privacy': 'Votre position est utilisée uniquement localement et n’est jamais enregistrée.',
    'modal.location.not_now': 'Pas maintenant',
    'modal.location.allow': 'Autoriser la position',

    // ---------- geolocation ----------
    'map.locate.button': 'Me localiser',
    'map.locate.moved': 'Déplacé vers votre position actuelle.',
    'map.locate.not_supported': 'La géolocalisation n’est pas prise en charge par votre navigateur.',
    'map.locate.permission_denied': 'L’accès à la position a été refusé. Veuillez activer les autorisations de localisation dans les paramètres de votre navigateur.',
    'map.locate.unavailable': 'Votre position n’a pas pu être déterminée. Veuillez réessayer.',
    'map.locate.timeout': 'La demande de position a expiré. Veuillez réessayer.',
    'map.locate.unknown': 'Une erreur inattendue est survenue lors de la récupération de votre position.',

    // ---------- tour ----------
    'tour.help_button': 'Aide',
    'tour.short_label': 'Visite rapide',
    'tour.long_label': 'Faire la visite',
    'tour.next': 'Suivant',
    'tour.back': 'Retour',
    'tour.skip': 'Passer',
    'tour.done': 'Terminé',
    'tour.step_of': 'Étape {index} sur {total}',
    'tour.welcome.title': 'Bienvenue dans room',
    'tour.welcome.body': 'Découvrez la densité bâtie de n’importe quelle zone suisse — et où se situe la parcelle sélectionnée dans la distribution.',
    'tour.search.title': 'Trouver une adresse',
    'tour.search.body': 'Recherchez n’importe quelle adresse suisse. La carte s’y rend et sélectionne la parcelle correspondante.',
    'tour.map.title': 'La densité en un coup d’œil',
    'tour.map.body': 'Cliquez sur une parcelle. La carte ombre alors toutes les autres parcelles de la même zone selon leur percentile d’utilisation — du clair au foncé.',
    'tour.parcel_facts.title': 'Faits de la parcelle',
    'tour.parcel_facts.body': 'Commune, catégorie de zone, surface de la parcelle, volume existant, année de construction, ratioV, freeV — tout pour la parcelle cliquée.',
    'tour.zone_switcher.title': 'Comparer d’autres zones',
    'tour.zone_switcher.body': 'room sélectionne automatiquement la catégorie de zone de cette parcelle. Passez à n’importe quelle autre zone de la même commune pour comparer.',
    'tour.charts.title': 'Où vous vous situez',
    'tour.charts.body': 'Boîte à moustaches, six histogrammes de distribution, une jauge de percentile, une ligne d’évolution et un nuage de points surface-volume — chacun marque la parcelle sélectionnée.',
    'tour.layers.title': 'Ajuster la vue',
    'tour.layers.body': 'Changez de fond de carte, ajustez l’opacité des parcelles et des bâtiments, ou activez la vue 3D des bâtiments.',
    'tour.tools.title': 'Localiser & capturer',
    'tour.tools.body': 'Allez à votre position, ou capturez la carte et son aperçu de densité pour vos rapports et exports.',
    'tour.help.title': 'Recommencer à tout moment',
    'tour.help.body': 'Vous pouvez rejouer cette visite à tout moment depuis ce bouton d’aide.',

    // ---------- errors ----------
    'error.no_egrid': 'Aucun EGRID disponible pour cette parcelle',
    'error.unknown': 'Erreur inconnue',

    // ---------- légende de densité (carte) ----------
    'legend.title': 'Densité de la zone',
    'legend.metric': 'utilisation',
    'legend.median': 'médiane',
    'legend.you': 'Cette parcelle — {value} de l’indice utilisé',
    'legend.allowance_hint': '100 % = construit selon l’indice de la zone',
    'legend.allowance_tooltip': '100 % — construit selon l’indice autorisé',
  },
  de: {
    // ---------- navbar ----------
    'nav.search_placeholder': 'Adressen in der Schweiz suchen...',
    'nav.searching': 'Suche…',
    'nav.my_exports': 'Meine Exporte',
    'nav.select_language': 'Sprache wählen',

    // ---------- basemap ----------
    'panel.basemap.fallback': 'Grundkarte',
    'panel.basemap.dark': 'Dunkel',
    'panel.basemap.streets': 'Strassen',
    'panel.basemap.satellite': 'Satellit',
    'panel.basemap.satellite_streets': 'Satellit mit Strassen',
    'panel.basemap.light': 'Hell',
    'panel.basemap.outdoors': 'Outdoor',
    'panel.basemap.navigation_day': 'Navigation (Tag)',
    'panel.basemap.navigation_night': 'Navigation (Nacht)',

    // ---------- layers ----------
    'panel.layers.parcel': 'Parzelle',
    'panel.layers.building': 'Gebäude',
    'panel.layers.3d_view': '3D-Ansicht',

    // ---------- zoom ----------
    'panel.zoom.in': 'Vergrössern',
    'panel.zoom.out': 'Verkleinern',
    'panel.zoom.reset_north': 'Ausrichtung nach Norden zurücksetzen',

    // ---------- tabs ----------
    'panel.tabs.zone_distribution': 'Zonenverteilung',
    'panel.tabs.parcel_facts': 'Parzellen-Fakten',

    // ---------- ZoneInfoPanel ----------
    'panel.info.title': 'Parzelleninformationen',
    'panel.info.toggle_raw_json': 'Rohes JSON ein-/ausblenden',
    'panel.info.close': 'Schliessen',
    'panel.info.failed_to_load': 'Daten konnten nicht geladen werden',
    'panel.info.section.location': 'Standort',
    'panel.info.section.zoning': 'Zonierung',
    'panel.info.section.built': 'Bebauung',
    'panel.info.section.age': 'Alter',
    'panel.info.row.municipality': 'Gemeinde',
    'panel.info.row.fso': 'BFS',
    'panel.info.row.egrid': 'EGRID',
    'panel.info.row.cz_local': 'Lokale Zone',
    'panel.info.row.cz_canton': 'Kantonale Zone',
    'panel.info.row.allowed_util': 'Zul. Nutzung',
    'panel.info.row.parcel_area': 'Parzellenfläche',
    'panel.info.row.built_volume': 'Bauvolumen',
    'panel.info.row.gfz': 'GFZ',
    'panel.info.row.height': 'Höhe',
    'panel.info.row.floors': 'Geschosse',
    'panel.info.row.year_built': 'Baujahr',
    'panel.info.ratio_v.label': 'ratioV (Volumenausnutzung)',
    'panel.info.ratio_v.no_reference': 'Keine zulässige Ausnutzung als Referenz für diese Zone.',
    'panel.info.ratio_s.label': 'ratioS (Überbauungsgrad)',
    'panel.info.no_data_for_parcel': 'Keine Daten für diese Parzelle.',
    'panel.info.free_v.label': 'freeV (Reserve)',
    'panel.info.free_v.positive': 'Verbleibendes zulässiges Volumen.',
    'panel.info.free_v.negative': 'Bauvolumen überschreitet die zulässige Menge.',

    // ---------- ZonePanel ----------
    'panel.zone.parcels_suffix': '{count} Parzellen',
    'panel.zone.zoning_category': 'Zonenkategorie',
    'panel.zone.filter_zones_placeholder': 'Zonen filtern…',
    'panel.zone.no_matching_zones': 'Keine passenden Zonen.',
    'panel.zone.tab.distributions': 'Verteilungen',
    'panel.zone.tab.scatter': 'Fläche vs. Volumen',
    'panel.zone.error_title': 'Zonen-Statistiken konnten nicht geladen werden',
    'panel.zone.error_generic': 'Laden der Zonen-Statistiken fehlgeschlagen.',
    'panel.zone.metric.ratio_v.title': 'ratioV (Volumenausnutzung)',
    'panel.zone.metric.free_v.title': 'freeV (Reserve)',
    'panel.zone.metric.ratio_s.title': 'ratioS (Überbauungsgrad)',
    'panel.zone.metric.gfz.title': 'GFZ (Geschossfläche)',
    'panel.zone.metric.bldg_height.title': 'Gebäudehöhe',
    'panel.zone.metric.bldg_floors.title': 'Anzahl Geschosse',
    'panel.zone.boxplot_title': 'ratioV — Zonenverteilung',
    'panel.zone.not_enough_data': 'Nicht genug Daten für diese Zone.',
    'panel.zone.no_data': 'Keine Daten für diese Zone.',
    'panel.zone.percentile_title': 'Zonennutzungs-Perzentil',
    'panel.zone.percentile_label': 'Perzentil',
    'panel.zone.gauge_aria': 'Perzentil-Anzeige',
    'panel.zone.over_time_title': 'Nutzung im Zeitverlauf',
    'panel.zone.over_time_no_data': 'Nicht genug Kohortendaten für diese Zone.',
    'panel.zone.scatter_title': 'Parzellenfläche vs. Bauvolumen',
    'panel.zone.scatter_no_data': 'Keine Parzellen für diese Zone verfügbar.',
    'panel.zone.scatter_axis_area': 'Parzellenfläche (m²)',
    'panel.zone.scatter_you_prefix': 'Sie: {area} m² / {volume} m³',
    'panel.zone.chart_you': 'Sie',
    'panel.zone.chart_you_prefix': 'Sie: {value}',
    'panel.zone.tooltip_count_one': '{count} Parzelle',
    'panel.zone.tooltip_count_other': '{count} Parzellen',
    'panel.zone.tooltip_count_label': 'Anzahl',
    'panel.zone.cohort_tooltip': 'mittleres ratioV {value} (n={n})',
    'panel.zone.cohort_label': 'Kohorte',
    'panel.zone.summary_line': 'n={n} · p50 {p50} · Mittel {mean}',

    // ---------- exports modal ----------
    'panel.images.title': 'Meine Exporte',
    'panel.images.see_all_in_showroom': 'Alle Publikationen im Showroom ansehen',
    'panel.images.refresh': 'Aktualisieren',
    'panel.images.close': 'Schliessen',
    'panel.images.close_preview': 'Vorschau schliessen',
    'panel.images.delete': 'Löschen',
    'panel.images.open': 'Öffnen',
    'panel.images.try_again': 'Erneut versuchen',
    'panel.images.empty_title': 'Noch keine Bilder gespeichert',
    'panel.images.empty_hint': 'Verwenden Sie die Kamera-Schaltfläche in der oberen Leiste, um die aktuelle Ansicht aufzunehmen und zu speichern.',
    'panel.images.failed_to_load': 'Bilder konnten nicht geladen werden',
    'panel.images.failed_to_delete': 'Bild konnte nicht gelöscht werden',
    'panel.images.delete_confirm': 'Dieses gespeicherte Bild löschen? Dies kann nicht rückgängig gemacht werden.',
    'panel.images.showing_latest': 'Zeige die neuesten {visible} von {total}.',
    'panel.images.more_in_showroom_one': '{count} weiterer Export im Showroom verfügbar.',
    'panel.images.more_in_showroom_other': '{count} weitere Exporte im Showroom verfügbar.',
    'panel.images.additional_metadata': 'Weitere Metadaten',
    'panel.images.tilt_prefix': 'Neigung {value}',
    'panel.images.meta.app': 'App',
    'panel.images.meta.saved': 'Gespeichert',
    'panel.images.meta.dimensions': 'Abmessungen',
    'panel.images.meta.size': 'Grösse',
    'panel.images.meta.address': 'Adresse',
    'panel.images.meta.center': 'Zentrum',
    'panel.images.meta.parcel_id': 'Parzellen-ID',
    'panel.images.meta.egrid': 'EGRID',
    'panel.images.meta.tilt': 'Neigung',
    'panel.images.meta.bearing': 'Ausrichtung',
    'panel.images.meta.zoom': 'Zoom',
    'panel.images.meta.basemap': 'Grundkarte',
    'panel.images.meta.3d_mode': '3D-Modus',
    'panel.images.meta.on': 'Ein',
    'panel.images.meta.off': 'Aus',

    // ---------- screenshot ----------
    'panel.screenshot.save_image': 'Bild speichern',
    'panel.screenshot.sign_in_to_save': 'Anmelden, um ein Bild zu speichern',
    'panel.screenshot.creating_image': 'Bild wird erstellt.',
    'panel.screenshot.image_saved': 'Bild gespeichert',
    'panel.screenshot.view_image': 'Bild ansehen',
    'panel.screenshot.dismiss': 'Verwerfen',
    'panel.screenshot.failed': 'Bild konnte nicht gespeichert werden',

    // ---------- user menu ----------
    'menu.sign_in': 'Anmelden',
    'menu.sign_out': 'Abmelden',
    'menu.view_profile': 'Profil anzeigen',
    'menu.my_saved_parcels': 'Meine gespeicherten Parzellen',
    'menu.active': 'Aktiv',
    'menu.fallback_user': 'Benutzer',

    // ---------- PRM ----------
    'prm.save': 'In PRM speichern',
    'prm.saving': 'Speichern…',
    'prm.saved': 'In PRM gespeichert',
    'prm.open_in_proom': 'In proom öffnen',
    'prm.signin_required': 'Anmelden zum Speichern',
    'prm.save_failed': 'Speichern fehlgeschlagen',

    'modal.parcels.open_here': 'Hier öffnen',

    // ---------- location modal ----------
    'modal.location.title': 'Standortzugriff aktivieren',
    'modal.location.body': 'Erlauben Sie room, Ihren Standort zu verwenden, um die Karte auf Ihre aktuelle Position zu zentrieren. So finden Sie nahegelegene Parzellen und Gebäude schneller.',
    'modal.location.privacy': 'Ihr Standort wird nur lokal verwendet und nie gespeichert.',
    'modal.location.not_now': 'Nicht jetzt',
    'modal.location.allow': 'Standort erlauben',

    // ---------- geolocation ----------
    'map.locate.button': 'Mich lokalisieren',
    'map.locate.moved': 'Zu Ihrem aktuellen Standort verschoben.',
    'map.locate.not_supported': 'Standortbestimmung wird von Ihrem Browser nicht unterstützt.',
    'map.locate.permission_denied': 'Der Standortzugriff wurde verweigert. Bitte aktivieren Sie die Standortberechtigungen in den Browsereinstellungen.',
    'map.locate.unavailable': 'Ihr Standort konnte nicht ermittelt werden. Bitte versuchen Sie es erneut.',
    'map.locate.timeout': 'Die Standortanfrage ist abgelaufen. Bitte versuchen Sie es erneut.',
    'map.locate.unknown': 'Beim Abrufen Ihres Standorts ist ein unerwarteter Fehler aufgetreten.',

    // ---------- tour ----------
    'tour.help_button': 'Hilfe',
    'tour.short_label': 'Kurztour',
    'tour.long_label': 'Tour starten',
    'tour.next': 'Weiter',
    'tour.back': 'Zurück',
    'tour.skip': 'Überspringen',
    'tour.done': 'Fertig',
    'tour.step_of': 'Schritt {index} von {total}',
    'tour.welcome.title': 'Willkommen bei room',
    'tour.welcome.body': 'Sehen Sie, wie dicht eine Schweizer Zone tatsächlich bebaut ist — und wo die gewählte Parzelle in der Verteilung steht.',
    'tour.search.title': 'Eine Adresse finden',
    'tour.search.body': 'Suchen Sie eine beliebige Schweizer Adresse. Die Karte fliegt dorthin und wählt die passende Parzelle aus.',
    'tour.map.title': 'Dichte auf einen Blick',
    'tour.map.body': 'Klicken Sie auf eine Parzelle. Die Karte schattiert dann alle anderen Parzellen derselben Zone nach ihrem Nutzungs-Perzentil — von hell bis dunkel.',
    'tour.parcel_facts.title': 'Parzellen-Fakten',
    'tour.parcel_facts.body': 'Gemeinde, Zonenkategorie, Parzellenfläche, bestehendes Volumen, Baujahr, ratioV, freeV — alles zur angeklickten Parzelle.',
    'tour.zone_switcher.title': 'Andere Zonen vergleichen',
    'tour.zone_switcher.body': 'room wählt automatisch die Zonenkategorie dieser Parzelle. Wechseln Sie zu einer beliebigen anderen Zone derselben Gemeinde zum Vergleich.',
    'tour.charts.title': 'Wo Sie stehen',
    'tour.charts.body': 'Boxplot, sechs Verteilungs-Histogramme, eine Perzentil-Anzeige, eine Zeitlinie und ein Streudiagramm Fläche-vs-Volumen — jedes markiert die gewählte Parzelle.',
    'tour.layers.title': 'Ansicht anpassen',
    'tour.layers.body': 'Grundkarte wechseln, Parzellen- und Gebäude-Opazität anpassen oder die 3D-Gebäudeansicht aktivieren.',
    'tour.tools.title': 'Lokalisieren & aufnehmen',
    'tour.tools.body': 'Springen Sie zu Ihrem Standort oder erfassen Sie die Karte mit der Dichte-Überlagerung für Berichte und Exporte.',
    'tour.help.title': 'Jederzeit neu starten',
    'tour.help.body': 'Sie können diese Tour jederzeit über die Hilfe-Schaltfläche erneut abspielen.',

    // ---------- errors ----------
    'error.no_egrid': 'Kein EGRID für diese Parzelle verfügbar',
    'error.unknown': 'Unbekannter Fehler',

    // ---------- Dichte-Legende (Karte) ----------
    'legend.title': 'Zonendichte',
    'legend.metric': 'Ausnützung',
    'legend.median': 'Median',
    'legend.you': 'Diese Parzelle — {value} der zulässigen Nutzung gebaut',
    'legend.allowance_hint': '100 % = vollständig gemäss Zonenausnützung gebaut',
    'legend.allowance_tooltip': '100 % — gemäss zulässiger Ausnützung gebaut',
  },
  it: {
    // ---------- navbar ----------
    'nav.search_placeholder': 'Cerca indirizzi in Svizzera...',
    'nav.searching': 'Ricerca…',
    'nav.my_exports': 'I miei export',
    'nav.select_language': 'Seleziona lingua',

    // ---------- basemap ----------
    'panel.basemap.fallback': 'Mappa di base',
    'panel.basemap.dark': 'Scuro',
    'panel.basemap.streets': 'Strade',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite con strade',
    'panel.basemap.light': 'Chiaro',
    'panel.basemap.outdoors': 'Outdoor',
    'panel.basemap.navigation_day': 'Navigazione (giorno)',
    'panel.basemap.navigation_night': 'Navigazione (notte)',

    // ---------- layers ----------
    'panel.layers.parcel': 'Particella',
    'panel.layers.building': 'Edificio',
    'panel.layers.3d_view': 'Vista 3D',

    // ---------- zoom ----------
    'panel.zoom.in': 'Ingrandisci',
    'panel.zoom.out': 'Riduci',
    'panel.zoom.reset_north': 'Reimposta l’orientamento a nord',

    // ---------- tabs ----------
    'panel.tabs.zone_distribution': 'Distribuzione di zona',
    'panel.tabs.parcel_facts': 'Dati particella',

    // ---------- ZoneInfoPanel ----------
    'panel.info.title': 'Informazioni sulla particella',
    'panel.info.toggle_raw_json': 'Mostra/nascondi JSON grezzo',
    'panel.info.close': 'Chiudi',
    'panel.info.failed_to_load': 'Impossibile caricare i dati',
    'panel.info.section.location': 'Posizione',
    'panel.info.section.zoning': 'Zonizzazione',
    'panel.info.section.built': 'Costruito',
    'panel.info.section.age': 'Età',
    'panel.info.row.municipality': 'Comune',
    'panel.info.row.fso': 'UST',
    'panel.info.row.egrid': 'EGRID',
    'panel.info.row.cz_local': 'Zona locale',
    'panel.info.row.cz_canton': 'Zona cantonale',
    'panel.info.row.allowed_util': 'Util. consentita',
    'panel.info.row.parcel_area': 'Superficie particella',
    'panel.info.row.built_volume': 'Volume costruito',
    'panel.info.row.gfz': 'GFZ',
    'panel.info.row.height': 'Altezza',
    'panel.info.row.floors': 'Piani',
    'panel.info.row.year_built': 'Anno di costruzione',
    'panel.info.ratio_v.label': 'ratioV (utilizzo del volume)',
    'panel.info.ratio_v.no_reference': 'Nessuna utilizzazione consentita di riferimento per questa zona.',
    'panel.info.ratio_s.label': 'ratioS (copertura del lotto)',
    'panel.info.no_data_for_parcel': 'Nessun dato per questa particella.',
    'panel.info.free_v.label': 'freeV (margine)',
    'panel.info.free_v.positive': 'Volume consentito rimanente.',
    'panel.info.free_v.negative': 'Il volume costruito supera quanto consentito.',

    // ---------- ZonePanel ----------
    'panel.zone.parcels_suffix': '{count} particelle',
    'panel.zone.zoning_category': 'Categoria di zona',
    'panel.zone.filter_zones_placeholder': 'Filtra zone…',
    'panel.zone.no_matching_zones': 'Nessuna zona corrispondente.',
    'panel.zone.tab.distributions': 'Distribuzioni',
    'panel.zone.tab.scatter': 'Superficie vs. volume',
    'panel.zone.error_title': 'Impossibile caricare le statistiche di zona',
    'panel.zone.error_generic': 'Caricamento delle statistiche di zona fallito.',
    'panel.zone.metric.ratio_v.title': 'ratioV (utilizzo del volume)',
    'panel.zone.metric.free_v.title': 'freeV (margine)',
    'panel.zone.metric.ratio_s.title': 'ratioS (copertura del lotto)',
    'panel.zone.metric.gfz.title': 'GFZ (superficie di piano)',
    'panel.zone.metric.bldg_height.title': 'Altezza dell’edificio',
    'panel.zone.metric.bldg_floors.title': 'Numero di piani',
    'panel.zone.boxplot_title': 'ratioV — distribuzione di zona',
    'panel.zone.not_enough_data': 'Dati insufficienti per questa zona.',
    'panel.zone.no_data': 'Nessun dato per questa zona.',
    'panel.zone.percentile_title': 'Percentile di utilizzo della zona',
    'panel.zone.percentile_label': 'percentile',
    'panel.zone.gauge_aria': 'Indicatore percentile',
    'panel.zone.over_time_title': 'Utilizzo nel tempo',
    'panel.zone.over_time_no_data': 'Dati di coorte insufficienti per questa zona.',
    'panel.zone.scatter_title': 'Superficie particella vs. volume costruito',
    'panel.zone.scatter_no_data': 'Nessuna particella disponibile per questa zona.',
    'panel.zone.scatter_axis_area': 'Superficie particella (m²)',
    'panel.zone.scatter_you_prefix': 'Tu: {area} m² / {volume} m³',
    'panel.zone.chart_you': 'Tu',
    'panel.zone.chart_you_prefix': 'Tu: {value}',
    'panel.zone.tooltip_count_one': '{count} particella',
    'panel.zone.tooltip_count_other': '{count} particelle',
    'panel.zone.tooltip_count_label': 'Conteggio',
    'panel.zone.cohort_tooltip': 'ratioV medio {value} (n={n})',
    'panel.zone.cohort_label': 'Coorte',
    'panel.zone.summary_line': 'n={n} · p50 {p50} · media {mean}',

    // ---------- exports modal ----------
    'panel.images.title': 'I miei export',
    'panel.images.see_all_in_showroom': 'Vedi tutte le pubblicazioni nello Showroom',
    'panel.images.refresh': 'Aggiorna',
    'panel.images.close': 'Chiudi',
    'panel.images.close_preview': 'Chiudi anteprima',
    'panel.images.delete': 'Elimina',
    'panel.images.open': 'Apri',
    'panel.images.try_again': 'Riprova',
    'panel.images.empty_title': 'Nessuna immagine salvata',
    'panel.images.empty_hint': 'Usa il pulsante della fotocamera nella barra superiore per catturare e salvare la vista corrente.',
    'panel.images.failed_to_load': 'Impossibile caricare le immagini',
    'panel.images.failed_to_delete': 'Impossibile eliminare l’immagine',
    'panel.images.delete_confirm': 'Eliminare questa immagine salvata? Questa azione non può essere annullata.',
    'panel.images.showing_latest': 'Mostrando gli ultimi {visible} di {total}.',
    'panel.images.more_in_showroom_one': '{count} altro export disponibile nello Showroom.',
    'panel.images.more_in_showroom_other': '{count} altri export disponibili nello Showroom.',
    'panel.images.additional_metadata': 'Metadati aggiuntivi',
    'panel.images.tilt_prefix': 'Inclinazione {value}',
    'panel.images.meta.app': 'App',
    'panel.images.meta.saved': 'Salvato',
    'panel.images.meta.dimensions': 'Dimensioni',
    'panel.images.meta.size': 'Dimensione',
    'panel.images.meta.address': 'Indirizzo',
    'panel.images.meta.center': 'Centro',
    'panel.images.meta.parcel_id': 'ID particella',
    'panel.images.meta.egrid': 'EGRID',
    'panel.images.meta.tilt': 'Inclinazione',
    'panel.images.meta.bearing': 'Orientamento',
    'panel.images.meta.zoom': 'Zoom',
    'panel.images.meta.basemap': 'Mappa di base',
    'panel.images.meta.3d_mode': 'Modalità 3D',
    'panel.images.meta.on': 'Attiva',
    'panel.images.meta.off': 'Disattivata',

    // ---------- screenshot ----------
    'panel.screenshot.save_image': 'Salva immagine',
    'panel.screenshot.sign_in_to_save': 'Accedi per salvare un’immagine',
    'panel.screenshot.creating_image': 'Creazione dell’immagine.',
    'panel.screenshot.image_saved': 'Immagine salvata',
    'panel.screenshot.view_image': 'Visualizza immagine',
    'panel.screenshot.dismiss': 'Ignora',
    'panel.screenshot.failed': 'Impossibile salvare l’immagine',

    // ---------- user menu ----------
    'menu.sign_in': 'Accedi',
    'menu.sign_out': 'Esci',
    'menu.view_profile': 'Visualizza profilo',
    'menu.my_saved_parcels': 'Le mie particelle salvate',
    'menu.active': 'Attivo',
    'menu.fallback_user': 'Utente',

    // ---------- PRM ----------
    'prm.save': 'Salva nel PRM',
    'prm.saving': 'Salvataggio…',
    'prm.saved': 'Salvato nel PRM',
    'prm.open_in_proom': 'Apri in proom',
    'prm.signin_required': 'Accedi per salvare',
    'prm.save_failed': 'Salvataggio fallito',

    'modal.parcels.open_here': 'Apri qui',

    // ---------- location modal ----------
    'modal.location.title': 'Abilita l’accesso alla posizione',
    'modal.location.body': 'Consenti a room di utilizzare la tua posizione per centrare la mappa sulla tua posizione attuale. Questo ti aiuta a trovare particelle ed edifici nelle vicinanze più rapidamente.',
    'modal.location.privacy': 'La tua posizione viene utilizzata solo localmente e non viene mai memorizzata.',
    'modal.location.not_now': 'Non ora',
    'modal.location.allow': 'Consenti posizione',

    // ---------- geolocation ----------
    'map.locate.button': 'Individuami',
    'map.locate.moved': 'Spostato alla tua posizione attuale.',
    'map.locate.not_supported': 'La geolocalizzazione non è supportata dal tuo browser.',
    'map.locate.permission_denied': 'L’accesso alla posizione è stato negato. Abilita le autorizzazioni di posizione nelle impostazioni del browser.',
    'map.locate.unavailable': 'Impossibile determinare la tua posizione. Riprova.',
    'map.locate.timeout': 'La richiesta di posizione è scaduta. Riprova.',
    'map.locate.unknown': 'Si è verificato un errore imprevisto durante il recupero della posizione.',

    // ---------- tour ----------
    'tour.help_button': 'Aiuto',
    'tour.short_label': 'Tour rapido',
    'tour.long_label': 'Avvia il tour',
    'tour.next': 'Avanti',
    'tour.back': 'Indietro',
    'tour.skip': 'Salta',
    'tour.done': 'Fatto',
    'tour.step_of': 'Passo {index} di {total}',
    'tour.welcome.title': 'Benvenuto in room',
    'tour.welcome.body': 'Scopri quanto è densamente edificata una zona svizzera — e dove si colloca la particella selezionata nella distribuzione.',
    'tour.search.title': 'Trova un indirizzo',
    'tour.search.body': 'Cerca qualsiasi indirizzo svizzero. La mappa ci vola sopra e seleziona la particella corrispondente.',
    'tour.map.title': 'Densità a colpo d’occhio',
    'tour.map.body': 'Clicca su una particella. La mappa sfumerà tutte le altre particelle della stessa zona in base al percentile di utilizzo — dal chiaro allo scuro.',
    'tour.parcel_facts.title': 'Dati della particella',
    'tour.parcel_facts.body': 'Comune, categoria di zona, superficie, volume esistente, anno di costruzione, ratioV, freeV — tutto per la particella cliccata.',
    'tour.zone_switcher.title': 'Confronta altre zone',
    'tour.zone_switcher.body': 'room seleziona automaticamente la categoria di zona di questa particella. Passa a qualsiasi altra zona dello stesso comune per confrontare.',
    'tour.charts.title': 'Dove ti collochi',
    'tour.charts.body': 'Boxplot, sei istogrammi di distribuzione, un indicatore percentile, una linea temporale e un grafico a dispersione superficie-volume — ognuno segna la particella selezionata.',
    'tour.layers.title': 'Regola la vista',
    'tour.layers.body': 'Cambia la mappa di base, regola l’opacità di particelle ed edifici, oppure attiva la vista 3D degli edifici.',
    'tour.tools.title': 'Localizza & cattura',
    'tour.tools.body': 'Vai alla tua posizione, oppure cattura la mappa con la sovrapposizione di densità per report ed esportazioni.',
    'tour.help.title': 'Riavvia in qualsiasi momento',
    'tour.help.body': 'Puoi riprodurre questo tour in qualsiasi momento da questo pulsante di aiuto.',

    // ---------- errors ----------
    'error.no_egrid': 'Nessun EGRID disponibile per questa particella',
    'error.unknown': 'Errore sconosciuto',

    // ---------- legenda densità (mappa) ----------
    'legend.title': 'Densità della zona',
    'legend.metric': 'utilizzo',
    'legend.median': 'mediana',
    'legend.you': 'Questa particella — {value} dell’indice utilizzato',
    'legend.allowance_hint': '100% = costruito secondo l’indice della zona',
    'legend.allowance_tooltip': '100% — costruito secondo l’indice consentito',
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'de', 'it'];
const STORAGE_KEY = 'room:locale';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // localStorage unavailable — fall through.
  }
  const browserLang = navigator.language.slice(0, 2).toLowerCase() as Locale;
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : 'en';
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore — locale persistence is best-effort.
    }
  }, [locale]);

  const setLocale = (next: Locale) => {
    if (SUPPORTED_LOCALES.includes(next)) setLocaleState(next);
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const raw = translations[locale]?.[key] ?? translations.en[key] ?? key;
    return interpolate(raw, vars);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

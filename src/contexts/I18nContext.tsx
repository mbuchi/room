import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@swissnovo/shared';

/**
 * Translation table for the groove UI. Each key resolves to the matching
 * string in the active locale; missing keys fall back to English.
 *
 * Grouping convention (mirrors roofs):
 *   - nav.*         the top navbar (search, exports button, language)
 *   - header.*      info-panel header / titles
 *   - panel.basemap.*    basemap switcher
 *   - panel.layers.*     opacity sliders & 3D toggle
 *   - panel.zoom.*       zoom/compass control
 *   - panel.info.*       parcel info panel sections, labels, raw JSON, errors
 *   - panel.images.*     "My Exports" gallery modal
 *   - panel.screenshot.* the capture button & overlay & toast
 *   - menu.*        user menu (sign in / sign out / view profile / active)
 *   - modal.location.*   location permission modal
 *   - map.locate.*       location errors and toasts
 *   - error.*       generic error strings
 *
 * The translator supports `{placeholder}` interpolation so count/range
 * strings can be expressed naturally per language.
 */
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // navbar (shipped in PR #39)
    'nav.search_placeholder': 'Search addresses in Switzerland...',
    'nav.searching': 'Searching…',
    'nav.my_exports': 'My Exports',
    'nav.select_language': 'Select language',

    // basemap switcher (MapControls)
    'panel.basemap.fallback': 'Basemap',
    'panel.basemap.dark': 'Dark',
    'panel.basemap.streets': 'Streets',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite Streets',
    'panel.basemap.light': 'Light',
    'panel.basemap.outdoors': 'Outdoors',
    'panel.basemap.navigation_day': 'Navigation Day',
    'panel.basemap.navigation_night': 'Navigation Night',

    // opacity sliders + 3D toggle (MapControls)
    'panel.layers.parcel': 'Parcel',
    'panel.layers.building': 'Building',
    'panel.layers.3d_view': '3D View',

    // ZoomControl
    'panel.zoom.in': 'Zoom in',
    'panel.zoom.out': 'Zoom out',
    'panel.zoom.reset_north': 'Reset bearing to north',

    // InfoPanel — header, sections, fields
    'panel.info.title': 'Parcel Information',
    'panel.info.id': 'ID',
    'panel.info.egrid': 'EGRID',
    'panel.info.toggle_raw_json': 'Toggle raw JSON',
    'panel.info.close': 'Close',
    'panel.info.raw_json': 'Raw JSON',
    'panel.info.copy': 'Copy',
    'panel.info.copied': 'Copied',
    'panel.info.failed_to_load': 'Failed to load data',
    'panel.info.no_building_data': 'No building data found for this parcel.',
    'panel.info.buildings_found_one': '{count} building found',
    'panel.info.buildings_found_other': '{count} buildings found',
    'panel.info.unknown_address': 'Unknown address',
    'panel.info.section.building': 'Building',
    'panel.info.section.classification': 'Classification',
    'panel.info.section.heating': 'Heating',
    'panel.info.section.hot_water': 'Hot Water',
    'panel.info.field.egid': 'EGID',
    'panel.info.field.building_no': 'Building No.',
    'panel.info.field.year_built': 'Year Built',
    'panel.info.field.area': 'Area',
    'panel.info.field.floors': 'Floors',
    'panel.info.field.dwellings': 'Dwellings',
    'panel.info.field.status': 'Status',
    'panel.info.field.class': 'Class',
    'panel.info.field.category': 'Category',
    'panel.info.field.energy_source': 'Energy Source',
    'panel.info.code_prefix': 'Code',

    // "My Exports" modal (SavedImagesPanel)
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
    // preview metadata rows
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

    // ScreenshotButton — capture button, overlay, toast
    'panel.screenshot.save_image': 'Save image',
    'panel.screenshot.sign_in_to_save': 'Sign in to save an image',
    'panel.screenshot.creating_image': 'Creating image.',
    'panel.screenshot.image_saved': 'Image saved',
    'panel.screenshot.view_image': 'View image',
    'panel.screenshot.dismiss': 'Dismiss',
    'panel.screenshot.failed': 'Failed to save image',

    // user menu (UserMenu)
    'menu.sign_in': 'Sign in',
    'menu.sign_out': 'Sign out',
    'menu.view_profile': 'View profile',
    'menu.my_saved_parcels': 'My saved parcels',
    'menu.active': 'Active',
    'menu.fallback_user': 'User',

    // PRM save button on the parcel info panel (mirrors scoore prm.*)
    'prm.save': 'Save to PRM',
    'prm.saving': 'Saving…',
    'prm.saved': 'Saved to PRM',
    'prm.open_in_proom': 'Open in proom',
    'prm.signin_required': 'Sign in to save parcels',
    'prm.save_failed': 'Could not save — try again',

    // SavedParcelsModal "open here" action (re-centres groove on the parcel)
    'modal.parcels.open_here': 'Open here',

    // location permission modal
    'modal.location.title': 'Enable location access',
    'modal.location.body': 'Allow groove to use your location to center the map on your current position. This helps you find nearby parcels and buildings faster.',
    'modal.location.privacy': 'Your location is only used locally and never stored.',
    'modal.location.not_now': 'Not now',
    'modal.location.allow': 'Allow location',

    // LocateButton + geolocation errors / toasts
    'map.locate.button': 'Locate me',
    'map.locate.moved': 'Moved to your current location.',
    'map.locate.not_supported': 'Geolocation is not supported by your browser.',
    'map.locate.permission_denied': 'Location access was denied. Please enable location permissions in your browser settings.',
    'map.locate.unavailable': 'Your location could not be determined. Please try again.',
    'map.locate.timeout': 'Location request timed out. Please try again.',
    'map.locate.unknown': 'An unexpected error occurred while retrieving your location.',

    // generic errors
    'error.no_egrid': 'No EGRID available for this parcel',
    'error.unknown': 'Unknown error',
  },
  fr: {
    'nav.search_placeholder': 'Rechercher des adresses en Suisse...',
    'nav.searching': 'Recherche…',
    'nav.my_exports': 'Mes exports',
    'nav.select_language': 'Sélectionner la langue',

    'panel.basemap.fallback': 'Fond de carte',
    'panel.basemap.dark': 'Sombre',
    'panel.basemap.streets': 'Rues',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite avec rues',
    'panel.basemap.light': 'Clair',
    'panel.basemap.outdoors': 'Plein air',
    'panel.basemap.navigation_day': 'Navigation (jour)',
    'panel.basemap.navigation_night': 'Navigation (nuit)',

    'panel.layers.parcel': 'Parcelle',
    'panel.layers.building': 'Bâtiment',
    'panel.layers.3d_view': 'Vue 3D',

    'panel.zoom.in': 'Zoomer',
    'panel.zoom.out': 'Dézoomer',
    'panel.zoom.reset_north': 'Réinitialiser l’orientation au nord',

    'panel.info.title': 'Informations de la parcelle',
    'panel.info.id': 'ID',
    'panel.info.egrid': 'EGRID',
    'panel.info.toggle_raw_json': 'Afficher/masquer le JSON brut',
    'panel.info.close': 'Fermer',
    'panel.info.raw_json': 'JSON brut',
    'panel.info.copy': 'Copier',
    'panel.info.copied': 'Copié',
    'panel.info.failed_to_load': 'Échec du chargement des données',
    'panel.info.no_building_data': 'Aucune donnée de bâtiment pour cette parcelle.',
    'panel.info.buildings_found_one': '{count} bâtiment trouvé',
    'panel.info.buildings_found_other': '{count} bâtiments trouvés',
    'panel.info.unknown_address': 'Adresse inconnue',
    'panel.info.section.building': 'Bâtiment',
    'panel.info.section.classification': 'Classification',
    'panel.info.section.heating': 'Chauffage',
    'panel.info.section.hot_water': 'Eau chaude',
    'panel.info.field.egid': 'EGID',
    'panel.info.field.building_no': 'N° de bâtiment',
    'panel.info.field.year_built': 'Année de construction',
    'panel.info.field.area': 'Surface',
    'panel.info.field.floors': 'Étages',
    'panel.info.field.dwellings': 'Logements',
    'panel.info.field.status': 'Statut',
    'panel.info.field.class': 'Classe',
    'panel.info.field.category': 'Catégorie',
    'panel.info.field.energy_source': 'Source d’énergie',
    'panel.info.code_prefix': 'Code',

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

    'panel.screenshot.save_image': 'Enregistrer l’image',
    'panel.screenshot.sign_in_to_save': 'Connectez-vous pour enregistrer une image',
    'panel.screenshot.creating_image': 'Création de l’image.',
    'panel.screenshot.image_saved': 'Image enregistrée',
    'panel.screenshot.view_image': 'Voir l’image',
    'panel.screenshot.dismiss': 'Rejeter',
    'panel.screenshot.failed': 'Échec de l’enregistrement de l’image',

    'menu.sign_in': 'Se connecter',
    'menu.sign_out': 'Se déconnecter',
    'menu.view_profile': 'Voir le profil',
    'menu.my_saved_parcels': 'Mes parcelles enregistrées',
    'menu.active': 'Actif',
    'menu.fallback_user': 'Utilisateur',

    'prm.save': 'Enregistrer dans le PRM',
    'prm.saving': 'Enregistrement…',
    'prm.saved': 'Enregistré dans le PRM',
    'prm.open_in_proom': 'Ouvrir dans proom',
    'prm.signin_required': 'Connectez-vous pour enregistrer',
    'prm.save_failed': 'Échec — réessayez',

    'modal.parcels.open_here': 'Ouvrir ici',

    'modal.location.title': 'Activer l’accès à la position',
    'modal.location.body': 'Autorisez groove à utiliser votre position pour centrer la carte sur votre emplacement actuel. Cela vous aide à trouver plus rapidement les parcelles et bâtiments voisins.',
    'modal.location.privacy': 'Votre position est utilisée uniquement localement et n’est jamais enregistrée.',
    'modal.location.not_now': 'Pas maintenant',
    'modal.location.allow': 'Autoriser la position',

    'map.locate.button': 'Me localiser',
    'map.locate.moved': 'Déplacé vers votre position actuelle.',
    'map.locate.not_supported': 'La géolocalisation n’est pas prise en charge par votre navigateur.',
    'map.locate.permission_denied': 'L’accès à la position a été refusé. Veuillez activer les autorisations de localisation dans les paramètres de votre navigateur.',
    'map.locate.unavailable': 'Votre position n’a pas pu être déterminée. Veuillez réessayer.',
    'map.locate.timeout': 'La demande de position a expiré. Veuillez réessayer.',
    'map.locate.unknown': 'Une erreur inattendue est survenue lors de la récupération de votre position.',

    'error.no_egrid': 'Aucun EGRID disponible pour cette parcelle',
    'error.unknown': 'Erreur inconnue',
  },
  de: {
    'nav.search_placeholder': 'Adressen in der Schweiz suchen...',
    'nav.searching': 'Suche…',
    'nav.my_exports': 'Meine Exporte',
    'nav.select_language': 'Sprache wählen',

    'panel.basemap.fallback': 'Grundkarte',
    'panel.basemap.dark': 'Dunkel',
    'panel.basemap.streets': 'Strassen',
    'panel.basemap.satellite': 'Satellit',
    'panel.basemap.satellite_streets': 'Satellit mit Strassen',
    'panel.basemap.light': 'Hell',
    'panel.basemap.outdoors': 'Outdoor',
    'panel.basemap.navigation_day': 'Navigation (Tag)',
    'panel.basemap.navigation_night': 'Navigation (Nacht)',

    'panel.layers.parcel': 'Parzelle',
    'panel.layers.building': 'Gebäude',
    'panel.layers.3d_view': '3D-Ansicht',

    'panel.zoom.in': 'Vergrössern',
    'panel.zoom.out': 'Verkleinern',
    'panel.zoom.reset_north': 'Ausrichtung nach Norden zurücksetzen',

    'panel.info.title': 'Parzelleninformationen',
    'panel.info.id': 'ID',
    'panel.info.egrid': 'EGRID',
    'panel.info.toggle_raw_json': 'Rohes JSON ein-/ausblenden',
    'panel.info.close': 'Schliessen',
    'panel.info.raw_json': 'Rohes JSON',
    'panel.info.copy': 'Kopieren',
    'panel.info.copied': 'Kopiert',
    'panel.info.failed_to_load': 'Daten konnten nicht geladen werden',
    'panel.info.no_building_data': 'Keine Gebäudedaten für diese Parzelle gefunden.',
    'panel.info.buildings_found_one': '{count} Gebäude gefunden',
    'panel.info.buildings_found_other': '{count} Gebäude gefunden',
    'panel.info.unknown_address': 'Unbekannte Adresse',
    'panel.info.section.building': 'Gebäude',
    'panel.info.section.classification': 'Klassifizierung',
    'panel.info.section.heating': 'Heizung',
    'panel.info.section.hot_water': 'Warmwasser',
    'panel.info.field.egid': 'EGID',
    'panel.info.field.building_no': 'Gebäude-Nr.',
    'panel.info.field.year_built': 'Baujahr',
    'panel.info.field.area': 'Fläche',
    'panel.info.field.floors': 'Geschosse',
    'panel.info.field.dwellings': 'Wohnungen',
    'panel.info.field.status': 'Status',
    'panel.info.field.class': 'Klasse',
    'panel.info.field.category': 'Kategorie',
    'panel.info.field.energy_source': 'Energiequelle',
    'panel.info.code_prefix': 'Code',

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

    'panel.screenshot.save_image': 'Bild speichern',
    'panel.screenshot.sign_in_to_save': 'Anmelden, um ein Bild zu speichern',
    'panel.screenshot.creating_image': 'Bild wird erstellt.',
    'panel.screenshot.image_saved': 'Bild gespeichert',
    'panel.screenshot.view_image': 'Bild ansehen',
    'panel.screenshot.dismiss': 'Verwerfen',
    'panel.screenshot.failed': 'Bild konnte nicht gespeichert werden',

    'menu.sign_in': 'Anmelden',
    'menu.sign_out': 'Abmelden',
    'menu.view_profile': 'Profil anzeigen',
    'menu.my_saved_parcels': 'Meine gespeicherten Parzellen',
    'menu.active': 'Aktiv',
    'menu.fallback_user': 'Benutzer',

    'prm.save': 'In PRM speichern',
    'prm.saving': 'Speichern…',
    'prm.saved': 'In PRM gespeichert',
    'prm.open_in_proom': 'In proom öffnen',
    'prm.signin_required': 'Anmelden zum Speichern',
    'prm.save_failed': 'Speichern fehlgeschlagen',

    'modal.parcels.open_here': 'Hier öffnen',

    'modal.location.title': 'Standortzugriff aktivieren',
    'modal.location.body': 'Erlauben Sie groove, Ihren Standort zu verwenden, um die Karte auf Ihre aktuelle Position zu zentrieren. So finden Sie nahegelegene Parzellen und Gebäude schneller.',
    'modal.location.privacy': 'Ihr Standort wird nur lokal verwendet und nie gespeichert.',
    'modal.location.not_now': 'Nicht jetzt',
    'modal.location.allow': 'Standort erlauben',

    'map.locate.button': 'Mich lokalisieren',
    'map.locate.moved': 'Zu Ihrem aktuellen Standort verschoben.',
    'map.locate.not_supported': 'Standortbestimmung wird von Ihrem Browser nicht unterstützt.',
    'map.locate.permission_denied': 'Der Standortzugriff wurde verweigert. Bitte aktivieren Sie die Standortberechtigungen in den Browsereinstellungen.',
    'map.locate.unavailable': 'Ihr Standort konnte nicht ermittelt werden. Bitte versuchen Sie es erneut.',
    'map.locate.timeout': 'Die Standortanfrage ist abgelaufen. Bitte versuchen Sie es erneut.',
    'map.locate.unknown': 'Beim Abrufen Ihres Standorts ist ein unerwarteter Fehler aufgetreten.',

    'error.no_egrid': 'Kein EGRID für diese Parzelle verfügbar',
    'error.unknown': 'Unbekannter Fehler',
  },
  it: {
    'nav.search_placeholder': 'Cerca indirizzi in Svizzera...',
    'nav.searching': 'Ricerca…',
    'nav.my_exports': 'I miei export',
    'nav.select_language': 'Seleziona lingua',

    'panel.basemap.fallback': 'Mappa di base',
    'panel.basemap.dark': 'Scuro',
    'panel.basemap.streets': 'Strade',
    'panel.basemap.satellite': 'Satellite',
    'panel.basemap.satellite_streets': 'Satellite con strade',
    'panel.basemap.light': 'Chiaro',
    'panel.basemap.outdoors': 'Outdoor',
    'panel.basemap.navigation_day': 'Navigazione (giorno)',
    'panel.basemap.navigation_night': 'Navigazione (notte)',

    'panel.layers.parcel': 'Particella',
    'panel.layers.building': 'Edificio',
    'panel.layers.3d_view': 'Vista 3D',

    'panel.zoom.in': 'Ingrandisci',
    'panel.zoom.out': 'Riduci',
    'panel.zoom.reset_north': 'Reimposta l’orientamento a nord',

    'panel.info.title': 'Informazioni sulla particella',
    'panel.info.id': 'ID',
    'panel.info.egrid': 'EGRID',
    'panel.info.toggle_raw_json': 'Mostra/nascondi JSON grezzo',
    'panel.info.close': 'Chiudi',
    'panel.info.raw_json': 'JSON grezzo',
    'panel.info.copy': 'Copia',
    'panel.info.copied': 'Copiato',
    'panel.info.failed_to_load': 'Impossibile caricare i dati',
    'panel.info.no_building_data': 'Nessun dato di edificio trovato per questa particella.',
    'panel.info.buildings_found_one': '{count} edificio trovato',
    'panel.info.buildings_found_other': '{count} edifici trovati',
    'panel.info.unknown_address': 'Indirizzo sconosciuto',
    'panel.info.section.building': 'Edificio',
    'panel.info.section.classification': 'Classificazione',
    'panel.info.section.heating': 'Riscaldamento',
    'panel.info.section.hot_water': 'Acqua calda',
    'panel.info.field.egid': 'EGID',
    'panel.info.field.building_no': 'N. edificio',
    'panel.info.field.year_built': 'Anno di costruzione',
    'panel.info.field.area': 'Superficie',
    'panel.info.field.floors': 'Piani',
    'panel.info.field.dwellings': 'Abitazioni',
    'panel.info.field.status': 'Stato',
    'panel.info.field.class': 'Classe',
    'panel.info.field.category': 'Categoria',
    'panel.info.field.energy_source': 'Fonte di energia',
    'panel.info.code_prefix': 'Codice',

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

    'panel.screenshot.save_image': 'Salva immagine',
    'panel.screenshot.sign_in_to_save': 'Accedi per salvare un’immagine',
    'panel.screenshot.creating_image': 'Creazione dell’immagine.',
    'panel.screenshot.image_saved': 'Immagine salvata',
    'panel.screenshot.view_image': 'Visualizza immagine',
    'panel.screenshot.dismiss': 'Ignora',
    'panel.screenshot.failed': 'Impossibile salvare l’immagine',

    'menu.sign_in': 'Accedi',
    'menu.sign_out': 'Esci',
    'menu.view_profile': 'Visualizza profilo',
    'menu.my_saved_parcels': 'Le mie particelle salvate',
    'menu.active': 'Attivo',
    'menu.fallback_user': 'Utente',

    'prm.save': 'Salva nel PRM',
    'prm.saving': 'Salvataggio…',
    'prm.saved': 'Salvato nel PRM',
    'prm.open_in_proom': 'Apri in proom',
    'prm.signin_required': 'Accedi per salvare',
    'prm.save_failed': 'Salvataggio fallito',

    'modal.parcels.open_here': 'Apri qui',

    'modal.location.title': 'Abilita l’accesso alla posizione',
    'modal.location.body': 'Consenti a groove di utilizzare la tua posizione per centrare la mappa sulla tua posizione attuale. Questo ti aiuta a trovare particelle ed edifici nelle vicinanze più rapidamente.',
    'modal.location.privacy': 'La tua posizione viene utilizzata solo localmente e non viene mai memorizzata.',
    'modal.location.not_now': 'Non ora',
    'modal.location.allow': 'Consenti posizione',

    'map.locate.button': 'Individuami',
    'map.locate.moved': 'Spostato alla tua posizione attuale.',
    'map.locate.not_supported': 'La geolocalizzazione non è supportata dal tuo browser.',
    'map.locate.permission_denied': 'L’accesso alla posizione è stato negato. Abilita le autorizzazioni di posizione nelle impostazioni del browser.',
    'map.locate.unavailable': 'Impossibile determinare la tua posizione. Riprova.',
    'map.locate.timeout': 'La richiesta di posizione è scaduta. Riprova.',
    'map.locate.unknown': 'Si è verificato un errore imprevisto durante il recupero della posizione.',

    'error.no_egrid': 'Nessun EGRID disponibile per questa particella',
    'error.unknown': 'Errore sconosciuto',
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'de', 'it'];
const STORAGE_KEY = 'groove:locale';

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

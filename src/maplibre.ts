/**
 * Configuration globale de maplibre-gl, chargée avec le composant de carte
 * (et donc seulement quand une partie commence).
 */
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// maplibre-gl 6 charge son worker via `new URL('./maplibre-gl-worker.mjs', import.meta.url)`,
// une adresse calculée à l'exécution que Vite ne peut pas détecter : une fois maplibre
// pré-empaqueté (dev) ou intégré au bundle (build), le fichier est introuvable et les sources
// GeoJSON ne sont jamais chargées. On publie donc le worker comme fichier et on donne son URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(maplibreWorkerUrl)

/** Textes de l'interface en français (langue par défaut et de référence). */
export const fr = {
  app: {
    chooseGame: 'Choisis un jeu',
    gamesUnavailable: 'Impossible de charger la liste des jeux.',
    offline: 'Hors ligne : tu peux jouer, mais les meilleurs scores sont indisponibles.',
  },
  game: {
    questionBefore: 'Où est {type}',
    questionAfter: ' ?',
    select: 'Sélectionne {type} sur la carte',
    correct: 'Correct',
    incorrect: 'Incorrect ({name})',
    over: 'Partie terminée',
    corrects: 'Corrects : {n}',
    bonus: 'Bonus : {n}%',
    loading: 'Chargement en cours…',
    loadError: 'Impossible de charger ce jeu.',
    restart: 'Redémarrer',
    learning: 'Mode apprentissage',
    highscores: 'Meilleurs scores',
    quit: 'Quitter',
    map: 'Carte du jeu',
  },
  highscores: {
    title: 'Meilleurs scores',
    rank: 'Rang',
    name: 'Nom',
    score: 'Score',
    empty: 'Aucun score enregistré pour le moment.',
    unavailable: 'Les meilleurs scores sont indisponibles pour le moment.',
    offline: 'Hors ligne : les meilleurs scores sont indisponibles.',
    close: 'Fermer',
  },
  save: {
    title: 'Enregistre ton score',
    summary: 'Tu as marqué {score} points à « {game} »',
    placeholder: 'Ton nom',
    save: 'Enregistrer',
    cancel: 'Annuler',
    rejected: 'Score non enregistré : {reason}.',
    httpError: 'erreur {status}',
    failed: "Impossible d'enregistrer le score pour le moment.",
    offline: 'Hors ligne : le score ne peut pas être enregistré.',
  },
}

/** Structure que chaque langue doit respecter. */
export type Messages = { [S in keyof typeof fr]: { [K in keyof (typeof fr)[S]]: string } }

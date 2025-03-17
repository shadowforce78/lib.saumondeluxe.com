# CustomVideoPlayer

Un lecteur vidéo personnalisé et moderne créé en JavaScript pur, sans dépendances externes.

![Aperçu du lecteur vidéo](img/preview.png)

## Fonctionnalités

- **Interface élégante** avec contrôles qui se masquent automatiquement
- **Prévisualisation au survol** de la barre de progression avec génération d'images miniatures
- **Sélecteur de qualité vidéo** pour différentes résolutions
- **Contrôle de vitesse de lecture** (0.25x à 2x)
- **Mode Picture-in-Picture** pour regarder la vidéo en fenêtre flottante
- **Mode plein écran** optimisé
- **Indicateurs visuels** pour les actions importantes (pause, volume, etc.)
- **Raccourcis clavier** pour une navigation rapide
- **Entièrement personnalisable** via CSS et options JavaScript
- **Compatible mobile** avec une interface responsive

## Installation

### Méthode 1: Via CDN (Recommandée)

Ajoutez simplement ces lignes dans votre code HTML :

```html
<!-- CSS du lecteur vidéo -->
<link rel="stylesheet" href="https://lib.saumondeluxe.com/videoPlayer.css" />

<!-- Script du lecteur vidéo -->
<script src="https://lib.saumondeluxe.com/videoPlayer.js"></script>
```

### Méthode 2: Téléchargement local

1. Téléchargez les fichiers `customVideoPlayer.js` et `customVideoPlayer.css`
2. Placez-les dans votre projet
3. Incluez-les dans votre page HTML :

```html
<link rel="stylesheet" href="chemin/vers/customVideoPlayer.css" />
<script src="chemin/vers/customVideoPlayer.js"></script>
```

## Utilisation

1. Créez un conteneur pour votre lecteur :

```html
<div id="videoPlayer"></div>
```

2. Initialisez le lecteur avec JavaScript :

```javascript
document.addEventListener("DOMContentLoaded", function () {
  const player = new CustomVideoPlayer("#videoPlayer", {
    source: "chemin/vers/video.mp4",
  });
});
```

## Configuration

Vous pouvez personnaliser le lecteur lors de son initialisation :

```javascript
const player = new CustomVideoPlayer("#votreConteneurID", {
  // URL vers la vidéo à charger
  source: "video.mp4",

  // URL vers une image d'aperçu (poster)
  poster: "apercu.jpg",

  // Lecture automatique
  autoplay: false,

  // Son coupé par défaut
  muted: false,

  // Lecture en boucle
  loop: false,

  // Préchargement (auto, metadata, none)
  preload: "auto",

  // Délai avant masquage des contrôles (en ms)
  controlsHideDelay: 2000,

  // Autoriser la sélection de vidéos
  allowVideoSelection: true,
});
```

## Exemples d'utilisation

### Lecteur simple

```javascript
const player = new CustomVideoPlayer("#player", {
  source: "video.mp4",
});
```

### Lecteur en autoplay (muet pour respecter les politiques des navigateurs)

```javascript
const player = new CustomVideoPlayer("#player", {
  source: "video.mp4",
  autoplay: true,
  muted: true,
});
```

### Lecteur avec préchargement des méta-données uniquement

```javascript
const player = new CustomVideoPlayer("#player", {
  source: "video.mp4",
  preload: "metadata",
});
```

### Lecteur avec contrôles toujours visibles

```javascript
const player = new CustomVideoPlayer("#player", {
  source: "video.mp4",
  controlsHideDelay: Infinity, // Les contrôles ne se cachent jamais automatiquement
});
```

## API publique

Le lecteur expose plusieurs méthodes que vous pouvez utiliser dans votre code :

```javascript
// Référence au lecteur
const player = new CustomVideoPlayer("#player");

// Charger une nouvelle vidéo
player.loadSource("nouvelle-video.mp4");

// Démarrer la lecture
player.play();

// Mettre en pause
player.pause();

// Définir le volume (0 à 1)
player.setVolume(0.5);

// Aller à une position spécifique (en secondes)
player.seekTo(30);

// Définir la vitesse de lecture
player.setPlaybackSpeed(1.5);
```

## Raccourcis clavier

- **Espace** : Lecture/Pause
- **Flèches gauche/droite** : Reculer/Avancer de 5 secondes
- **Flèches haut/bas** : Augmenter/Diminuer le volume
- **F** : Plein écran
- **M** : Muet
- **P** : Picture-in-Picture
- **R** : Réinitialiser la vitesse à 1x
- **Shift+>** : Augmenter la vitesse
- **Shift+<** : Diminuer la vitesse

## Personnalisation du style

Le lecteur est entièrement stylisé via CSS, ce qui vous permet de le personnaliser facilement. Vous pouvez remplacer les styles par défaut en ciblant les classes CSS dans votre propre feuille de style.

Exemple de personnalisation des couleurs :

```css
.progress-bar {
  background-color: #3498db; /* Couleur de la barre de progression */
}

.quality-option.active,
.speed-option.active {
  background-color: #2ecc71; /* Couleur des options actives */
}

.video-container button:hover {
  background-color: rgba(52, 152, 219, 0.3); /* Couleur de survol des boutons */
}
```

## Compatibilité navigateurs

- Chrome (dernières versions)
- Firefox (dernières versions)
- Safari (dernières versions)
- Edge (dernières versions)
- Mobile browsers (iOS Safari, Chrome for Android)

Note : Certaines fonctionnalités comme le Picture-in-Picture peuvent ne pas être disponibles sur tous les navigateurs.

## Support

Pour toute question ou assistance, n'hésitez pas à [créer une issue](https://github.com/shadowforce78/lib.saumondeluxe.com/issues) sur le dépôt GitHub ou à contacter directement [contact@saumondeluxe.com](mailto:contact@saumondeluxe.com).

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus d'informations.
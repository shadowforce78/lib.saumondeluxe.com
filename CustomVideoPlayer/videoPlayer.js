/**
 * CustomVideoPlayer - Une librairie simple pour créer un lecteur vidéo personnalisé
 * 
 * Usage:
 * 1. Inclure les fichiers customVideoPlayer.css et customVideoPlayer.js
 * 2. Créer un élément div avec un id unique
 * 3. Initialiser le lecteur avec:
 *    const player = new CustomVideoPlayer("#monElementId", options);
 */

class CustomVideoPlayer {
    /**
     * Crée un nouveau lecteur vidéo personnalisé
     * @param {string|Element} selector - Sélecteur CSS ou élément DOM où le lecteur sera créé
     * @param {Object} options - Options de configuration (optionnel)
     */
    constructor(selector, options = {}) {
        this.container = typeof selector === 'string' ? 
            document.querySelector(selector) : selector;
            
        if (!this.container) {
            throw new Error("Conteneur pour le lecteur vidéo non trouvé");
        }

        // Options par défaut
        this.options = {
            autoplay: false,
            muted: false,
            loop: false,
            preload: 'auto',
            controlsHideDelay: 2000,
            allowVideoSelection: true, // Nouvelle option pour activer/désactiver la sélection de vidéo
            source: options.source || null,
            poster: options.poster || null,
            ...options
        };

        // Variables d'état
        this.currentQuality = 'auto';
        this.currentSpeed = 1.0;
        this.currentVideoFile = null;
        this.currentVideoURL = null;
        this.thumbnails = {};
        this.controlsTimeout = null;
        this.isMouseOverControls = false;

        // Création de la structure du lecteur
        this.createPlayerElements();
        
        // Initialisation des événements
        this.initEvents();
        
        // Charger la source si elle est fournie
        if (this.options.source) {
            this.video.src = this.options.source;
        }
        
        // Appliquer les options
        if (this.options.poster) {
            this.video.poster = this.options.poster;
        }
        this.video.autoplay = this.options.autoplay;
        this.video.muted = this.options.muted;
        this.video.loop = this.options.loop;
        this.video.preload = this.options.preload;
        
        // Initialiser l'état du volume
        this.updateVolumeUI();
    }

    /**
     * Crée les éléments DOM nécessaires pour le lecteur
     */
    createPlayerElements() {
        // Définir la classe du conteneur
        this.container.classList.add('video-container');
        
        // Créer l'élément vidéo
        this.video = document.createElement('video');
        this.video.id = `video-${Math.floor(Math.random() * 1000000)}`;
        
        // Créer les indicateurs d'action
        this.playPauseIndicator = this.createActionIndicator('playPauseIndicator', '⏸️', 'Pause');
        this.volumeIndicator = this.createVolumeActionIndicator();
        this.seekIndicator = this.createActionIndicator('seekIndicator', '⏩', '+5s');
        
        // Créer le conteneur de prévisualisation
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'preview-container';
        this.previewContainer.id = 'previewContainer';
        
        this.previewThumbnail = document.createElement('div');
        this.previewThumbnail.className = 'preview-thumbnail';
        this.previewThumbnail.id = 'previewThumbnail';
        
        this.previewTime = document.createElement('div');
        this.previewTime.className = 'preview-time';
        this.previewTime.id = 'previewTime';
        this.previewTime.textContent = '0:00';
        
        this.previewContainer.appendChild(this.previewThumbnail);
        this.previewContainer.appendChild(this.previewTime);
        
        // Canvas caché pour l'extraction de frames
        this.thumbnailCanvas = document.createElement('canvas');
        this.thumbnailCanvas.id = 'thumbnailCanvas';
        this.thumbnailCanvas.width = 160;
        this.thumbnailCanvas.height = 90;
        this.thumbnailContext = this.thumbnailCanvas.getContext('2d');
        
        // Créer les contrôles
        this.controls = document.createElement('div');
        this.controls.className = 'controls';
        
        // Barre de progression
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'progress-container';
        this.progressContainer.id = 'progressContainer';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressBar.id = 'progressBar';
        
        this.progressContainer.appendChild(this.progressBar);
        
        // Conteneur des boutons
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'buttons-container';
        
        // Contrôles gauche
        this.leftControls = document.createElement('div');
        this.leftControls.className = 'left-controls';
        
        this.playPauseBtn = this.createButton('playPause', '▶️', 'Lecture/Pause');
        
        if (this.options.allowVideoSelection) {
            this.loadVideoBtn = this.createButton('loadVideo', '📁', 'Charger une vidéo');
            
            this.videoInput = document.createElement('input');
            this.videoInput.type = 'file';
            this.videoInput.id = 'videoInput';
            this.videoInput.className = 'file-input';
            this.videoInput.accept = 'video/*';
            
            this.leftControls.appendChild(this.loadVideoBtn);
            this.leftControls.appendChild(this.videoInput);
        }
        
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'time-display';
        this.timeDisplay.id = 'timeDisplay';
        this.timeDisplay.textContent = '0:00 / 0:00';
        
        this.speedBtn = this.createButton('speedBtn', '1x', 'Vitesse de lecture', 'speed-btn');
        
        this.leftControls.appendChild(this.playPauseBtn);
        this.leftControls.appendChild(this.timeDisplay);
        this.leftControls.appendChild(this.speedBtn);
        
        // Contrôles droite
        this.rightControls = document.createElement('div');
        this.rightControls.className = 'right-controls';
        
        // Contrôle de volume
        this.volumeControl = document.createElement('div');
        this.volumeControl.className = 'volume-control';
        
        this.muteBtn = this.createButton('muteBtn', '🔊', 'Muet');
        
        this.volumeSlider = document.createElement('input');
        this.volumeSlider.type = 'range';
        this.volumeSlider.id = 'volumeSlider';
        this.volumeSlider.className = 'volume-slider';
        this.volumeSlider.min = '0';
        this.volumeSlider.max = '1';
        this.volumeSlider.step = '0.1';
        this.volumeSlider.value = '1';
        
        this.volumeControl.appendChild(this.muteBtn);
        this.volumeControl.appendChild(this.volumeSlider);
        
        this.pipBtn = this.createButton('pipBtn', '📺', 'Picture-in-Picture', 'pip-btn');
        this.settingsBtn = this.createButton('settingsBtn', '⚙️', 'Paramètres', 'settings-btn');
        this.fullscreenBtn = this.createButton('fullscreenBtn', '⛶', 'Plein écran', 'fullscreen-btn');
        
        this.rightControls.appendChild(this.volumeControl);
        this.rightControls.appendChild(this.pipBtn);
        this.rightControls.appendChild(this.settingsBtn);
        this.rightControls.appendChild(this.fullscreenBtn);
        
        // Assembler le conteneur de boutons
        this.buttonsContainer.appendChild(this.leftControls);
        this.buttonsContainer.appendChild(this.rightControls);
        
        // Assembler les contrôles
        this.controls.appendChild(this.progressContainer);
        this.controls.appendChild(this.buttonsContainer);
        
        // Créer les menus
        this.qualityMenu = this.createMenu('quality-menu', [
            { value: 'auto', text: 'Auto' },
            { value: '1080p', text: '1080p' },
            { value: '720p', text: '720p' },
            { value: '480p', text: '480p' },
            { value: '360p', text: '360p' }
        ], 'quality-option', 'data-quality');
        
        this.speedMenu = this.createMenu('speed-menu', [
            { value: '0.25', text: '0.25x' },
            { value: '0.5', text: '0.5x' },
            { value: '0.75', text: '0.75x' },
            { value: '1.0', text: 'Normal (1x)' },
            { value: '1.25', text: '1.25x' },
            { value: '1.5', text: '1.5x' },
            { value: '2.0', text: '2x' }
        ], 'speed-option', 'data-speed');
        
        // Assembler tout dans le conteneur
        this.container.appendChild(this.video);
        this.container.appendChild(this.playPauseIndicator);
        this.container.appendChild(this.volumeIndicator);
        this.container.appendChild(this.seekIndicator);
        this.container.appendChild(this.previewContainer);
        this.container.appendChild(this.thumbnailCanvas);
        this.container.appendChild(this.controls);
        this.container.appendChild(this.qualityMenu);
        this.container.appendChild(this.speedMenu);
    }

    /**
     * Crée un bouton avec l'ID, le texte et le titre spécifiés
     */
    createButton(id, text, title, className = '') {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.title = title;
        if (className) {
            button.className = className;
        }
        return button;
    }

    /**
     * Crée un indicateur d'action
     */
    createActionIndicator(id, iconText, text) {
        const indicator = document.createElement('div');
        indicator.className = 'action-indicator';
        indicator.id = id;
        
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = iconText;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = text;
        
        indicator.appendChild(icon);
        indicator.appendChild(textSpan);
        
        return indicator;
    }

    /**
     * Crée un indicateur d'action pour le volume avec une barre de volume
     */
    createVolumeActionIndicator() {
        const indicator = this.createActionIndicator('volumeIndicator', '🔊', 'Volume');
        
        const volumeLevel = document.createElement('div');
        volumeLevel.className = 'volume-level';
        
        const volumeFill = document.createElement('div');
        volumeFill.className = 'volume-fill';
        volumeFill.id = 'volumeFill';
        
        volumeLevel.appendChild(volumeFill);
        indicator.appendChild(volumeLevel);
        
        return indicator;
    }

    /**
     * Crée un menu avec les options spécifiées
     */
    createMenu(menuClass, options, optionClass, dataAttribute) {
        const menu = document.createElement('div');
        menu.className = menuClass;
        
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = optionClass;
            optionElement.setAttribute(dataAttribute, option.value);
            optionElement.textContent = option.text;
            menu.appendChild(optionElement);
        });
        
        return menu;
    }

    /**
     * Initialise tous les événements du lecteur
     */
    initEvents() {
        // Événements de contrôle de base
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.video.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });
        
        // Chargement de vidéo
        if (this.options.allowVideoSelection) {
            this.loadVideoBtn.addEventListener('click', () => this.videoInput.click());
            this.videoInput.addEventListener('change', (e) => this.handleVideoUpload(e));
        }
        
        // Barre de progression
        this.video.addEventListener('timeupdate', () => this.updateProgressBar());
        this.progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        
        // Prévisualisation au survol
        this.progressContainer.addEventListener('mousemove', (e) => this.showPreview(e));
        this.progressContainer.addEventListener('mouseleave', () => this.hidePreview());
        this.progressContainer.addEventListener('click', () => {
            setTimeout(() => this.hidePreview(), 200);
        });
        
        // Contrôle du volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', () => this.changeVolume());
        
        // Plein écran
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());
        
        // Picture-in-Picture
        this.pipBtn.addEventListener('click', () => this.togglePictureInPicture());
        this.video.addEventListener('enterpictureinpicture', () => this.onEnterPiP());
        this.video.addEventListener('leavepictureinpicture', () => this.onLeavePiP());
        
        // Contrôles de qualité
        this.settingsBtn.addEventListener('click', (e) => this.toggleQualityMenu(e));
        this.qualityMenu.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', () => {
                const quality = option.getAttribute('data-quality');
                this.changeQuality(quality);
                this.updateActiveMenuOption(this.qualityMenu, 'quality-option', quality, 'data-quality');
                this.qualityMenu.style.display = 'none';
            });
        });
        
        // Contrôles de vitesse
        this.speedBtn.addEventListener('click', (e) => this.toggleSpeedMenu(e));
        this.speedMenu.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', () => {
                const speed = parseFloat(option.getAttribute('data-speed'));
                this.changePlaybackSpeed(speed);
                this.updateActiveMenuOption(this.speedMenu, 'speed-option', speed.toString(), 'data-speed');
                this.speedMenu.style.display = 'none';
            });
        });
        
        // Masquer les menus en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!this.qualityMenu.contains(e.target) && e.target !== this.settingsBtn) {
                this.qualityMenu.style.display = 'none';
            }
            if (!this.speedMenu.contains(e.target) && e.target !== this.speedBtn) {
                this.speedMenu.style.display = 'none';
            }
        });
        
        // Auto-hide des contrôles
        this.container.addEventListener('mousemove', () => this.showControls());
        this.controls.addEventListener('mouseenter', () => {
            this.isMouseOverControls = true;
            clearTimeout(this.controlsTimeout);
        });
        this.controls.addEventListener('mouseleave', () => {
            this.isMouseOverControls = false;
            if (!this.video.paused) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        this.video.addEventListener('pause', () => this.showControls());
        this.video.addEventListener('play', () => {
            if (!this.isMouseOverControls) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        this.container.addEventListener('mouseleave', () => {
            if (!this.video.paused) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        
        // Focus et raccourcis clavier
        this.container.tabIndex = "-1";
        this.video.addEventListener('click', () => this.container.focus());
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        this.controls.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.stopPropagation();
            }
        });
        
        // Init
        window.addEventListener('load', () => {
            // Initialiser le menu de vitesse
            this.updateActiveMenuOption(this.speedMenu, 'speed-option', '1.0', 'data-speed');
            
            // Check PiP support
            if (!this.isPictureInPictureSupported()) {
                this.pipBtn.disabled = true;
                this.pipBtn.title = 'Picture-in-Picture non supporté';
                this.pipBtn.style.opacity = '0.5';
            }
        });
    }

    // ======= Fonctions de contrôle de base =======
    
    /**
     * Bascule entre lecture et pause
     */
    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
            this.playPauseBtn.textContent = '⏸️';
            this.updatePlayPauseIndicator(true);
        } else {
            this.video.pause();
            this.playPauseBtn.textContent = '▶️';
            this.updatePlayPauseIndicator(false);
        }
    }

    /**
     * Gère le téléchargement d'une vidéo
     */
    handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Stocker le fichier courant
        this.currentVideoFile = file;
        
        // Révoquer l'ancien URL si existant
        if (this.currentVideoURL) {
            URL.revokeObjectURL(this.currentVideoURL);
        }
        
        this.currentVideoURL = URL.createObjectURL(file);
        this.video.src = this.currentVideoURL;
        
        // Réinitialiser l'état
        this.video.pause();
        this.playPauseBtn.textContent = '▶️';
        this.progressBar.style.width = '0%';
        
        // Réinitialiser la qualité
        this.currentQuality = 'auto';
        this.updateActiveMenuOption(this.qualityMenu, 'quality-option', 'auto', 'data-quality');
        
        // Réinitialiser la vitesse
        this.changePlaybackSpeed(1.0);
        this.updateActiveMenuOption(this.speedMenu, 'speed-option', '1.0', 'data-speed');
        
        // Réinitialiser le cache des vignettes
        this.thumbnails = {};
    }

    /**
     * Met à jour la barre de progression
     */
    updateProgressBar() {
        const percentage = (this.video.currentTime / this.video.duration) * 100;
        this.progressBar.style.width = `${percentage}%`;
        this.updateTimeDisplay();
    }

    /**
     * Navigue à une position spécifique
     */
    seekToPosition(event) {
        const rect = this.progressContainer.getBoundingClientRect();
        const clickPosition = (event.clientX - rect.left) / rect.width;
        this.video.currentTime = clickPosition * this.video.duration;
        this.updateTimeDisplay();
    }

    /**
     * Actions à effectuer lorsqu'une vidéo est chargée
     */
    onVideoLoaded() {
        this.progressBar.style.width = '0%';
        this.updateTimeDisplay();
        
        // Message initial pour la prévisualisation
        this.previewThumbnail.innerHTML = 'Chargement des vignettes...';
        
        // Générer les vignettes après un court délai
        setTimeout(() => {
            this.generateThumbnails();
        }, 1000);
    }

    /**
     * Bascule le mode muet
     */
    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeUI();
        this.updateVolumeIndicator();
    }

    /**
     * Change le volume
     */
    changeVolume() {
        this.video.volume = this.volumeSlider.value;
        this.video.muted = (this.video.volume === 0);
        this.updateVolumeUI();
        this.updateVolumeIndicator();
    }

    /**
     * Met à jour l'UI du volume
     */
    updateVolumeUI() {
        if (this.video.muted || this.video.volume === 0) {
            this.muteBtn.textContent = '🔇';
            this.volumeSlider.value = 0;
        } else {
            if (this.video.volume > 0.5) {
                this.muteBtn.textContent = '🔊';
            } else {
                this.muteBtn.textContent = '🔉';
            }
            
            if (!this.video.muted) {
                this.volumeSlider.value = this.video.volume;
            }
        }
    }

    // ======= Fonctions de contrôle avancées =======

    /**
     * Bascule en mode plein écran
     */
    toggleFullscreen() {
        if (document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen(this.container);
        }
    }

    /**
     * Entre en mode plein écran
     */
    enterFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    /**
     * Sort du mode plein écran
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    /**
     * Met à jour le bouton de plein écran
     */
    updateFullscreenButton() {
        if (document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement) {
            this.fullscreenBtn.textContent = '⮽';
            this.fullscreenBtn.title = 'Quitter le plein écran';
        } else {
            this.fullscreenBtn.textContent = '⛶';
            this.fullscreenBtn.title = 'Plein écran';
        }
    }

    /**
     * Vérifie si le Picture-in-Picture est supporté
     */
    isPictureInPictureSupported() {
        return document.pictureInPictureEnabled && !this.video.disablePictureInPicture;
    }

    /**
     * Bascule le mode Picture-in-Picture
     */
    async togglePictureInPicture() {
        try {
            if (!this.isPictureInPictureSupported()) {
                this.showNotification('Picture-in-Picture non supporté par votre navigateur', '⚠️');
                return;
            }
            
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await this.video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Erreur lors de la bascule en mode Picture-in-Picture:', error);
            this.showNotification('Erreur: ' + error.message, '⚠️');
        }
    }

    /**
     * Gestionnaire pour l'entrée en mode PiP
     */
    onEnterPiP() {
        this.pipBtn.textContent = '⏏️';
        this.pipBtn.title = 'Quitter le Picture-in-Picture';
        this.showNotification('Picture-in-Picture activé', '📺');
    }

    /**
     * Gestionnaire pour la sortie du mode PiP
     */
    onLeavePiP() {
        this.pipBtn.textContent = '📺';
        this.pipBtn.title = 'Picture-in-Picture';
        this.showNotification('Picture-in-Picture désactivé', '📺');
    }

    /**
     * Bascule l'affichage du menu de qualité
     */
    toggleQualityMenu(event) {
        event.stopPropagation();
        
        // Masquer le menu de vitesse s'il est ouvert
        this.speedMenu.style.display = 'none';
        
        // Basculer la visibilité du menu de qualité
        if (this.qualityMenu.style.display === 'flex') {
            this.qualityMenu.style.display = 'none';
        } else {
            this.qualityMenu.style.display = 'flex';
            
            // Positionner correctement le menu
            this.qualityMenu.style.bottom = '60px';
            this.qualityMenu.style.right = '20px';
        }
    }

    /**
     * Change la qualité de la vidéo
     */
    changeQuality(quality) {
        if (quality === this.currentQuality || !this.currentVideoFile) return;
        
        const currentTime = this.video.currentTime;
        const isPaused = this.video.paused;
        
        // Simuler le changement de qualité (dans une vraie implémentation, on changerait la source)
        console.log(`Changement de qualité vers ${quality}`);
        this.currentQuality = quality;
        
        // Informer l'utilisateur du changement
        this.showQualityChangeNotification(quality);
        
        // Dans une vraie implémentation, on ajouterait un écouteur d'événements pour restaurer la position
    }

    /**
     * Affiche une notification de changement de qualité
     */
    showQualityChangeNotification(quality) {
        this.showNotification(`Qualité: ${quality}`, '⚙️');
    }

    /**
     * Bascule l'affichage du menu de vitesse
     */
    toggleSpeedMenu(event) {
        event.stopPropagation();
        
        // Masquer le menu de qualité s'il est ouvert
        this.qualityMenu.style.display = 'none';
        
        // Basculer la visibilité du menu de vitesse
        if (this.speedMenu.style.display === 'flex') {
            this.speedMenu.style.display = 'none';
        } else {
            this.speedMenu.style.display = 'flex';
            
            // Positionner correctement le menu
            const speedBtnRect = this.speedBtn.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            
            this.speedMenu.style.bottom = '60px';
            this.speedMenu.style.left = `${speedBtnRect.left - containerRect.left}px`;
        }
    }

    /**
     * Change la vitesse de lecture
     */
    changePlaybackSpeed(speed) {
        if (speed === this.currentSpeed) return;
        
        this.video.playbackRate = speed;
        this.currentSpeed = speed;
        this.speedBtn.textContent = `${speed}x`;
        
        this.showSpeedChangeNotification(speed);
    }

    /**
     * Affiche une notification de changement de vitesse
     */
    showSpeedChangeNotification(speed) {
        let speedText;
        let icon = '⏱️';
        
        if (speed < 1.0) {
            speedText = `Ralenti (${speed}x)`;
            icon = '🐢';
        } else if (speed > 1.0) {
            speedText = `Accéléré (${speed}x)`;
            icon = '🐇';
        } else {
            speedText = 'Vitesse normale';
            icon = '⏱️';
        }
        
        this.showNotification(speedText, icon);
    }

    /**
     * Met à jour l'option active dans un menu
     */
    updateActiveMenuOption(menu, optionClass, value, dataAttribute) {
        menu.querySelectorAll(`.${optionClass}`).forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute(dataAttribute) === value) {
                opt.classList.add('active');
            }
        });
    }

    /**
     * Affiche les contrôles
     */
    showControls() {
        this.controls.style.opacity = '1';
        this.controls.style.pointerEvents = 'auto';

        // Réinitialiser le timer
        clearTimeout(this.controlsTimeout);
        if (!this.video.paused) {
            this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
        }
    }

    /**
     * Cache les contrôles
     */
    hideControls() {
        // Ne pas masquer si la vidéo est en pause ou si la souris est sur les contrôles
        if (this.video.paused || this.isMouseOverControls) return;

        this.controls.style.opacity = '0';
        // Après la transition, masquer complètement pour empêcher les clics
        setTimeout(() => {
            if (this.controls.style.opacity === '0') {
                this.controls.style.pointerEvents = 'none';
            }
        }, 300);
    }

    /**
     * Met à jour l'affichage du temps
     */
    updateTimeDisplay() {
        const currentTime = this.formatTime(this.video.currentTime);
        const duration = this.formatTime(this.video.duration || 0);
        this.timeDisplay.textContent = `${currentTime} / ${duration}`;
    }

    /**
     * Formate le temps en minutes:secondes
     */
    formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    /**
     * Affiche une prévisualisation au survol de la barre de progression
     */
    showPreview(event) {
        // Afficher la prévisualisation
        this.previewContainer.style.display = 'flex';
        
        // Calculer la position relative du curseur dans la barre de progression
        const rect = this.progressContainer.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width;
        
        // Calculer la position horizontale de la prévisualisation
        const previewX = event.clientX - rect.left;
        this.previewContainer.style.left = `${previewX}px`;
        
        // Calculer le temps correspondant à la position
        const previewTimeInSeconds = this.video.duration * position;
        
        // Mettre à jour l'affichage du temps de prévisualisation
        this.previewTime.textContent = this.formatTime(previewTimeInSeconds);
        
        // Essayer d'extraire une vignette pour ce temps
        this.extractThumbnail(previewTimeInSeconds).then(dataURL => {
            if (dataURL) {
                // Si une vignette est disponible, l'afficher
                this.previewThumbnail.innerHTML = `<img src="${dataURL}" alt="Prévisualisation">`;
            } else {
                // Sinon, afficher un message
                this.previewThumbnail.innerHTML = `Chargement...`;
            }
        });
    }

    /**
     * Cache la prévisualisation
     */
    hidePreview() {
        this.previewContainer.style.display = 'none';
    }

    /**
     * Extrait une image de la vidéo à un moment précis
     */
    async extractThumbnail(time) {
        // Vérifier si la vignette est déjà extraite pour ce temps
        const roundedTime = Math.floor(time);
        if (this.thumbnails[roundedTime]) {
            return this.thumbnails[roundedTime];
        }
        
        // Si la vidéo n'est pas chargée ou la durée est invalide, retourner null
        if (!this.video.duration || isNaN(this.video.duration) || time > this.video.duration) {
            return null;
        }
        
        try {
            // Créer un élément vidéo temporaire pour ne pas perturber la lecture actuelle
            const tempVideo = document.createElement('video');
            tempVideo.src = this.video.src;
            tempVideo.currentTime = time;
            
            // Définir une promesse pour attendre que la vidéo soit prête
            return new Promise((resolve) => {
                tempVideo.addEventListener('loadeddata', function onLoaded() {
                    // Dessiner la frame sur le canvas
                    this.thumbnailContext.drawImage(tempVideo, 0, 0, this.thumbnailCanvas.width, this.thumbnailCanvas.height);
                    
                    // Convertir le canvas en URL de données
                    const dataURL = this.thumbnailCanvas.toDataURL('image/jpeg');
                    
                    // Stocker l'URL pour une utilisation future
                    this.thumbnails[roundedTime] = dataURL;
                    
                    // Nettoyer
                    tempVideo.removeEventListener('loadeddata', onLoaded);
                    tempVideo.pause();
                    tempVideo.src = '';
                    tempVideo.load();
                    
                    resolve(dataURL);
                }.bind(this));
                
                // Gérer le cas où le chargement échoue
                tempVideo.addEventListener('error', () => {
                    resolve(null);
                });
                
                // Démarrer le chargement de la vidéo
                tempVideo.load();
            });
        } catch (error) {
            console.error('Erreur lors de l\'extraction de la vignette:', error);
            return null;
        }
    }

    /**
     * Génère des vignettes à intervalles réguliers pour la prévisualisation
     */
    generateThumbnails() {
        if (!this.video.duration || isNaN(this.video.duration)) return;
        
        // Générer des vignettes tous les 5% de la vidéo (ou à un autre intervalle)
        const interval = Math.max(5, Math.floor(this.video.duration / 20));
        
        // Utiliser setTimeout pour ne pas bloquer l'interface
        let i = 0;
        const generateNext = () => {
            const time = i * interval;
            if (time < this.video.duration) {
                this.extractThumbnail(time).then(() => {
                    i++;
                    setTimeout(generateNext, 100);
                });
            }
        };
        
        // Commencer le processus de génération
        generateNext();
    }

    /**
     * Met à jour l'indicateur de lecture/pause
     */
    updatePlayPauseIndicator(isPlaying) {
        const icon = this.playPauseIndicator.querySelector('.icon');
        const text = this.playPauseIndicator.querySelector('.text');
        
        icon.textContent = isPlaying ? '▶️' : '⏸️';
        text.textContent = isPlaying ? 'Lecture' : 'Pause';
        
        this.showIndicator(this.playPauseIndicator);
    }

    /**
     * Met à jour l'indicateur de volume
     */
    updateVolumeIndicator() {
        const icon = this.volumeIndicator.querySelector('.icon');
        const text = this.volumeIndicator.querySelector('.text');
        const volumeFill = this.volumeIndicator.querySelector('.volume-fill');
        
        if (this.video.muted || this.video.volume === 0) {
            icon.textContent = '🔇';
            text.textContent = 'Muet';
            volumeFill.style.width = '0%';
        } else {
            if (this.video.volume > 0.5) {
                icon.textContent = '🔊';
            } else {
                icon.textContent = '🔉';
            }
            text.textContent = `${Math.round(this.video.volume * 100)}%`;
            volumeFill.style.width = `${this.video.volume * 100}%`;
        }
        
        this.showIndicator(this.volumeIndicator);
    }

    /**
     * Met à jour l'indicateur de recherche (avance/retour)
     */
    updateSeekIndicator(direction, seconds) {
        const icon = this.seekIndicator.querySelector('.icon');
        const text = this.seekIndicator.querySelector('.text');
        
        if (direction === 'forward') {
            icon.textContent = '⏩';
            text.textContent = `+${seconds}s`;
        } else {
            icon.textContent = '⏪';
            text.textContent = `-${seconds}s`;
        }
        
        this.showIndicator(this.seekIndicator);
    }

    /**
     * Affiche un indicateur temporairement
     */
    showIndicator(indicator, duration = 700) {
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, duration);
    }

    /**
     * Affiche une notification personnalisée
     */
    showNotification(message, icon = '📌') {
        // Créer un élément de notification temporaire
        const notification = document.createElement('div');
        notification.className = 'action-indicator';
        notification.style.opacity = '1';
        
        notification.innerHTML = `
            <span class="icon">${icon}</span>
            <span class="text">${message}</span>
        `;
        
        this.container.appendChild(notification);
        
        // Faire disparaître la notification après un délai
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                this.container.removeChild(notification);
            }, 300);
        }, 2000);
    }

    /**
     * Gère les raccourcis clavier
     */
    handleKeyboardShortcuts(event) {
        // Vérifier si le focus est sur le player ou ses éléments
        const isPlayerFocused = this.container.contains(document.activeElement) ||
                              document.activeElement === document.body;
        
        if (!isPlayerFocused) return;
        
        switch (event.code) {
            case 'Space': // Barre d'espace pour play/pause
                event.preventDefault(); // Empêcher le défilement de la page
                this.togglePlayPause();
                break;
                
            case 'ArrowRight': // Flèche droite pour avancer
                event.preventDefault();
                const forwardSeconds = 5;
                this.video.currentTime = Math.min(this.video.currentTime + forwardSeconds, this.video.duration);
                this.updateSeekIndicator('forward', forwardSeconds);
                this.updateTimeDisplay();
                this.showControls();
                break;
                
            case 'ArrowLeft': // Flèche gauche pour reculer
                event.preventDefault();
                const backwardSeconds = 5;
                this.video.currentTime = Math.max(this.video.currentTime - backwardSeconds, 0);
                this.updateSeekIndicator('backward', backwardSeconds);
                this.updateTimeDisplay();
                this.showControls();
                break;
                
            case 'ArrowUp': // Flèche haut pour augmenter le volume
                event.preventDefault();
                this.video.volume = Math.min(this.video.volume + 0.1, 1);
                this.video.muted = false;
                this.updateVolumeUI();
                this.updateVolumeIndicator();
                this.showControls();
                break;
                
            case 'ArrowDown': // Flèche bas pour diminuer le volume
                event.preventDefault();
                this.video.volume = Math.max(this.video.volume - 0.1, 0);
                if (this.video.volume === 0) {
                    this.video.muted = true;
                }
                this.updateVolumeUI();
                this.updateVolumeIndicator();
                this.showControls();
                break;
                
            case 'KeyP': // Touche P pour Picture-in-Picture
                event.preventDefault();
                this.togglePictureInPicture();
                this.showControls();
                break;
                
            case 'KeyF': // Touche F pour plein écran
                event.preventDefault();
                this.toggleFullscreen();
                this.showControls();
                break;
                
            case 'KeyM': // Touche M pour mute
                event.preventDefault();
                this.toggleMute();
                this.showControls();
                break;
                
            case 'Period': // Touche > pour accélérer
                if (event.shiftKey) {
                    event.preventDefault();
                    const nextSpeed = this.getNextSpeed(this.currentSpeed, 'up');
                    this.changePlaybackSpeed(nextSpeed);
                    this.showControls();
                }
                break;
                
            case 'Comma': // Touche < pour ralentir
                if (event.shiftKey) {
                    event.preventDefault();
                    const nextSpeed = this.getNextSpeed(this.currentSpeed, 'down');
                    this.changePlaybackSpeed(nextSpeed);
                    this.showControls();
                }
                break;
                
            case 'KeyR': // Touche R pour vitesse normale
                event.preventDefault();
                this.changePlaybackSpeed(1.0);
                this.showControls();
                break;
        }
    }

    /**
     * Calcule la vitesse suivante en fonction de la direction
     */
    getNextSpeed(current, direction) {
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        let currentIndex = speeds.indexOf(current);
        
        if (currentIndex === -1) {
            // Si la vitesse actuelle n'est pas dans la liste, trouver l'index le plus proche
            for (let i = 0; i < speeds.length; i++) {
                if (speeds[i] > current) {
                    currentIndex = i - 1;
                    break;
                }
            }
            if (currentIndex === -1) currentIndex = speeds.length - 1;
        }
        
        if (direction === 'up') {
            return speeds[Math.min(currentIndex + 1, speeds.length - 1)];
        } else {
            return speeds[Math.max(currentIndex - 1, 0)];
        }
    }

    // ======= Méthodes publiques =======

    /**
     * Charge une nouvelle source vidéo
     * @param {string} source - URL de la vidéo
     */
    loadSource(source) {
        this.video.src = source;
        this.currentQuality = 'auto';
        this.changePlaybackSpeed(1.0);
        this.thumbnails = {};
        
        this.updateActiveMenuOption(this.qualityMenu, 'quality-option', 'auto', 'data-quality');
        this.updateActiveMenuOption(this.speedMenu, 'speed-option', '1.0', 'data-speed');
    }

    /**
     * Démarre la lecture
     */
    play() {
        this.video.play();
    }

    /**
     * Met en pause la lecture
     */
    pause() {
        this.video.pause();
    }

    /**
     * Définit le volume (0 à 1)
     * @param {number} level - Niveau de volume (0 à 1)
     */
    setVolume(level) {
        if (level < 0) level = 0;
        if (level > 1) level = 1;
        
        this.video.volume = level;
        this.video.muted = (level === 0);
        this.updateVolumeUI();
    }

    /**
     * Définit la position de lecture en secondes
     * @param {number} time - Position en secondes
     */
    seekTo(time) {
        if (time < 0) time = 0;
        if (time > this.video.duration) time = this.video.duration;
        
        this.video.currentTime = time;
        this.updateTimeDisplay();
    }

    /**
     * Définit la vitesse de lecture
     * @param {number} speed - Vitesse de lecture (0.25 à 2.0)
     */
    setPlaybackSpeed(speed) {
        this.changePlaybackSpeed(speed);
    }
}

// Exposer la classe pour l'utilisation globale
window.CustomVideoPlayer = CustomVideoPlayer;
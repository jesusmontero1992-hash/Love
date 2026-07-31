document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ANIMACIÓN DE ENTRADA (FADE IN) ---
    const fadeElements = document.querySelectorAll('.fade-in-element');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    fadeElements.forEach(el => observer.observe(el));


    // --- 2. CONTADOR DE TIEMPO (24/07/2026 a la 1:00 PM - Hora Caracas) ---
    const startDate = new Date("2026-07-24T13:00:00-04:00").getTime();
    let serverTimeOffset = 0;

    async function fetchGlobalTime(retryCount = 0) {
        try {
            const response = await fetch('https://worldtimeapi.org/api/timezone/America/Caracas');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            serverTimeOffset = (data.unixtime * 1000) - Date.now();
        } catch (error) {
            console.error("Error fetching global time:", error);
            // Reintenta la obtención del tiempo si falla, con un límite de reintentos.
            if (retryCount < 5) setTimeout(() => fetchGlobalTime(retryCount + 1), 5000);
        }
    }
    fetchGlobalTime();

    function updateCounter() {
        const now = new Date(Date.now() + serverTimeOffset).getTime();
        let diff = now - startDate;
        if (diff < 0) diff = 0;

        // --- Lógica de cálculo de tiempo mejorada y más precisa ---
        const startObj = new Date(startDate);
        const nowGlobal = new Date(now);

        let years = nowGlobal.getFullYear() - startObj.getFullYear();
        let months = nowGlobal.getMonth() - startObj.getMonth();
        let days = nowGlobal.getDate() - startObj.getDate();
        let hours = nowGlobal.getHours() - startObj.getHours();
        let minutes = nowGlobal.getMinutes() - startObj.getMinutes();
        let seconds = nowGlobal.getSeconds() - startObj.getSeconds();

        // Ajustes para valores negativos (cuando se cruza un límite de tiempo)
        if (seconds < 0) { minutes--; seconds += 60; }
        if (minutes < 0) { hours--; minutes += 60; }
        if (hours < 0) { days--; hours += 24; }
        if (days < 0) {
            months--;
            // Obtener los días del mes anterior para un cálculo preciso
            days += new Date(nowGlobal.getFullYear(), nowGlobal.getMonth(), 0).getDate();
        }
        if (months < 0) { years--; months += 12; }

        const secondsTotal = Math.floor(diff / 1000);
        const minutesTotal = Math.floor(secondsTotal / 60);
        const hoursTotal = Math.floor(minutesTotal / 60);

        document.getElementById('years').textContent = String(years).padStart(2, '0');
        document.getElementById('months').textContent = String(months % 12).padStart(2, '0');
        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }
    setInterval(updateCounter, 1000); // Inicia el contador inmediatamente
    updateCounter(); // Ejecuta una vez al cargar para evitar el retraso de 1 segundo
    // --- 3. CANVAS DE FONDO (PARTÍCULAS ESTELARES) ---
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5;
            this.speedX = (Math.random() - 0.5) * 0.2;
            this.speedY = (Math.random() - 0.5) * 0.2;
            this.alpha = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x < 0) this.x = canvas.width; if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height; if (this.y > canvas.height) this.y = 0;
        }
        draw() {
            ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }
    for (let i = 0; i < 60; i++) particlesArray.push(new Particle());
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();


    // --- 4. GALERÍA Y ZOOM ---
    const carruselContenedor = document.getElementById('carruselContenedor');
    const carPrev = document.getElementById('carPrev');
    const carNext = document.getElementById('carNext');

    const photoZoomOverlay = document.getElementById('photoZoomOverlay');
    const zoomImgElement = document.getElementById('zoomImgElement');
    const zoomDescElement = document.getElementById('zoomDescElement');
    const closeZoom = document.getElementById('closeZoom');

    const galleryItemsHTML = document.querySelectorAll('.gallery-item');
    let galleryList = [];

    function parseImageURL(url) {
        if (url && url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://lh3.googleusercontent.com/d/${match[1]}`;
            }
        }
        return url;
    }

    galleryItemsHTML.forEach((item, index) => {
        const rawUrl = item.getAttribute('data-url');
        const desc = item.getAttribute('data-desc');
        const imgElement = item.querySelector('img');

        if (!rawUrl || rawUrl.trim() === "") {
            // Estado temporal cuando no hay foto configurada
            item.classList.add('empty-gallery-slot');
            if (imgElement) imgElement.style.display = 'none';

            // Crear diseño visual interno de aviso
            if (!item.querySelector('.empty-slot-content')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'empty-slot-content';
                placeholder.innerHTML = `<i class="fa-solid fa-star-of-david"></i><span>Esperando que un nuevo momento ilumine esta galería.</span>`;
                item.appendChild(placeholder);
            }

            galleryList.push({ url: "", desc: "Momento por grabar..." });
        } else {
            const processedUrl = parseImageURL(rawUrl);
            galleryList.push({ url: processedUrl, desc });
            if (imgElement) {
                imgElement.src = processedUrl;
            }
        }

        item.addEventListener('click', () => {
            const currentItem = galleryList[index];
            if (currentItem.url !== "") {
                currentZoomIndex = index;
                openZoomModal(currentZoomIndex);
            }
        });
    });

    let currentZoomIndex = 0;
    function openZoomModal(index) {
        currentZoomIndex = index;
        const item = galleryList[currentZoomIndex];
        if (item.url) {
            zoomImgElement.src = item.url;
            zoomDescElement.textContent = item.desc;
            photoZoomOverlay.classList.add('open');
        }
    }

    const zoomCard = photoZoomOverlay.querySelector('.photo-zoom-card');
    const prevZoomBtn = document.createElement('button');
    prevZoomBtn.className = 'zoom-nav-btn zoom-prev';
    prevZoomBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

    const nextZoomBtn = document.createElement('button');
    nextZoomBtn.className = 'zoom-nav-btn zoom-next';
    nextZoomBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    if (!zoomCard.querySelector('.zoom-prev')) {
        zoomCard.appendChild(prevZoomBtn);
        zoomCard.appendChild(nextZoomBtn);
    }

    prevZoomBtn.addEventListener('click', () => {
        currentZoomIndex = (currentZoomIndex - 1 + galleryList.length) % galleryList.length;
        if (galleryList[currentZoomIndex].url !== "") openZoomModal(currentZoomIndex);
    });

    nextZoomBtn.addEventListener('click', () => {
        currentZoomIndex = (currentZoomIndex + 1) % galleryList.length;
        if (galleryList[currentZoomIndex].url !== "") openZoomModal(currentZoomIndex);
    });

    closeZoom.addEventListener('click', () => photoZoomOverlay.classList.remove('open'));
    carPrev.addEventListener('click', () => carruselContenedor.scrollBy({ left: -250, behavior: 'smooth' }));
    carNext.addEventListener('click', () => carruselContenedor.scrollBy({ left: 250, behavior: 'smooth' }));

    // --- 5. REPRODUCTOR DE MÚSICA (YOUTUBE MUSIC PLAYLIST) ---
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const trackTitle = document.getElementById('trackTitle');
    const trackArtist = document.getElementById('trackArtist');
    const vinylDisc = document.getElementById('vinylDisc');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const volumeBar = document.getElementById('volumeBar');
    const muteBtn = document.getElementById('muteBtn');
    const volumeIcon = document.getElementById('volumeIcon');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const loopBtn = document.getElementById('loopBtn');
    const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
    const playlistContainer = document.getElementById('playlistContainer');
    const playlistTracksList = document.getElementById('playlistTracksList');

    const youtubePlaylistId = "PLBfxZeb0_O9Y";

    let ytPlayer = null;
    let progressTimer = null;
    let isShuffle = false, isLoop = false;

    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = function () {
        ytPlayer = new YT.Player('youtube-hidden-player', {
            height: '0',
            width: '0',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'fs': 0,
                'listType': 'playlist',
                'list': youtubePlaylistId
            },
            events: {
                'onReady': () => {
                    updateTrackInfo();
                    setTimeout(buildPlaylistUI, 1200);
                },
                'onStateChange': onPlayerStateChange
            }
        });
    };

    // Control del acordeón desplegable limpio mediante clases CSS
    togglePlaylistBtn.addEventListener('click', () => {
        playlistContainer.classList.toggle('playlist-open');
        if (playlistContainer.classList.contains('playlist-open')) {
            buildPlaylistUI();
        }
    });

    function buildPlaylistUI() {
        if (!ytPlayer || typeof ytPlayer.getPlaylist !== 'function') return;
        const videoIds = ytPlayer.getPlaylist();

        if (!videoIds || videoIds.length === 0) {
            setTimeout(buildPlaylistUI, 800);
            return;
        }

        if (!playlistTracksList) return;

        playlistTracksList.innerHTML = '';
        videoIds.forEach((id, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'playlist-track-item';

            const currentIndex = ytPlayer.getPlaylistIndex ? ytPlayer.getPlaylistIndex() : 0;
            if (index === currentIndex) {
                trackItem.classList.add('active-track');
            }

            trackItem.innerHTML = `<span><i class="fa-solid fa-music"></i> <span id="track-name-${index}">Pista ${index + 1}</span></span> <small>Reproducir</small>`;

            trackItem.addEventListener('click', () => {
                ytPlayer.playVideoAt(index);
                playAudio();
                document.querySelectorAll('.playlist-track-item').forEach(el => el.classList.remove('active-track'));
                trackItem.classList.add('active-track');
            });

            playlistTracksList.appendChild(trackItem);

            fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
                .then(response => response.json())
                .then(data => {
                    const titleSpan = document.getElementById(`track-name-${index}`);
                    if (titleSpan && data.title) {
                        titleSpan.textContent = data.title;
                    }
                })
                .catch(() => { });
        });
    }

    function updateTrackInfo() {
        if (ytPlayer && typeof ytPlayer.getVideoData === 'function') {
            const data = ytPlayer.getVideoData();
            if (data && data.title && data.title !== "") {
                trackTitle.textContent = data.title;
                trackArtist.textContent = data.author || "Montero Studio";
            }
        }
        buildPlaylistUI();
    }

    function playAudio() {
        if (!ytPlayer) return;
        ytPlayer.playVideo();
        playIcon.className = "fa-solid fa-pause";
        vinylDisc.style.animationPlayState = "running";
        startProgressTracking();
        updateTrackInfo();
    }

    function pauseAudio() {
        if (!ytPlayer) return;
        ytPlayer.pauseVideo();
        playIcon.className = "fa-solid fa-play";
        vinylDisc.style.animationPlayState = "paused";
        stopProgressTracking();
    }

    playBtn.addEventListener('click', () => {
        const state = ytPlayer ? ytPlayer.getPlayerState() : -1;
        if (state === YT.PlayerState.PLAYING) {
            pauseAudio();
        } else {
            playAudio();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (ytPlayer && ytPlayer.nextVideo) {
            ytPlayer.nextVideo();
            setTimeout(updateTrackInfo, 800);
            playAudio();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (ytPlayer && ytPlayer.previousVideo) {
            ytPlayer.previousVideo();
            setTimeout(updateTrackInfo, 800);
            playAudio();
        }
    });

    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            updateTrackInfo();
            playIcon.className = "fa-solid fa-pause";
            vinylDisc.style.animationPlayState = "running";
            startProgressTracking();
        } else if (event.data === YT.PlayerState.PAUSED) {
            playIcon.className = "fa-solid fa-play";
            vinylDisc.style.animationPlayState = "paused";
            stopProgressTracking();
        } else if (event.data === YT.PlayerState.ENDED) {
            if (isLoop) {
                ytPlayer.playVideo();
            } else {
                nextBtn.click();
            }
        }
    }

    function startProgressTracking() {
        stopProgressTracking();
        progressTimer = setInterval(() => {
            if (ytPlayer && ytPlayer.getDuration && ytPlayer.getCurrentTime) {
                const current = ytPlayer.getCurrentTime();
                const duration = ytPlayer.getDuration();
                if (duration) {
                    progressBar.value = (current / duration) * 100;
                    currentTimeEl.textContent = formatTime(current);
                    durationTimeEl.textContent = formatTime(duration);
                }
            }
        }, 500);
    }

    function stopProgressTracking() {
        if (progressTimer) clearInterval(progressTimer);
    }

    progressBar.addEventListener('input', () => {
        if (ytPlayer && ytPlayer.getDuration) {
            const duration = ytPlayer.getDuration();
            const newTime = (progressBar.value / 100) * duration;
            ytPlayer.seekTo(newTime, true);
        }
    });

    volumeBar.addEventListener('input', () => {
        if (ytPlayer && ytPlayer.setVolume) {
            ytPlayer.setVolume(volumeBar.value * 100);
            updateVolumeIcon();
        }
    });

    muteBtn.addEventListener('click', () => {
        if (!ytPlayer) return;
        if (ytPlayer.isMuted()) {
            ytPlayer.unMute();
            volumeBar.value = 1;
        } else {
            ytPlayer.mute();
            volumeBar.value = 0;
        }
        updateVolumeIcon();
    });

    function updateVolumeIcon() {
        if (volumeBar.value == 0 || (ytPlayer && ytPlayer.isMuted())) {
            volumeIcon.className = "fa-solid fa-volume-xmark";
        } else {
            volumeIcon.className = "fa-solid fa-volume-high";
        }
    }

    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active-mode', isShuffle);
        if (ytPlayer && ytPlayer.setShuffle) {
            ytPlayer.setShuffle(isShuffle);
        }
    });

    loopBtn.addEventListener('click', () => {
        isLoop = !isLoop;
        loopBtn.classList.toggle('active-mode', isLoop);
    });

    function formatTime(s) {
        if (isNaN(s) || s === null || s === undefined) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    }

});
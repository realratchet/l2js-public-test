(function () {
    const config = window.L2JS_CONFIG;
    const target = Date.parse(config.countdown);

    if (isNaN(target)) throw new Error(`Invalid countdown date '${config.countdown}'.`);

    const music = document.querySelector(".background-music");
    const musicButton = document.querySelector(".music-toggle");

    music.volume = 0.1;

    function updateMusicButton() {
        const playing = !music.paused;
        const label = playing ? "Mute background music" : "Play background music";

        musicButton.setAttribute("aria-pressed", String(playing));
        musicButton.setAttribute("aria-label", label);
        musicButton.title = label;
    }

    function removeMusicUnlock() {
        window.removeEventListener("pointerdown", unlockMusic);
        window.removeEventListener("keydown", unlockMusic);
    }

    async function playMusic() {
        try {
            await music.play();
            removeMusicUnlock();
        } catch (e) {
            if (e.name !== "NotAllowedError" && e.name !== "AbortError")
                console.warn(`Background music: ${e.message}`);
        }
    }

    function unlockMusic(event) {
        if (!musicButton.contains(event.target)) void playMusic();
    }

    musicButton.addEventListener("click", () => {
        if (music.paused) void playMusic();
        else {
            removeMusicUnlock();
            music.pause();
        }
    });
    music.addEventListener("play", updateMusicButton);
    music.addEventListener("pause", updateMusicButton);
    window.addEventListener("pointerdown", unlockMusic);
    window.addEventListener("keydown", unlockMusic);
    void playMusic();

    const fields = { days: [], hours: [], minutes: [], seconds: [] };

    document.querySelectorAll("[data-unit]").forEach(el => fields[el.dataset.unit].push(el));

    function setField(unit, value) { fields[unit].forEach(el => el.textContent = pad(value)); }

    function pad(value) { return String(value).padStart(2, "0"); }

    function tick() {
        const remaining = Math.max(0, target - Date.now());
        const seconds = Math.floor(remaining / 1000);

        setField("days", Math.floor(seconds / 86400));
        setField("hours", Math.floor(seconds / 3600) % 24);
        setField("minutes", Math.floor(seconds / 60) % 60);
        setField("seconds", seconds % 60);

        if (remaining === 0) {
            document.body.classList.add("opened");
            document.querySelector(".panel-heading").textContent = "The gates are open";
            const play = document.querySelector('[data-action="load"]');

            play.href = "game/";
            play.textContent = "Play now";
            document.querySelector(".timer").append(play);
            return;
        }

        setTimeout(tick, 1000 - Date.now() % 1000);
    }

    function formatDate(timeZone) {
        return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(target);
    }

    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    document.querySelectorAll(".date-server").forEach(el => el.textContent = formatDate("Europe/Vilnius"));

    if (formatDate(localZone) !== formatDate("Europe/Vilnius"))
        document.querySelector(".date-local").textContent = `${formatDate(localZone)} · your time`;

    tick();

    const elLore = document.querySelector(".lore-text");
    const elChapters = document.querySelector(".chapters");
    const elCurrent = document.querySelector(".current-chapter");
    const links = [];

    window.L2JS_LORE.forEach((section, index) => {
        const id = `chapter-${index}`;
        const title = document.createElement("h3");
        const [label, name] = section.title.includes(": ") ? section.title.split(": ") : ["", section.title];

        title.id = id;
        title.textContent = section.title;
        elLore.append(title);

        if (section.image) {
            const img = document.createElement("img");

            img.src = section.image;
            img.alt = "";
            img.loading = "lazy";
            img.className = `lore-art lore-art-${section.align}`;
            elLore.append(img);
        }

        elLore.append(...section.paragraphs.map(text => {
            const p = document.createElement("p");

            p.textContent = text;

            return p;
        }));

        const link = document.createElement("a");

        link.href = `#${id}`;
        link.innerHTML = `<span class="chapter-label"></span><span class="chapter-name"></span>`;
        link.firstChild.textContent = label;
        link.lastChild.textContent = name;
        elChapters.append(link);
        links.push(link);
    });

    function setActiveChapter(index) {
        links.forEach((link, i) => link.classList.toggle("active", i === index));
        elCurrent.textContent = window.L2JS_LORE[index].title;
        const top = links[index].offsetTop - elChapters.offsetTop;

        if (top < elChapters.scrollTop || top + links[index].offsetHeight > elChapters.scrollTop + elChapters.clientHeight)
            elChapters.scrollTop = top - elChapters.clientHeight / 2;
    }

    const headings = [...elLore.querySelectorAll("h3")];

    function updateActiveChapter() {
        let index = 0;

        headings.forEach((heading, i) => { if (heading.getBoundingClientRect().top < window.innerHeight * 0.35) index = i; });

        if (!links[index].classList.contains("active")) setActiveChapter(index);
    }

    window.addEventListener("scroll", updateActiveChapter, { passive: true });
    updateActiveChapter();

    const slides = document.querySelectorAll(".slide");
    let activeSlide = 0;

    function nextSlide() {
        slides[activeSlide].classList.remove("active");
        activeSlide = (activeSlide + 1) % slides.length;

        const slide = slides[activeSlide];

        slide.style.animation = "none";
        void slide.offsetWidth;
        slide.style.animation = "";
        slide.classList.add("active");
    }

    slides[0].classList.add("active");
    setInterval(nextSlide, 18000);

    const canvas = document.querySelector(".embers");
    const ctx = canvas.getContext("2d");
    const embers = [];
    let width = 0, height = 0, lastTime = 0;

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function spawn(initial) {
        return {
            x: Math.random() * width,
            y: initial ? Math.random() * height : height + 10,
            radius: 0.6 + Math.random() * 1.8,
            speed: 12 + Math.random() * 28,
            sway: 8 + Math.random() * 18,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.25 + Math.random() * 0.55
        };
    }

    function frame(time) {
        const dt = Math.min(0.05, (time - lastTime) / 1000);

        lastTime = time;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "lighter";

        for (let i = 0; i < embers.length; i++) {
            const e = embers[i];

            e.y -= e.speed * dt;
            e.phase += dt * 0.8;

            if (e.y < -10) embers[i] = spawn(false);

            const x = e.x + Math.sin(e.phase) * e.sway;
            const fade = Math.min(1, e.y / (height * 0.35));
            const glow = ctx.createRadialGradient(x, e.y, 0, x, e.y, e.radius * 4);

            glow.addColorStop(0, `rgba(255, 214, 150, ${e.alpha * fade})`);
            glow.addColorStop(1, "rgba(255, 140, 60, 0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, e.y, e.radius * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(frame);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        resize();
        window.addEventListener("resize", resize);

        for (let i = 0; i < 48; i++) embers.push(spawn(true));

        requestAnimationFrame(time => { lastTime = time; frame(time); });
    }
})();

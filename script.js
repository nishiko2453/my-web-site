(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  const POP_COLORS = ['#ff4d8d', '#ff8a00', '#ffd166', '#06d6a0', '#00bbf9', '#8338ec'];
  const LFC_COLORS = ['#c8102e', '#d4af37', '#e5c97b', '#8a0b20', '#ffffff'];

  // Enable progressive-enhancement motion styles when reduced motion is off
  if (!prefersReducedMotion) {
    document.documentElement.classList.add('motion-ready');
  }

  /* ========================================================================
     0. Retro Game Boot Screen Intro (First Visit Per Session)
     ======================================================================== */
  const initIntroBoot = (soundEngine) => {
    const overlay = document.getElementById('introOverlay');
    const isActive = document.documentElement.classList.contains('intro-active');

    if (!overlay || !isActive || prefersReducedMotion) {
      document.documentElement.classList.remove('intro-active');
      if (overlay) overlay.remove();
      return Promise.resolve();
    }

    try {
      window.sessionStorage.setItem('portfolio-intro-seen', 'true');
    } catch {
      // Ignore storage errors in restricted environments
    }

    const barFill = document.getElementById('introBarFill');
    const progressBar = document.getElementById('introProgressBar');
    const percentEl = document.getElementById('introPercent');
    const statusEl = document.getElementById('introStatus');
    const skipBtn = document.getElementById('introSkip');
    const logItems = Array.from(overlay.querySelectorAll('.intro-log'));

    return new Promise((resolve) => {
      let finished = false;
      let rafId = null;
      const timers = [];

      const schedule = (fn, delay) => {
        const id = window.setTimeout(fn, delay);
        timers.push(id);
        return id;
      };

      const setProgress = (value) => {
        const clamped = Math.max(0, Math.min(100, Math.round(value)));
        if (barFill) barFill.style.width = `${clamped}%`;
        if (progressBar) progressBar.setAttribute('aria-valuenow', String(clamped));
        if (percentEl) percentEl.textContent = `${String(clamped).padStart(2, '0')}%`;
      };

      const cleanupListeners = () => {
        overlay.removeEventListener('click', onUserSkip);
        window.removeEventListener('keydown', onKeySkip);
      };

      const finish = (skipped = false) => {
        if (finished) return;
        finished = true;

        if (rafId) window.cancelAnimationFrame(rafId);
        timers.forEach((id) => window.clearTimeout(id));
        cleanupListeners();

        setProgress(100);
        logItems.forEach((item) => item.classList.add('is-visible', 'is-ok'));

        if (statusEl) statusEl.textContent = 'READY! ★';
        overlay.classList.add('is-ready');

        if (skipped && soundEngine) {
          soundEngine.play('intro-start');
        }

        const exitDelay = skipped ? 90 : 500;
        window.setTimeout(() => {
          document.documentElement.classList.remove('intro-active');
          overlay.classList.add('is-exiting');

          // Celebratory sparkle burst right as the retro curtain opens
          if (!prefersReducedMotion) {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            spawnBurst(cx, cy, 18);
          }

          resolve();

          window.setTimeout(() => {
            overlay.remove();
          }, 720);
        }, exitDelay);
      };

      const onUserSkip = () => finish(true);
      const onKeySkip = (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
        finish(true);
      };

      overlay.addEventListener('click', onUserSkip);
      window.addEventListener('keydown', onKeySkip);
      if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          finish(true);
        });
      }

      // Stepped retro loading cadence with brief authentic micro-pauses (~5s total incl. READY & curtain)
      const TOTAL_DURATION = 3900;
      const startTime = window.performance.now();

      const easeRetroProgress = (t) => {
        if (t < 0.25) return (t / 0.25) * 26;
        if (t < 0.34) return 26 + ((t - 0.25) / 0.09) * 4;
        if (t < 0.65) return 30 + ((t - 0.34) / 0.31) * 42;
        if (t < 0.74) return 72 + ((t - 0.65) / 0.09) * 5;
        return 77 + ((t - 0.74) / 0.26) * 23;
      };

      const logSchedule = [
        { idx: 0, showAt: 350, okAt: 1100 },
        { idx: 1, showAt: 1400, okAt: 2550 },
        { idx: 2, showAt: 2900, okAt: 3650 },
      ];

      logSchedule.forEach(({ idx, showAt, okAt }) => {
        const el = logItems[idx];
        if (!el) return;
        schedule(() => el.classList.add('is-visible'), showAt);
        schedule(() => el.classList.add('is-ok'), okAt);
      });

      const tick = (now) => {
        if (finished) return;
        const elapsed = now - startTime;
        const progressRatio = Math.min(1, elapsed / TOTAL_DURATION);
        // Quantize to 5% increments for crisp retro block feel
        const rawPct = easeRetroProgress(progressRatio);
        const steppedPct = progressRatio >= 1 ? 100 : Math.floor(rawPct / 5) * 5;
        setProgress(steppedPct);

        if (progressRatio < 1) {
          rafId = window.requestAnimationFrame(tick);
        } else {
          finish(false);
        }
      };

      rafId = window.requestAnimationFrame(tick);
    });
  };

  /* ========================================================================
     1. Header Scroll Elevation
     ======================================================================== */
  const initHeaderScroll = () => {
    const header = document.querySelector('.header');
    if (!header) return;

    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  };

  /* ========================================================================
     2. Hero Entrance: Typing Effect + Colorful Blob Parallax & Spotlight
     ======================================================================== */
  const initHeroMotion = (introReady = Promise.resolve()) => {
    const hero = document.querySelector('.hero');
    const subtitle = document.querySelector('.hero .subtitle');

    if (subtitle && !prefersReducedMotion) {
      const items = Array.from(subtitle.querySelectorAll('.subtitle-item'));
      const seps = Array.from(subtitle.querySelectorAll('.subtitle-sep'));

      if (items.length > 0) {
        const fullLabel = items.map((el) => el.textContent.trim()).join(' / ');
        subtitle.setAttribute('aria-label', fullLabel);

        const queue = [];
        items.forEach((el, idx) => {
          const text = el.textContent.replace(/\s+/g, ' ').trim();
          el.textContent = '';
          el.setAttribute('aria-hidden', 'true');
          el.style.visibility = 'hidden';
          queue.push({ el, chars: Array.from(text), sep: seps[idx] || null });
          if (seps[idx]) seps[idx].style.visibility = 'hidden';
        });

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor is-typing';
        cursor.setAttribute('aria-hidden', 'true');

        let itemIdx = 0;
        let charIdx = 0;

        const attachFirst = () => {
          const current = queue[0];
          current.el.style.visibility = 'visible';
          current.textNode = document.createElement('span');
          current.el.append(current.textNode, cursor);
        };

        const typeNext = () => {
          const current = queue[itemIdx];
          if (!current) {
            cursor.classList.remove('is-typing');
            return;
          }

          if (charIdx < current.chars.length) {
            current.textNode.textContent += current.chars[charIdx];
            charIdx += 1;
            window.setTimeout(typeNext, 24 + Math.random() * 16);
          } else {
            if (current.sep) current.sep.style.visibility = 'visible';
            itemIdx += 1;
            charIdx = 0;

            if (itemIdx < queue.length) {
              const next = queue[itemIdx];
              next.el.style.visibility = 'visible';
              next.textNode = document.createElement('span');
              next.el.append(next.textNode, cursor);
              window.setTimeout(typeNext, 110);
            } else {
              cursor.classList.remove('is-typing');
            }
          }
        };

        introReady.then(() => {
          window.setTimeout(() => {
            attachFirst();
            typeNext();
          }, 420);
        });
      }
    }

    // Smooth cursor-following candy glow + parallax on floating hero blobs
    if (hero && hasFinePointer && !prefersReducedMotion) {
      let targetX = 50;
      let targetY = 45;
      let currentX = 50;
      let currentY = 45;
      let targetPx = 0;
      let targetPy = 0;
      let currentPx = 0;
      let currentPy = 0;
      let rafId = null;

      const animateHero = () => {
        currentX += (targetX - currentX) * 0.09;
        currentY += (targetY - currentY) * 0.09;
        currentPx += (targetPx - currentPx) * 0.08;
        currentPy += (targetPy - currentPy) * 0.08;

        hero.style.setProperty('--hero-mx', `${currentX.toFixed(2)}%`);
        hero.style.setProperty('--hero-my', `${currentY.toFixed(2)}%`);
        hero.style.setProperty('--hero-px', `${currentPx.toFixed(1)}px`);
        hero.style.setProperty('--hero-py', `${currentPy.toFixed(1)}px`);

        const stillMoving =
          Math.abs(targetX - currentX) > 0.05 ||
          Math.abs(targetY - currentY) > 0.05 ||
          Math.abs(targetPx - currentPx) > 0.08 ||
          Math.abs(targetPy - currentPy) > 0.08;

        if (stillMoving) {
          rafId = window.requestAnimationFrame(animateHero);
        } else {
          rafId = null;
        }
      };

      hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;

        targetX = nx * 100;
        targetY = ny * 100;
        targetPx = (nx - 0.5) * 34;
        targetPy = (ny - 0.5) * 26;

        hero.style.setProperty('--hero-spot-opacity', '1');
        if (!rafId) rafId = window.requestAnimationFrame(animateHero);
      });

      hero.addEventListener('pointerleave', () => {
        targetX = 50;
        targetY = 45;
        targetPx = 0;
        targetPy = 0;
        hero.style.setProperty('--hero-spot-opacity', '0');
        if (!rafId) rafId = window.requestAnimationFrame(animateHero);
      });
    }
  };

  /* ========================================================================
     3. Scroll-Triggered Bouncy Staggered Reveal (IntersectionObserver)
     ======================================================================== */
  const initScrollReveal = () => {
    if (prefersReducedMotion) return;

    const assignReveal = (selector, type, staggerMs = 0) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, idx) => {
        el.setAttribute('data-reveal', type);
        if (staggerMs > 0) {
          el.style.setProperty('--reveal-delay', `${idx * staggerMs}ms`);
        }
      });
    };

    assignReveal('.section h2', 'up');
    assignReveal('.section > .container > p', 'up');
    assignReveal('.skills li', 'pop', 75);
    assignReveal('.game-card', 'card', 110);
    assignReveal('.lfc-showcase', 'up');
    assignReveal('.links a', 'pop', 95);
    assignReveal('.footer .container', 'up');

    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -32px 0px',
      }
    );

    targets.forEach((el) => observer.observe(el));
  };

  /* ========================================================================
     4. Mouse-Interactive Effects: Game Card 3D Tilt, Magnetic Pull & Spotlight
     ======================================================================== */
  const initGameCardTilt = () => {
    if (!hasFinePointer || prefersReducedMotion) return;

    const cards = document.querySelectorAll('.game-card');
    const MAX_TILT = 7.5;

    cards.forEach((card) => {
      let targetRx = 0;
      let targetRy = 0;
      let targetLift = 0;
      let currentRx = 0;
      let currentRy = 0;
      let currentLift = 0;
      let hovering = false;
      let rafId = null;

      const updateTilt = () => {
        currentRx += (targetRx - currentRx) * 0.16;
        currentRy += (targetRy - currentRy) * 0.16;
        currentLift += (targetLift - currentLift) * 0.16;

        if (
          hovering ||
          Math.abs(currentRx) > 0.04 ||
          Math.abs(currentRy) > 0.04 ||
          Math.abs(currentLift) > 0.05
        ) {
          card.style.transform = `perspective(900px) rotateX(${currentRx.toFixed(2)}deg) rotateY(${currentRy.toFixed(2)}deg) translateY(${currentLift.toFixed(2)}px)`;
          rafId = window.requestAnimationFrame(updateTilt);
        } else {
          card.style.transform = '';
          rafId = null;
        }
      };

      card.addEventListener('pointerenter', () => {
        hovering = true;
        targetLift = -6;
        card.classList.add('is-tilting');
        card.style.setProperty('--spot-opacity', '1');
        if (!rafId) rafId = window.requestAnimationFrame(updateTilt);
      });

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mx', `${x.toFixed(1)}px`);
        card.style.setProperty('--my', `${y.toFixed(1)}px`);

        const px = x / rect.width - 0.5;
        const py = y / rect.height - 0.5;

        targetRx = -py * MAX_TILT * 2;
        targetRy = px * MAX_TILT * 2;

        if (!rafId) rafId = window.requestAnimationFrame(updateTilt);
      });

      card.addEventListener('pointerleave', () => {
        hovering = false;
        targetRx = 0;
        targetRy = 0;
        targetLift = 0;
        card.classList.remove('is-tilting');
        card.style.setProperty('--spot-opacity', '0');
        if (!rafId) rafId = window.requestAnimationFrame(updateTilt);
      });
    });
  };

  const initMagneticLinksAndSkills = () => {
    if (!hasFinePointer || prefersReducedMotion) return;

    // Magnetic pull + spotlight for colorful Contact pill buttons
    const buttons = document.querySelectorAll('.links a');
    const STRENGTH = 9;

    buttons.forEach((btn) => {
      btn.addEventListener('pointerenter', () => {
        btn.classList.add('is-magnetic');
      });

      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        btn.style.setProperty('--mx', `${x.toFixed(1)}px`);
        btn.style.setProperty('--my', `${y.toFixed(1)}px`);

        const dx = (x / rect.width - 0.5) * STRENGTH * 2;
        const dy = (y / rect.height - 0.5) * STRENGTH * 2;
        btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${(dy - 3).toFixed(1)}px, 0) scale(1.05)`;
      });

      btn.addEventListener('pointerleave', () => {
        btn.classList.remove('is-magnetic');
        btn.style.transform = '';
      });
    });

    // Spotlight tracking on candy skill pills & playing game badges
    const interactivePills = document.querySelectorAll('.skills li, .games-list li');
    interactivePills.forEach((pill) => {
      pill.addEventListener('pointermove', (e) => {
        const rect = pill.getBoundingClientRect();
        pill.style.setProperty('--mx', `${(e.clientX - rect.left).toFixed(1)}px`);
        pill.style.setProperty('--my', `${(e.clientY - rect.top).toFixed(1)}px`);
      });
    });
  };

  /* ========================================================================
     5. Pop Sound Effects (Web Audio API)
     ======================================================================== */
  const createSoundEngine = () => {
    const STORAGE_KEY = 'portfolio-se-enabled';
    let audioCtx = null;
    let enabled = true;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'false') enabled = false;
    } catch {
      // Ignore storage access errors in restricted environments
    }

    const getContext = () => {
      if (!audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    };

    const playTone = (ctx, { type = 'sine', freqStart, freqEnd, startOffset = 0, duration = 0.08, volume = 0.12 }) => {
      const now = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd && freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.015);
    };

    const play = (kind = 'tap') => {
      if (!enabled) return;
      const ctx = getContext();
      if (!ctx) return;

      const jitter = 0.96 + Math.random() * 0.08;
      const isLfc = document.body.classList.contains('theme-lfc');

      if (kind === 'dino-jump') {
        playTone(ctx, { type: 'square', freqStart: 280, freqEnd: 620, startOffset: 0, duration: 0.095, volume: 0.055 });
        return;
      }

      if (kind === 'dino-score') {
        playTone(ctx, { type: 'square', freqStart: 987.77, freqEnd: 987.77, startOffset: 0, duration: 0.08, volume: 0.055 });
        playTone(ctx, { type: 'square', freqStart: 1318.51, freqEnd: 1318.51, startOffset: 0.085, duration: 0.16, volume: 0.065 });
        return;
      }

      if (kind === 'dino-hit') {
        playTone(ctx, { type: 'sawtooth', freqStart: 250, freqEnd: 78, startOffset: 0, duration: 0.22, volume: 0.075 });
        return;
      }

      if (kind === 'intro-start') {
        // Retro 8-bit game start arpeggio (C5 -> E5 -> G5 -> C6)
        playTone(ctx, { type: 'square', freqStart: 523.25, freqEnd: 523.25, startOffset: 0, duration: 0.075, volume: 0.055 });
        playTone(ctx, { type: 'square', freqStart: 659.25, freqEnd: 659.25, startOffset: 0.06, duration: 0.075, volume: 0.055 });
        playTone(ctx, { type: 'square', freqStart: 783.99, freqEnd: 783.99, startOffset: 0.12, duration: 0.08, volume: 0.055 });
        playTone(ctx, { type: 'triangle', freqStart: 1046.5, freqEnd: 1060.0, startOffset: 0.18, duration: 0.24, volume: 0.085 });
        return;
      }

      if (kind === 'lfc-enter') {
        // Refined warm Anfield harmonic swell (G4 + B4 + D5)
        playTone(ctx, { type: 'sine', freqStart: 392.0, freqEnd: 392.0, startOffset: 0, duration: 0.28, volume: 0.055 });
        playTone(ctx, { type: 'sine', freqStart: 493.88, freqEnd: 493.88, startOffset: 0.04, duration: 0.3, volume: 0.05 });
        playTone(ctx, { type: 'sine', freqStart: 587.33, freqEnd: 587.33, startOffset: 0.08, duration: 0.34, volume: 0.05 });
        return;
      }

      if (kind === 'copy') {
        // Sparkling 3-note game chime (C6 -> E6 -> G6)
        playTone(ctx, { type: 'triangle', freqStart: 1046.5, freqEnd: 1046.5, startOffset: 0, duration: 0.11, volume: 0.13 });
        playTone(ctx, { type: 'triangle', freqStart: 1318.5, freqEnd: 1318.5, startOffset: 0.055, duration: 0.12, volume: 0.13 });
        playTone(ctx, { type: 'sine', freqStart: 1568.0, freqEnd: 1620.0, startOffset: 0.11, duration: 0.22, volume: 0.14 });
        return;
      }

      if (isLfc) {
        // Understated, classy soft chime when in Liverpool FC official mode
        const base = kind === 'ui' ? 523.25 : 440;
        playTone(ctx, {
          type: 'sine',
          freqStart: base,
          freqEnd: base * 1.12,
          startOffset: 0,
          duration: 0.11,
          volume: 0.07,
        });
        return;
      }

      if (kind === 'ui') {
        // Cheerful pop UI select (2-step upward chirp)
        playTone(ctx, {
          type: 'triangle',
          freqStart: 560 * jitter,
          freqEnd: 880 * jitter,
          startOffset: 0,
          duration: 0.085,
          volume: 0.12,
        });
        playTone(ctx, {
          type: 'sine',
          freqStart: 920 * jitter,
          freqEnd: 1180 * jitter,
          startOffset: 0.035,
          duration: 0.09,
          volume: 0.09,
        });
        return;
      }

      // Soft bubble pop for general clicks
      playTone(ctx, {
        type: 'sine',
        freqStart: 420 * jitter,
        freqEnd: 690 * jitter,
        startOffset: 0,
        duration: 0.075,
        volume: 0.1,
      });
    };

    const initToggle = () => {
      const btn = document.getElementById('soundToggle');
      if (!btn) return;
      const iconEl = btn.querySelector('.sound-icon');

      const syncUi = () => {
        btn.setAttribute('aria-pressed', String(enabled));
        if (iconEl) iconEl.textContent = enabled ? '🔊' : '🔇';
      };

      syncUi();

      btn.addEventListener('click', () => {
        enabled = !enabled;
        syncUi();
        try {
          window.localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch {
          // Ignore storage errors
        }
        if (enabled) play('ui');
      });
    };

    initToggle();

    return { play };
  };

  const sound = createSoundEngine();

  /* ========================================================================
     6. Pop Confetti Sparkle Burst & Friend ID Copy
     ======================================================================== */
  const spawnBurst = (x, y, count = 10) => {
    if (prefersReducedMotion) return;
    const palette = document.body.classList.contains('theme-lfc') ? LFC_COLORS : POP_COLORS;

    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'pop-sparkle';

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const distance = 28 + Math.random() * 44;
      const size = 6 + Math.random() * 6;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const radius = Math.random() > 0.45 ? '50%' : '3px';
      const rot = `${Math.round((Math.random() - 0.5) * 320)}deg`;

      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      dot.style.setProperty('--dx', `${(Math.cos(angle) * distance).toFixed(1)}px`);
      dot.style.setProperty('--dy', `${(Math.sin(angle) * distance).toFixed(1)}px`);
      dot.style.setProperty('--size', `${size.toFixed(1)}px`);
      dot.style.setProperty('--spark-color', color);
      dot.style.setProperty('--spark-radius', radius);
      dot.style.setProperty('--rot', rot);

      document.body.appendChild(dot);
      window.setTimeout(() => dot.remove(), 700);
    }
  };

  const initPopSparkles = () => {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (target.closest('#introOverlay') || target.closest('#dinoModal')) return;
      const isSoundToggle = Boolean(target.closest('#soundToggle'));
      const isCopyBtn = Boolean(target.closest('[data-copy-id]'));
      const isDinoTrigger = Boolean(target.closest('#secretDinoTrigger'));
      const isInteractive = Boolean(
        target.closest('a, button, .game-card, .skills li, .games-list li, .hero h1')
      );

      if (!prefersReducedMotion) {
        spawnBurst(e.clientX, e.clientY, isInteractive ? 12 : 7);
      }

      // Copy button plays its own chime on click; sound toggle & dino trigger handle their own sound
      if (!isSoundToggle && !isCopyBtn && !isDinoTrigger) {
        sound.play(isInteractive ? 'ui' : 'tap');
      }
    });
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  };

  const initCopyFriendId = () => {
    const buttons = document.querySelectorAll('[data-copy-id]');
    buttons.forEach((btn) => {
      const originalText = btn.textContent;
      let resetTimer = null;

      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-copy-id');
        if (!id) return;

        try {
          await copyText(id);
          sound.play('copy');
          btn.classList.add('is-copied');
          btn.textContent = 'コピーしました！';

          const rect = btn.getBoundingClientRect();
          spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);

          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            btn.classList.remove('is-copied');
            btn.textContent = originalText;
          }, 2000);
        } catch {
          btn.textContent = 'コピー失敗';
          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    });
  };

  /* ========================================================================
     7. Football Section — Liverpool FC Official UI Transformation on Hover
     ======================================================================== */
  const initFootballTheme = () => {
    const footballSection = document.getElementById('football');
    const showcase = document.querySelector('.lfc-showcase');
    const pill = document.getElementById('lfcModePill');
    if (!footballSection) return;

    let pinned = false;
    let leaveTimer = null;
    let lastSoundTime = 0;

    const setLfcTheme = (active, withSound = false) => {
      const wasActive = document.body.classList.contains('theme-lfc');
      document.body.classList.toggle('theme-lfc', active);
      if (pill) pill.setAttribute('aria-pressed', String(active));

      if (active && !wasActive && withSound) {
        const now = Date.now();
        if (now - lastSoundTime > 900) {
          sound.play('lfc-enter');
          lastSoundTime = now;
        }
      }
    };

    if (hasFinePointer) {
      footballSection.addEventListener('pointerenter', () => {
        if (leaveTimer) {
          window.clearTimeout(leaveTimer);
          leaveTimer = null;
        }
        setLfcTheme(true, true);
      });

      footballSection.addEventListener('pointerleave', () => {
        if (pinned) return;
        leaveTimer = window.setTimeout(() => {
          setLfcTheme(false);
        }, 140);
      });
    }

    // Click/tap pill to pin or toggle Anfield Mode (also handy on touch devices)
    if (pill) {
      pill.addEventListener('click', () => {
        pinned = !pinned;
        setLfcTheme(pinned, pinned);
      });
    }

    // Subtle gold editorial sheen following cursor on the LFC showcase card
    if (showcase && hasFinePointer && !prefersReducedMotion) {
      showcase.addEventListener('pointerenter', () => {
        showcase.style.setProperty('--lfc-sheen', '1');
      });

      showcase.addEventListener('pointermove', (e) => {
        const rect = showcase.getBoundingClientRect();
        showcase.style.setProperty('--mx', `${(e.clientX - rect.left).toFixed(1)}px`);
        showcase.style.setProperty('--my', `${(e.clientY - rect.top).toFixed(1)}px`);
      });

      showcase.addEventListener('pointerleave', () => {
        showcase.style.setProperty('--lfc-sheen', '0');
      });
    }
  };

  /* ========================================================================
     8. Secret Easter Egg Mini-Game: Pop Retro Dinosaur Runner
     ======================================================================== */
  const initSecretDinoGame = (soundEngine) => {
    const triggerBtn = document.getElementById('secretDinoTrigger');
    const modal = document.getElementById('dinoModal');
    const canvas = document.getElementById('dinoCanvas');
    if (!triggerBtn || !modal || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const overlayEl = document.getElementById('dinoOverlay');
    const overlayBadge = document.getElementById('dinoOverlayBadge');
    const overlayHeading = document.getElementById('dinoOverlayHeading');
    const overlaySub = document.getElementById('dinoOverlaySub');
    const actionBtn = document.getElementById('dinoActionBtn');
    const scoreEl = document.getElementById('dinoScore');
    const hiScoreEl = document.getElementById('dinoHiScore');
    const jumpBtn = document.getElementById('dinoJumpBtn');
    const duckBtn = document.getElementById('dinoDuckBtn');
    const closeTriggers = modal.querySelectorAll('[data-dino-close]');

    const W = 680;
    const H = 220;
    const GROUND_Y = 186;
    const PIXEL = 3;
    const HI_KEY = 'portfolio-dino-hi';

    // Crisp 2-tone pixel-art bitmaps ('#' = primary chassis, '@' = glowing neon accent)
    const SPRITES = {
      roboStand: [
        '.....@@.....',
        '.....##.....',
        '..########..',
        '..#@@@@@@#..',
        '..#@#@@#@#..',
        '..########..',
        '....####....',
        '.##########.',
        '###.@@@@.###',
        '#.########.#',
        '..########..',
        '...##..##...',
        '..###..###..',
      ],
      roboRunA: [
        '.....@@.....',
        '.....##.....',
        '..########..',
        '..#@@@@@@#..',
        '..#@#@@#@#..',
        '..########..',
        '....####....',
        '.##########.',
        '###.@@@@.###',
        '#.########.#',
        '..########..',
        '..##...##...',
        '.###........',
      ],
      roboRunB: [
        '.....@@.....',
        '.....##.....',
        '..########..',
        '..#@@@@@@#..',
        '..#@#@@#@#..',
        '..########..',
        '....####....',
        '.##########.',
        '###.@@@@.###',
        '#.########.#',
        '..########..',
        '...##...##..',
        '........###.',
      ],
      roboHit: [
        '...@....@...',
        '....####....',
        '..########..',
        '..#@#@@#@#..',
        '..##@@@@##..',
        '..########..',
        '....####....',
        '.##########.',
        '###.@..@.###',
        '#.########.#',
        '..########..',
        '..##....##..',
        '.###....###.',
      ],
      roboDuckA: [
        '......@@......',
        '...########...',
        '...#@@@@@@#...',
        '...#@#@@#@#...',
        '@.##########..',
        '..##########..',
        '...##....#....',
        '..###.........',
      ],
      roboDuckB: [
        '......@@......',
        '...########...',
        '...#@@@@@@#...',
        '...#@#@@#@#...',
        '@@##########..',
        '..##########..',
        '....#...##....',
        '.......###....',
      ],
      pylonSmall: [
        '...#...',
        '..#@#..',
        '..###..',
        '.##@##.',
        '.#####.',
        '###@###',
        '#######',
        '.##@##.',
        '.#####.',
        '.#####.',
        '#######',
      ],
      pylonTall: [
        '....#....',
        '...#@#...',
        '...###...',
        '..##@##..',
        '..#####..',
        '.###@###.',
        '.#######.',
        '####@####',
        '#########',
        '.###@###.',
        '.#######.',
        '.##@@@##.',
        '.#######.',
        '#########',
      ],
      droneA: [
        '..########..',
        '.....##.....',
        '..########..',
        '.###@@@@###.',
        '.##########.',
        '..##....##..',
        '.#........#.',
        '............',
      ],
      droneB: [
        '....####....',
        '.....##.....',
        '..########..',
        '.###@@@@###.',
        '.##########.',
        '...##..##...',
        '..#......#..',
        '............',
      ],
    };

    const drawSprite = (sprite, x, y, primaryColor, accentColor = null) => {
      const rx = Math.round(x);
      const ry = Math.round(y);
      for (let r = 0; r < sprite.length; r += 1) {
        const row = sprite[r];
        for (let c = 0; c < row.length; c += 1) {
          const ch = row[c];
          if (ch === '#') {
            ctx.fillStyle = primaryColor;
            ctx.fillRect(rx + c * PIXEL, ry + r * PIXEL, PIXEL, PIXEL);
          } else if (ch === '@') {
            ctx.fillStyle = accentColor || primaryColor;
            ctx.fillRect(rx + c * PIXEL, ry + r * PIXEL, PIXEL, PIXEL);
          }
        }
      }
    };

    let hiScore = 0;
    try {
      const savedHi = Number.parseInt(window.localStorage.getItem(HI_KEY) || '0', 10);
      if (Number.isFinite(savedHi) && savedHi > 0) hiScore = savedHi;
    } catch {
      // Ignore storage access errors
    }

    const formatScore = (n) => String(Math.floor(n)).padStart(5, '0');
    const syncScoreHud = () => {
      if (scoreEl) scoreEl.textContent = formatScore(state.score);
      if (hiScoreEl) hiScoreEl.textContent = `HI ${formatScore(hiScore)}`;
    };

    const state = {
      isOpen: false,
      mode: 'idle', // 'idle' | 'playing' | 'gameover'
      rafId: null,
      lastTime: 0,
      score: 0,
      lastMilestone: 0,
      speed: 350,
      groundOffset: 0,
      spawnTimer: 1.0,
      jumpHeld: false,
      duckHeld: false,
      jumpBuffer: 0,
      flashTimer: 0,
      gameOverAt: 0,
      milestoneBanner: '',
      milestoneTimer: 0,
      dino: {
        x: 68,
        y: GROUND_Y - 13 * PIXEL,
        vy: 0,
        onGround: true,
        ducking: false,
        animTimer: 0,
        frame: 0,
      },
      obstacles: [],
      particles: [],
      clouds: [
        { x: 110, y: 42, w: 38, speed: 0.14 },
        { x: 340, y: 28, w: 48, speed: 0.1 },
        { x: 560, y: 52, w: 32, speed: 0.18 },
      ],
      stars: Array.from({ length: 18 }, (_, i) => ({
        x: (i * 41 + 19) % W,
        y: 14 + ((i * 29) % 92),
        phase: i * 0.7,
      })),
    };

    const getPalette = () => {
      const isLfc = document.body.classList.contains('theme-lfc');
      const fever = Math.floor(state.score / 500) % 2 === 1;
      if (isLfc) {
        return {
          skyTop: '#16090c',
          skyBottom: '#2b0e16',
          ground: '#c9a24b',
          groundSub: 'rgba(201, 162, 75, 0.35)',
          dino: '#f6f1eb',
          dinoAccent: '#c8102e',
          cactus: '#c8102e',
          cactusAlt: '#e5c97b',
          bird: '#e5c97b',
          cloud: 'rgba(246, 241, 235, 0.12)',
          star: 'rgba(229, 201, 123, 0.55)',
          sparks: ['#c8102e', '#e5c97b', '#ffffff'],
        };
      }
      if (fever) {
        return {
          skyTop: '#1d0a2e',
          skyBottom: '#2d1148',
          ground: '#38d9ff',
          groundSub: 'rgba(56, 217, 255, 0.32)',
          dino: '#ffe066',
          dinoAccent: '#ff4d8d',
          cactus: '#ff5da2',
          cactusAlt: '#2ef2b6',
          bird: '#38d9ff',
          cloud: 'rgba(255, 93, 162, 0.16)',
          star: 'rgba(255, 224, 102, 0.65)',
          sparks: POP_COLORS,
        };
      }
      return {
        skyTop: '#0e0922',
        skyBottom: '#1a113c',
        ground: '#ff4d8d',
        groundSub: 'rgba(196, 181, 253, 0.28)',
        dino: '#fdf4ff',
        dinoAccent: '#38d9ff',
        cactus: '#2ef2b6',
        cactusAlt: '#ff8a00',
        bird: '#38d9ff',
        cloud: 'rgba(196, 181, 253, 0.14)',
        star: 'rgba(196, 181, 253, 0.5)',
        sparks: POP_COLORS,
      };
    };

    const addParticles = (x, y, count, palette, spread = 130) => {
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI * Math.random();
        const spd = 45 + Math.random() * spread;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd - state.speed * 0.15,
          vy: Math.sin(angle) * spd - 20,
          size: 3 + Math.floor(Math.random() * 4),
          life: 0.35 + Math.random() * 0.3,
          maxLife: 0.65,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
    };

    const resetGame = () => {
      state.score = 0;
      state.lastMilestone = 0;
      state.speed = 350;
      state.groundOffset = 0;
      state.spawnTimer = 0.85;
      state.jumpHeld = false;
      state.duckHeld = false;
      state.jumpBuffer = 0;
      state.flashTimer = 0;
      state.milestoneBanner = '';
      state.milestoneTimer = 0;
      state.obstacles = [];
      state.particles = [];
      state.dino.y = GROUND_Y - 13 * PIXEL;
      state.dino.vy = 0;
      state.dino.onGround = true;
      state.dino.ducking = false;
      state.dino.animTimer = 0;
      state.dino.frame = 0;
      syncScoreHud();
    };

    const showOverlay = (badge, heading, sub, btnText) => {
      if (overlayBadge) overlayBadge.textContent = badge;
      if (overlayHeading) overlayHeading.textContent = heading;
      if (overlaySub) overlaySub.textContent = sub;
      if (actionBtn) actionBtn.textContent = btnText;
      if (overlayEl) overlayEl.classList.remove('is-hidden');
    };

    const hideOverlay = () => {
      if (overlayEl) overlayEl.classList.add('is-hidden');
    };

    const performJump = () => {
      const d = state.dino;
      if (!d.onGround) return false;
      d.vy = -595;
      d.onGround = false;
      d.ducking = false;
      state.jumpBuffer = 0;
      if (soundEngine) soundEngine.play('dino-jump');
      addParticles(d.x + 14, GROUND_Y - 2, 6, getPalette().sparks, 90);
      return true;
    };

    const startOrJump = () => {
      if (state.mode === 'gameover' && window.performance.now() - state.gameOverAt < 350) {
        return;
      }
      if (state.mode === 'idle' || state.mode === 'gameover') {
        resetGame();
        state.mode = 'playing';
        hideOverlay();
        state.jumpHeld = true;
        performJump();
        return;
      }
      state.jumpHeld = true;
      if (!performJump()) {
        state.jumpBuffer = 0.11;
      }
    };

    const spawnObstacle = () => {
      const canSpawnBird = state.score >= 160;
      const roll = Math.random();

      if (canSpawnBird && roll < 0.28) {
        const heights = [154, 134, 108]; // low (jump), mid (duck!), high (safe/trap)
        const y = heights[Math.floor(Math.random() * heights.length)];
        state.obstacles.push({
          kind: 'bird',
          x: W + 24,
          y,
          w: 12 * PIXEL,
          h: 8 * PIXEL,
          animTimer: 0,
          frame: 0,
        });
      } else if (state.score >= 120 && roll > 0.72) {
        // Double cactus cluster
        const h1 = 11 * PIXEL;
        const h2 = 14 * PIXEL;
        state.obstacles.push({
          kind: 'cluster',
          x: W + 24,
          y: GROUND_Y - h2,
          w: 16 * PIXEL,
          h: h2,
          h1,
        });
      } else if (roll < 0.5) {
        const h = 11 * PIXEL;
        state.obstacles.push({
          kind: 'small',
          x: W + 24,
          y: GROUND_Y - h,
          w: 7 * PIXEL,
          h,
        });
      } else {
        const h = 14 * PIXEL;
        state.obstacles.push({
          kind: 'tall',
          x: W + 24,
          y: GROUND_Y - h,
          w: 9 * PIXEL,
          h,
        });
      }
    };

    const triggerGameOver = () => {
      state.mode = 'gameover';
      state.gameOverAt = window.performance.now();
      if (soundEngine) soundEngine.play('dino-hit');
      const d = state.dino;
      addParticles(d.x + 18, d.y + 18, 16, getPalette().sparks, 180);

      let isNewRecord = false;
      const finalScore = Math.floor(state.score);
      if (finalScore > hiScore) {
        hiScore = finalScore;
        isNewRecord = true;
        try {
          window.localStorage.setItem(HI_KEY, String(hiScore));
        } catch {
          // Ignore storage errors
        }
      }
      syncScoreHud();

      showOverlay(
        isNewRecord ? '★ NEW HIGH SCORE! ★' : 'CRASHED!',
        'GAME OVER',
        `SCORE ${formatScore(finalScore)}  /  BEST ${formatScore(hiScore)}`,
        'RETRY ↻'
      );
    };

    const update = (dt) => {
      const d = state.dino;

      // Particles update in all states so crash sparks finish cleanly
      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 420 * dt;
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      if (state.mode !== 'playing') return;

      // Progressive speed curve (350 -> 720 px/s)
      state.speed = Math.min(720, 350 + state.score * 0.32);
      state.groundOffset = (state.groundOffset + state.speed * dt) % 36;

      // Score tick (~12 pts/sec, scales subtly with speed)
      state.score += dt * (11 + (state.speed - 350) * 0.015);
      const currentMilestone = Math.floor(state.score / 100);
      if (currentMilestone > state.lastMilestone && currentMilestone > 0) {
        state.lastMilestone = currentMilestone;
        if (soundEngine) soundEngine.play('dino-score');
        state.milestoneBanner = `${currentMilestone * 100} PTS! ★`;
        state.milestoneTimer = 1.1;
        if (scoreEl) {
          scoreEl.classList.add('is-flash');
          window.setTimeout(() => scoreEl.classList.remove('is-flash'), 360);
        }
      }
      if (state.milestoneTimer > 0) state.milestoneTimer = Math.max(0, state.milestoneTimer - dt);
      syncScoreHud();

      // Clouds parallax
      state.clouds.forEach((cloud) => {
        cloud.x -= state.speed * cloud.speed * dt;
        if (cloud.x + cloud.w < -10) {
          cloud.x = W + 20 + Math.random() * 80;
          cloud.y = 22 + Math.random() * 52;
        }
      });

      // Jump buffer countdown
      if (state.jumpBuffer > 0) state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);

      // Dino vertical physics (variable jump height + fast fall on duck)
      if (!d.onGround) {
        let gravity = 1750;
        if (state.duckHeld) {
          gravity = 3400; // Fast slam-down
        } else if (!state.jumpHeld && d.vy < -180) {
          gravity = 2700; // Short hop when released early
        }
        d.vy += gravity * dt;
        d.y += d.vy * dt;

        const targetHeight = state.duckHeld ? 8 * PIXEL : 13 * PIXEL;
        const floorY = GROUND_Y - targetHeight;
        if (d.y >= floorY) {
          d.y = floorY;
          d.vy = 0;
          d.onGround = true;
          d.ducking = state.duckHeld;
          addParticles(d.x + 12, GROUND_Y - 1, 4, getPalette().sparks, 70);
          if (state.jumpBuffer > 0) {
            performJump();
          }
        }
      } else {
        d.ducking = state.duckHeld;
        d.y = GROUND_Y - (d.ducking ? 8 * PIXEL : 13 * PIXEL);
        d.animTimer += dt * (state.speed / 350);
        if (d.animTimer >= 0.095) {
          d.animTimer = 0;
          d.frame = d.frame === 0 ? 1 : 0;
        }
      }

      // Obstacle spawning with fair reaction spacing
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnObstacle();
        const speedFactor = 350 / state.speed;
        state.spawnTimer = Math.max(0.58, (0.82 + Math.random() * 0.72) * speedFactor);
      }

      // Robot forgiving hitbox
      const dinoBox = d.ducking
        ? { x: d.x + 6, y: d.y + 4, w: 14 * PIXEL - 12, h: 8 * PIXEL - 5 }
        : { x: d.x + 7, y: d.y + 5, w: 12 * PIXEL - 14, h: 13 * PIXEL - 7 };

      // Move obstacles & check collisions
      for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
        const ob = state.obstacles[i];
        const moveSpeed = ob.kind === 'bird' ? state.speed * 1.1 : state.speed;
        ob.x -= moveSpeed * dt;

        if (ob.kind === 'bird') {
          ob.animTimer += dt;
          if (ob.animTimer >= 0.14) {
            ob.animTimer = 0;
            ob.frame = ob.frame === 0 ? 1 : 0;
          }
        }

        const obBox = {
          x: ob.x + 4,
          y: ob.y + 4,
          w: ob.w - 8,
          h: ob.h - 6,
        };

        const hit =
          dinoBox.x < obBox.x + obBox.w &&
          dinoBox.x + dinoBox.w > obBox.x &&
          dinoBox.y < obBox.y + obBox.h &&
          dinoBox.y + dinoBox.h > obBox.y;

        if (hit) {
          triggerGameOver();
          return;
        }

        if (ob.x + ob.w < -40) {
          state.obstacles.splice(i, 1);
        }
      }
    };

    const render = (now) => {
      const pal = getPalette();

      // Arcade night gradient sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, pal.skyTop);
      skyGrad.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Twinkling pixel stars
      state.stars.forEach((s) => {
        const alpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.004 + s.phase));
        ctx.fillStyle = pal.star;
        ctx.globalAlpha = alpha;
        ctx.fillRect(s.x, s.y, 2, 2);
      });
      ctx.globalAlpha = 1;

      // Pixel clouds
      ctx.fillStyle = pal.cloud;
      state.clouds.forEach((c) => {
        const cx = Math.round(c.x);
        const cy = Math.round(c.y);
        ctx.fillRect(cx + 6, cy, c.w - 12, 6);
        ctx.fillRect(cx, cy + 5, c.w, 6);
      });

      // Glowing neon ground horizon
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, GROUND_Y, W, 3);

      ctx.fillStyle = pal.groundSub;
      for (let gx = -Math.floor(state.groundOffset); gx < W; gx += 36) {
        ctx.fillRect(gx, GROUND_Y + 8, 12, 2);
        ctx.fillRect(gx + 18, GROUND_Y + 14, 6, 2);
        ctx.fillRect(gx + 28, GROUND_Y + 10, 4, 2);
      }

      // Obstacles (cyber pylons & hovering patrol drones)
      state.obstacles.forEach((ob) => {
        if (ob.kind === 'small') {
          drawSprite(SPRITES.pylonSmall, ob.x, ob.y, pal.cactus, pal.dinoAccent);
        } else if (ob.kind === 'tall') {
          drawSprite(SPRITES.pylonTall, ob.x, ob.y, pal.cactusAlt, '#ffe066');
        } else if (ob.kind === 'cluster') {
          drawSprite(SPRITES.pylonSmall, ob.x, GROUND_Y - ob.h1, pal.cactus, pal.dinoAccent);
          drawSprite(SPRITES.pylonTall, ob.x + 7 * PIXEL, ob.y, pal.cactusAlt, '#ffe066');
        } else if (ob.kind === 'bird') {
          drawSprite(ob.frame === 0 ? SPRITES.droneA : SPRITES.droneB, ob.x, ob.y, pal.bird, '#ff4d8d');
        }
      });

      // Retro robot sprite
      const d = state.dino;
      let roboSprite = SPRITES.roboStand;
      if (state.mode === 'gameover') {
        roboSprite = SPRITES.roboHit;
      } else if (d.ducking) {
        roboSprite = d.frame === 0 ? SPRITES.roboDuckA : SPRITES.roboDuckB;
      } else if (state.mode === 'playing' && d.onGround) {
        roboSprite = d.frame === 0 ? SPRITES.roboRunA : SPRITES.roboRunB;
      }
      drawSprite(roboSprite, d.x, d.y, pal.dino, pal.dinoAccent);

      // Particles
      state.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      });
      ctx.globalAlpha = 1;

      // Floating milestone callout
      if (state.milestoneTimer > 0 && state.milestoneBanner) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, state.milestoneTimer * 1.4);
        ctx.font = 'bold 14px ui-monospace, monospace';
        ctx.fillStyle = '#ffe066';
        ctx.textAlign = 'center';
        ctx.fillText(state.milestoneBanner, W / 2, 34 - (1.1 - state.milestoneTimer) * 14);
        ctx.restore();
      }
    };

    const loop = (now) => {
      if (!state.isOpen) {
        state.rafId = null;
        return;
      }
      const dt = Math.min(0.05, (now - state.lastTime) / 1000);
      state.lastTime = now;
      update(dt);
      render(now);
      state.rafId = window.requestAnimationFrame(loop);
    };

    const onKeyDown = (e) => {
      if (!state.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (!e.repeat) startOrJump();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        state.duckHeld = true;
      }
    };

    const onKeyUp = (e) => {
      if (!state.isOpen) return;
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        state.jumpHeld = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        state.duckHeld = false;
      }
    };

    const openModal = () => {
      if (state.isOpen) return;
      state.isOpen = true;
      resetGame();
      state.mode = 'idle';
      showOverlay('SECRET FOUND!', 'ROBO RUN', 'SPACE / ↑ / タップでスタート', 'START ▶');

      modal.hidden = false;
      document.body.classList.add('dino-open');
      void modal.offsetWidth;
      modal.classList.add('is-open');

      if (soundEngine) soundEngine.play('intro-start');

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      state.lastTime = window.performance.now();
      state.rafId = window.requestAnimationFrame(loop);
    };

    const closeModal = () => {
      if (!state.isOpen) return;
      state.isOpen = false;
      state.jumpHeld = false;
      state.duckHeld = false;
      if (state.rafId) {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);

      modal.classList.remove('is-open');
      document.body.classList.remove('dino-open');
      window.setTimeout(() => {
        if (!state.isOpen) modal.hidden = true;
      }, 240);
    };

    triggerBtn.addEventListener('click', openModal);
    closeTriggers.forEach((el) => el.addEventListener('click', closeModal));

    if (overlayEl) {
      overlayEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#dinoActionBtn')) return;
        e.preventDefault();
        startOrJump();
      });
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startOrJump();
      });
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startOrJump();
    });

    window.addEventListener('pointerup', () => {
      if (state.isOpen) {
        state.jumpHeld = false;
      }
    });

    if (jumpBtn) {
      jumpBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        startOrJump();
      });
      jumpBtn.addEventListener('pointerup', () => {
        state.jumpHeld = false;
      });
      jumpBtn.addEventListener('pointercancel', () => {
        state.jumpHeld = false;
      });
    }

    if (duckBtn) {
      duckBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        state.duckHeld = true;
      });
      const releaseDuck = () => {
        state.duckHeld = false;
      };
      duckBtn.addEventListener('pointerup', releaseDuck);
      duckBtn.addEventListener('pointerleave', releaseDuck);
      duckBtn.addEventListener('pointercancel', releaseDuck);
    }
  };

  /* ========================================================================
     Initialize
     ======================================================================== */
  const introReady = initIntroBoot(sound);
  initHeaderScroll();
  initHeroMotion(introReady);
  initScrollReveal();
  initGameCardTilt();
  initMagneticLinksAndSkills();
  initPopSparkles();
  initCopyFriendId();
  initFootballTheme();
  initSecretDinoGame(sound);
})();

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
  const initHeroMotion = () => {
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

        window.setTimeout(() => {
          attachFirst();
          typeNext();
        }, 420);
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
      const isSoundToggle = Boolean(target.closest('#soundToggle'));
      const isCopyBtn = Boolean(target.closest('[data-copy-id]'));
      const isInteractive = Boolean(
        target.closest('a, button, .game-card, .skills li, .games-list li, .hero h1')
      );

      if (!prefersReducedMotion) {
        spawnBurst(e.clientX, e.clientY, isInteractive ? 12 : 7);
      }

      // Copy button plays its own chime on click; sound toggle handles its own sound
      if (!isSoundToggle && !isCopyBtn) {
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
     Initialize
     ======================================================================== */
  initHeaderScroll();
  initHeroMotion();
  initScrollReveal();
  initGameCardTilt();
  initMagneticLinksAndSkills();
  initPopSparkles();
  initCopyFriendId();
  initFootballTheme();
})();

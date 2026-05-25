/* ═══════════════════════════════════════════════════════════
   IONIK — ionik-script.js
   Modules:
     1. Preloader        — cinematic exit + image glitch + breathing
     2. Cursor           — lerp ring, neon glow, difference blend
     3. Sidebar          — toggle, scroll spy, active states
     4. Scroll Progress  — fills the sidebar track
     5. Hero Logo        — breathing glow + RGB glitch on hover
     6. Services         — staggered entrance via IntersectionObserver
     7. Theme Toggle     — light/dark mode with localStorage + smooth transitions
     8. Contact Form     — Web3Forms AJAX, validation, UI states
═══════════════════════════════════════════════════════════ */

'use strict';

/* Always start at the top on load/refresh */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);


/* ─────────────────────────────────────────────────────────
   1. PRELOADER
   Scanline → logo reveal → rays + glow → glitch burst →
   streak → logo breathes → curtain rises → page enters
───────────────────────────────────────────────────────── */
(function Preloader() {
    var el      = document.getElementById('preloader');
    var logoImg = document.getElementById('preLogoImg');
    if (!el) return;

    var MIN_MS = 2900;
    var t0     = performance.now();
    document.body.classList.add('no-scroll');

    /* ── Image glitch burst (15 rapid transform jitter frames) ── */
    function imageGlitch(img) {
        if (!img) return;
        var steps = [
            'translateX(-4px) skewX(-1.5deg)',
            'translateX( 4px) skewX( 1.5deg)',
            'translateX(-2px)',
            'translateX( 3px) skewX(-0.8deg)',
            'none'
        ];
        var i = 0, total = steps.length * 3;
        (function frame() {
            if (i < total) {
                img.style.transform = steps[i % steps.length];
                i++;
                setTimeout(frame, 55);
            } else {
                img.style.transform = '';
            }
        }());
    }

    /* ── Breathing starts after logoImgReveal animationend ── */
    if (logoImg) {
        logoImg.addEventListener('animationend', function onReveal(e) {
            if (e.animationName === 'logoImgReveal') {
                logoImg.removeEventListener('animationend', onReveal);
                logoImg.classList.add('breathing');
            }
        });
    }

    /* Glitch fires ~1.35 s after load (logo just settled) */
    setTimeout(function () { imageGlitch(logoImg); }, 1350);

    /* ── Build glass shard fragments, append to body, return data array ── */
    function buildShards(img) {
        if (!img) return [];

        var r  = img.getBoundingClientRect();
        var lx = r.left, ly = r.top, lw = r.width, lh = r.height;

        var defs = [
            { pts:[[0,0],[42,0],[28,38],[0,32]],        tx:-145, ty:-115, rot:-58, sc:0.18, d:0  },
            { pts:[[38,0],[68,0],[72,30],[32,35]],       tx:  12, ty:-158, rot: 14, sc:0.25, d:25 },
            { pts:[[64,0],[100,0],[100,28],[68,32]],     tx: 148, ty:-122, rot: 52, sc:0.18, d:10 },
            { pts:[[0,30],[26,34],[18,64],[0,62]],       tx:-162, ty: -12, rot:-76, sc:0.14, d:42 },
            { pts:[[24,36],[50,30],[52,58],[20,62]],     tx: -88, ty:  68, rot:-42, sc:0.22, d:58 },
            { pts:[[50,28],[76,32],[78,62],[48,60]],     tx:  98, ty:  52, rot: 56, sc:0.20, d:18 },
            { pts:[[74,30],[100,24],[100,64],[76,60]],   tx: 168, ty:  -8, rot: 72, sc:0.14, d:33 },
            { pts:[[0,60],[18,64],[28,88],[0,100]],      tx:-142, ty: 132, rot:-88, sc:0.18, d:48 },
            { pts:[[16,64],[52,58],[56,88],[14,100]],    tx:   4, ty: 162, rot:  -6, sc:0.28, d:8 },
            { pts:[[54,62],[100,60],[100,100],[50,90]],  tx: 150, ty: 140, rot: 78, sc:0.16, d:38 }
        ];

        var created = [];

        defs.forEach(function (s, i) {
            var div = document.createElement('div');
            div.className = 'pre-shard';

            var pts = s.pts.map(function (p) {
                return (p[0] / 100 * lw).toFixed(1) + 'px ' + (p[1] / 100 * lh).toFixed(1) + 'px';
            }).join(',');

            /* Each shard shows the real logo slice via background-image */
            div.style.cssText =
                'position:fixed;' +
                'left:'   + lx.toFixed(0) + 'px;' +
                'top:'    + ly.toFixed(0) + 'px;' +
                'width:'  + lw.toFixed(0) + 'px;' +
                'height:' + lh.toFixed(0) + 'px;' +
                'clip-path:polygon(' + pts + ');' +
                'background-image:url(ionik-logo.svg);' +
                'background-size:100% 100%;' +
                'background-repeat:no-repeat;' +
                'z-index:11000;' +
                '--shard-tx:'    + s.tx  + 'px;' +
                '--shard-ty:'    + s.ty  + 'px;' +
                '--shard-rot:'   + s.rot + 'deg;' +
                '--shard-sc:'    + s.sc  + ';' +
                '--shard-delay:' + s.d   + 'ms;' +
                '--shard-dur:'   + (780 + i * 24) + 'ms';

            document.body.appendChild(div);

            /* Trigger CSS explosion animation next paint */
            requestAnimationFrame(function () { div.classList.add('exploding'); });

            created.push({ el: div, lx: lx, ly: ly, lw: lw, lh: lh });
        });

        return created;
    }

    /* ── Phase 2: fly shards to sidebar logo, reform, then reveal it ── */
    function reassembleShards(shardData, logoEl) {
        if (!logoEl || !shardData.length) return;

        var tgt    = logoEl.getBoundingClientRect();
        var tgtCx  = tgt.left + tgt.width  / 2;
        var tgtCy  = tgt.top  + tgt.height / 2;
        var first  = shardData[0];
        var srcCx  = first.lx + first.lw / 2;
        var srcCy  = first.ly + first.lh / 2;
        var finalTx = tgtCx - srcCx;
        var finalTy = tgtCy - srcCy;
        var finalSc = tgt.width / first.lw;

        shardData.forEach(function (item, i) {
            var div = item.el;

            /* Capture wherever the shard is right now (mid-CSS-animation) */
            var snap = window.getComputedStyle(div);
            var curTransform = snap.transform;
            var curOpacity   = snap.opacity;

            /* Freeze at current visual position */
            div.style.animation = 'none';
            div.style.transform = curTransform;
            div.style.opacity   = curOpacity;

            /* Two rAFs guarantee the freeze paints before we start the new transition */
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var delay = i * 8; /* tight cascade so they all converge together */
                    div.style.transition =
                        'transform 0.62s cubic-bezier(0.16,1,0.3,1) ' + delay + 'ms,' +
                        'opacity 0.32s ease ' + (delay + 260) + 'ms';
                    div.style.transform =
                        'translate(' + finalTx.toFixed(1) + 'px,' + finalTy.toFixed(1) + 'px)' +
                        ' scale(' + finalSc.toFixed(4) + ')';
                    div.style.opacity = '0';
                });
            });
        });

        /* Sidebar logo flashes in as shards converge */
        setTimeout(function () {
            logoEl.style.transition = 'opacity 0.55s ease, filter 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)';
            logoEl.style.opacity    = '0.82';
            logoEl.style.transform  = 'translateY(0)';
        }, 320);

        /* Remove shard DOM nodes once fully faded */
        setTimeout(function () {
            shardData.forEach(function (item) {
                if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
            });
        }, 1100);
    }

    /* ── Exit sequence ── */
    function runExit() {
        var elapsed = performance.now() - t0;
        var wait    = Math.max(0, MIN_MS - elapsed);

        setTimeout(function () {
            /* 1. Intense mega-glitch on preloader logo */
            if (logoImg) {
                logoImg.classList.remove('breathing');
                logoImg.classList.add('mega-glitch');
            }

            /* 2. After mega-glitch (220ms) — shatter + Phase 1 explode */
            setTimeout(function () {
                var shardData    = buildShards(logoImg);
                var sidebarLogoEl = document.getElementById('sidebarLogo');
                el.classList.add('is-leaving');

                /* Phase 2: shards have been flying ~620ms, now pull them to sidebar */
                setTimeout(function () {
                    reassembleShards(shardData, sidebarLogoEl);
                }, 620);

                /* Page ready — timed so reassembly finishes before hero enters */
                setTimeout(function () {
                    el.classList.add('is-gone');
                    document.body.classList.remove('no-scroll');
                    document.body.classList.add('content-ready');
                }, 1450);
            }, 220);
        }, wait);
    }

    if (document.readyState === 'complete') {
        runExit();
    } else {
        window.addEventListener('load', runExit, { once: true });
    }
}());


/* ─────────────────────────────────────────────────────────
   2. CURSOR
   Dot: snaps instantly, mix-blend-mode difference.
   Ring: lerp 11%, neon white glow.
   Hover detection on all interactive elements.
───────────────────────────────────────────────────────── */
(function Cursor() {
    var dot  = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var mx = -300, my = -300;
    var rx = -300, ry = -300;
    var isHov = false;

    var DOT_HALF  = 4;   /* half of 8px */
    var RING_HALF = 16;  /* half of 32px default */

    var HOVER_SEL = 'a, button, [data-cursor-hover], input, textarea, select, label, .scard, .stat';

    /* ── Mouse tracking ── */
    document.addEventListener('mousemove', function (e) {
        mx = e.clientX;
        my = e.clientY;
        dot.style.transform = 'translate3d(' + (mx - DOT_HALF) + 'px,' + (my - DOT_HALF) + 'px,0)';
    }, { passive: true });

    /* ── Ring lerp loop ── */
    (function tick() {
        rx += (mx - rx) * 0.11;
        ry += (my - ry) * 0.11;
        var half = isHov ? 27 : RING_HALF; /* 54/2 or 32/2 */
        ring.style.transform = 'translate3d(' + (rx - half) + 'px,' + (ry - half) + 'px,0)';
        requestAnimationFrame(tick);
    }());

    /* ── Hover ── */
    document.addEventListener('mouseover', function (e) {
        if (e.target.closest(HOVER_SEL)) {
            isHov = true;
            dot.classList.add('hov');
            ring.classList.add('hov');
        }
    });
    document.addEventListener('mouseout', function (e) {
        if (e.target.closest(HOVER_SEL)) {
            isHov = false;
            dot.classList.remove('hov');
            ring.classList.remove('hov');
        }
    });

    /* ── Click ── */
    document.addEventListener('mousedown', function () { ring.classList.add('click'); });
    document.addEventListener('mouseup',   function () { ring.classList.remove('click'); });

    /* ── Window enter/leave ── */
    document.addEventListener('mouseleave', function () {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
    });
}());


/* ─────────────────────────────────────────────────────────
   3. SIDEBAR
   Toggle open/close, Escape key, scroll spy, auto-close on link click.
───────────────────────────────────────────────────────── */
(function Sidebar() {
    var sidebar  = document.getElementById('sidebar');
    var toggle   = document.getElementById('sidebarToggle');
    var overlay  = document.getElementById('sidebarOverlay');
    if (!sidebar || !toggle) return;

    var isOpen = false;

    function openSidebar() {
        isOpen = true;
        sidebar.classList.add('open');
        toggle.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
        if (overlay) { overlay.classList.add('open'); overlay.removeAttribute('aria-hidden'); }
        document.body.classList.add('no-scroll');
    }

    function closeSidebar() {
        isOpen = false;
        sidebar.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('no-scroll');
    }

    toggle.addEventListener('click', function () {
        if (isOpen) { closeSidebar(); } else { openSidebar(); }
    });

    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) closeSidebar();
    });

    /* Close on sidebar link click (mobile) */
    sidebar.querySelectorAll('.sidebar__link').forEach(function (link) {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 860) closeSidebar();
        });
    });

    /* ── Scroll Spy ── */
    var navLinks    = sidebar.querySelectorAll('.sidebar__link[data-section]');
    var sectionEls  = ['home', 'services', 'about', 'contact']
                        .map(function (id) { return document.getElementById(id); })
                        .filter(Boolean);

    function setActive(id) {
        navLinks.forEach(function (link) {
            link.classList.toggle('active', link.dataset.section === id);
        });
    }

    function updateSpy() {
        /* Trigger point: 40% down from the top of the viewport */
        var trigger = window.scrollY + window.innerHeight * 0.4;
        var current = sectionEls[0];
        sectionEls.forEach(function (el) {
            if (el.offsetTop <= trigger) current = el;
        });
        setActive(current.id);
    }

    window.addEventListener('scroll', updateSpy, { passive: true });
    updateSpy();
}());


/* ─────────────────────────────────────────────────────────
   4. SCROLL PROGRESS
   Updates the thin fill bar on the right edge of the sidebar.
───────────────────────────────────────────────────────── */
(function ScrollProgress() {
    var fill = document.getElementById('scrollFill');
    if (!fill) return;

    var ticking = false;
    window.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(function () {
                var total = document.body.scrollHeight - window.innerHeight;
                var pct   = total > 0 ? (window.scrollY / total) * 100 : 0;
                fill.style.height = pct + '%';
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}());


/* ─────────────────────────────────────────────────────────
   5. SIDEBAR LOGO
   After content-ready: breathing neon glow.
   On mouseenter: RGB glitch plays once, then breathing resumes.
───────────────────────────────────────────────────────── */
(function SidebarLogo() {
    var wrap = document.getElementById('sidebarLogoWrap');
    var logo = document.getElementById('sidebarLogo');
    if (!wrap || !logo) return;

    /* Start breathing after sidebar logo entrance transition (~0.85s) */
    logo.addEventListener('transitionend', function onEntered(e) {
        if (e.propertyName === 'opacity' && !logo.classList.contains('breathing')) {
            logo.removeEventListener('transitionend', onEntered);
            logo.classList.add('breathing');
        }
    });

    /* Glitch on hover — fires once per mouseenter */
    wrap.addEventListener('mouseenter', function () {
        logo.classList.remove('glitch');
        void logo.offsetWidth; /* force reflow to restart animation */
        logo.classList.add('glitch');
    });

    /* After glitch ends, revert to breathing */
    logo.addEventListener('animationend', function (e) {
        if (e.animationName === 'sidebarLogoGlitch') {
            logo.classList.remove('glitch');
        }
    });
}());


/* ─────────────────────────────────────────────────────────
   6. SERVICES ENTRANCE
   Cards stagger in with a 80ms offset using IntersectionObserver.
   Once entered, hover transitions are enabled via .in-view.
───────────────────────────────────────────────────────── */
(function ServicesEntrance() {
    var cards = document.querySelectorAll('.scard');
    if (!cards.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);

            var card  = entry.target;
            var index = Array.prototype.indexOf.call(cards, card);
            var delay = index * 80;

            /* Apply staggered entrance via inline transition + timing */
            setTimeout(function () {
                card.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)';
                card.style.opacity   = '1';
                card.style.transform = 'translateY(0)';

                /* Hand off to CSS hover transitions after entrance completes */
                setTimeout(function () {
                    card.style.transition = '';
                    card.style.opacity    = '';
                    card.style.transform  = '';
                    card.classList.add('in-view');
                }, 720);
            }, delay);
        });
    }, { threshold: 0.12 });

    cards.forEach(function (card) { observer.observe(card); });
}());


/* ─────────────────────────────────────────────────────────
   7. THEME TOGGLE
   Persists preference to localStorage. During the switch a
   temporary .is-switching class enables smooth CSS transitions
   on elements that don't carry them permanently.
───────────────────────────────────────────────────────── */
(function ThemeToggle() {
    var btn  = document.getElementById('themeToggle');
    var body = document.body;
    if (!btn) return;

    var KEY   = 'ionik-color-scheme'; /* versioned key — old 'ionik-theme' values ignored */
    var LIGHT = 'light';

    function applyTheme(theme, animate) {
        if (animate) {
            body.classList.add('is-switching');
            setTimeout(function () { body.classList.remove('is-switching'); }, 520);
        }
        if (theme === LIGHT) {
            body.setAttribute('data-theme', LIGHT);
            btn.setAttribute('aria-label', 'Switch to dark mode');
        } else {
            body.removeAttribute('data-theme');
            btn.setAttribute('aria-label', 'Switch to light mode');
        }
        try { localStorage.setItem(KEY, theme || 'dark'); } catch (_) {}
    }

    /* Restore saved preference — default is always dark */
    var saved = 'dark';
    try { saved = localStorage.getItem(KEY) || 'dark'; } catch (_) {}
    applyTheme(saved === LIGHT ? LIGHT : '', false);

    btn.addEventListener('click', function () {
        var isLight = body.getAttribute('data-theme') === LIGHT;
        applyTheme(isLight ? '' : LIGHT, true);
    });
}());


/* ─────────────────────────────────────────────────────────
   8. CONTACT FORM
   AJAX via FormSubmit, live validation, UI states.
───────────────────────────────────────────────────────── */
(function ContactForm() {
    var form      = document.getElementById('contactForm');
    var submitBtn = document.getElementById('submitBtn');
    var successEl = document.getElementById('formSuccess');
    var failEl    = document.getElementById('formFail');
    if (!form || !submitBtn) return;

    /* Auto-resize textarea */
    var textarea = document.getElementById('f-message');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }

    function isEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    function validate(inputEl, rule) {
        var wrapper = inputEl ? inputEl.closest('.field') : null;
        if (!wrapper) return true;
        var ok = rule(inputEl.value);
        wrapper.classList.toggle('invalid', !ok);
        return ok;
    }

    function clearInvalid(inputEl) {
        var wrapper = inputEl ? inputEl.closest('.field') : null;
        if (wrapper) wrapper.classList.remove('invalid');
    }

    function validateAll() {
        var nameEl    = document.getElementById('f-name');
        var emailEl   = document.getElementById('f-email');
        var messageEl = document.getElementById('f-message');

        var okName    = validate(nameEl,    function (v) { return v.trim().length > 0; });
        var okEmail   = validate(emailEl,   function (v) { return isEmail(v); });
        var okMessage = validate(messageEl, function (v) { return v.trim().length > 0; });

        if (!okName)    { if (nameEl)    nameEl.focus();    return false; }
        if (!okEmail)   { if (emailEl)   emailEl.focus();   return false; }
        if (!okMessage) { if (messageEl) messageEl.focus(); return false; }
        return true;
    }

    /* Live clear on fix */
    ['f-name', 'f-email', 'f-message'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
            var ok = id === 'f-email' ? isEmail(this.value) : this.value.trim().length > 0;
            if (ok) clearInvalid(this);
        });
    });

    function setLoading(on) {
        submitBtn.disabled = on;
        submitBtn.classList.toggle('loading', on);
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateAll()) return;

        setLoading(true);

        try {
            var payload = {
                access_key: 'a881e596-8bc3-4e3d-9529-219d18306304',
                subject:    'New Project Inquiry — IONIK',
                name:       document.getElementById('f-name').value.trim(),
                email:      document.getElementById('f-email').value.trim(),
                message:    document.getElementById('f-message').value.trim()
            };

            var res = await fetch(form.action, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept':       'application/json'
                },
                body: JSON.stringify(payload)
            });

            var json = {};
            try { json = await res.json(); } catch (_) {}

            if (res.ok && (json.success === 'true' || json.success === true)) {
                /* Lock current dimensions so the transition has an explicit start */
                var bw = submitBtn.offsetWidth;
                var bh = submitBtn.offsetHeight;
                submitBtn.style.width  = bw + 'px';
                submitBtn.style.height = bh + 'px';

                /* Double rAF — ensures locked size is painted before morph begins */
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        submitBtn.classList.add('sent');
                    });
                });

                /* After button animation completes, swap to success panel */
                setTimeout(function () {
                    form.style.display = 'none';
                    successEl.hidden   = false;
                }, 1600);
            } else {
                throw new Error('Submission failed');
            }
        } catch (err) {
            console.error('[IONIK] Form error:', err);
            setLoading(false);
            failEl.hidden = false;
            setTimeout(function () { failEl.hidden = true; }, 6000);
        }
    });
}());

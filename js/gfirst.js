/* ═══════════════════════════════════════════════════════════════════════
   GFIRST
   Aucune dépendance. Trois choses seulement : la profondeur de bits, la
   langue, et l'éveil des blocs au défilement. La page est entièrement
   lisible et utilisable sans ce fichier.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

    var racine = document.documentElement;
    var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    /* ═══════════════════════════════════════════════════════════════════
       PROFONDEUR DE BITS
       ═══════════════════════════════════════════════════════════════════ */

    var boutonsPeau = $$(".plaque [data-peau]");

    boutonsPeau.forEach(function (b) {
        b.addEventListener("click", function () {
            racine.setAttribute("data-peau", b.dataset.peau);
            boutonsPeau.forEach(function (o) {
                o.setAttribute("aria-pressed", String(o === b));
            });
        });
    });


    /* ═══════════════════════════════════════════════════════════════════
       LANGUE
       Le français est le contenu réel du HTML ; l'anglais et le japonais
       sont des attributs. Sans ce fichier, la page reste lisible.
       ═══════════════════════════════════════════════════════════════════ */

    var traduisibles = $$("[data-en]");
    var boutonsLangue = $$(".plaque [data-langue]");
    var fonteJaDemandee = false;

    /* Le français d'origine est relevé une fois, avant toute substitution :
       le reconstruire depuis le DOM après un passage en japonais rendrait du
       japonais. */
    traduisibles.forEach(function (el) {
        el.dataset.fr = el.innerHTML;
    });

    /* La fonte japonaise n'est demandée qu'au clic sur 日本語, et
       sous-découpée aux seuls caractères présents dans la page : le
       paramètre `text=` de Google Fonts ramène quelques kilo-octets au lieu
       de trois cents. Un visiteur francophone ne la paie jamais. */
    function chargerFonteJaponaise() {
        if (fonteJaDemandee) { return; }
        fonteJaDemandee = true;

        var vus = {};
        var caracteres = "";
        traduisibles.forEach(function (el) {
            var t = el.dataset.ja || "";
            var i;
            for (i = 0; i < t.length; i++) {
                if (!vus[t[i]]) { vus[t[i]] = 1; caracteres += t[i]; }
            }
        });

        var lien = document.createElement("link");
        lien.rel = "stylesheet";
        lien.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700"
            + "&text=" + encodeURIComponent(caracteres) + "&display=swap";
        document.head.appendChild(lien);

        /* Pile de replis système : si le sous-découpage échoue ou si la
           requête n'aboutit pas, la page affiche du japonais et non des
           tofus. */
        racine.style.setProperty("--courante",
            '"Noto Sans JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif');
    }

    /* Le texte s'efface, se remplace hors de vue, puis revient. Sans ce
       fondu, la substitution claque et on voit la page changer sous l'œil.
       Le léger décalage par bloc évite que tout bascule d'un bloc. */
    function appliquerLangue(code) {
        if (code === "ja") { chargerFonteJaponaise(); }
        else { racine.style.removeProperty("--courante"); }

        racine.setAttribute("lang", code);
        boutonsLangue.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.langue === code));
        });

        function remplacer(el) {
            var t = code === "fr" ? el.dataset.fr : el.dataset[code];
            if (t) { el.innerHTML = t; }
        }

        if (reduit) {
            traduisibles.forEach(remplacer);
            return;
        }

        traduisibles.forEach(function (el, i) {
            setTimeout(function () {
                el.classList.add("mue");
                setTimeout(function () {
                    remplacer(el);
                    el.classList.remove("mue");
                }, 200);
            }, Math.min(i, 8) * 28);
        });
    }

    boutonsLangue.forEach(function (b) {
        b.addEventListener("click", function () { appliquerLangue(b.dataset.langue); });
    });



    /* ═══════════════════════════════════════════════════════════════════
       LE REGARD
       Deux pupilles posées sur la peinture, aux coordonnées relevées dans
       le fichier. Elles se déplacent dans un rayon court : au-delà, l'œil
       sort de son amande et la tête paraît décollée du corps.
       ═══════════════════════════════════════════════════════════════════ */

    var portrait = document.getElementById("portrait");

    if (portrait && !reduit) {
        var yeux = $$(".oeil", portrait);
        var vise = { x: 0, y: 0 };
        var suit = { x: 0, y: 0 };
        var dernierGeste = -99999;

        window.addEventListener("pointermove", function (e) {
            var b = portrait.getBoundingClientRect();
            var cx = b.left + b.width * 0.52;
            var cy = b.top + b.height * 0.38;
            vise.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (b.width * 0.75)));
            vise.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (b.height * 0.6)));
            dernierGeste = performance.now();
        }, { passive: true });

        (function boucleRegard(t) {
            /* Dérive au repos : un regard parfaitement immobile dès que la
               souris s'arrête donne l'impression d'une image figée, ce qui
               est pire que pas de regard du tout. */
            if (t - dernierGeste > 2600) {
                vise.x = Math.sin(t / 3100) * 0.5;
                vise.y = Math.sin(t / 4700) * 0.3;
            }
            suit.x += (vise.x - suit.x) * 0.12;
            suit.y += (vise.y - suit.y) * 0.12;

            yeux.forEach(function (o) {
                var r = portrait.getBoundingClientRect().width;
                o.style.setProperty("--rx", (suit.x * r * 0.006).toFixed(2) + "px");
                o.style.setProperty("--ry", (suit.y * r * 0.0035).toFixed(2) + "px");
            });

            requestAnimationFrame(boucleRegard);
        })(0);
    }


    /* ═══════════════════════════════════════════════════════════════════
       LE ZAPPING
       Chaque lettre des titres est enveloppée, puis celles qui passent sous
       le curseur changent de fonte et de couleur pendant quelques images.
       C'est le seul endroit où le vert et le rose apparaissent : une
       couleur posée à plat est morte, une couleur qui surgit au passage
       est vivante.
       ═══════════════════════════════════════════════════════════════════ */

    function envelopperLettres(el) {
        $$(".ligne", el).concat(el.querySelector(".ligne") ? [] : [el]).forEach(function (cible) {
            var texte = cible.textContent;
            cible.textContent = "";
            texte.split("").forEach(function (ch) {
                if (ch === " ") { cible.appendChild(document.createTextNode(" ")); return; }
                var i = document.createElement("i");
                i.className = "c";
                i.textContent = ch;
                cible.appendChild(i);
            });
        });
    }

    if (!reduit) {
        $$("[data-zap]").forEach(envelopperLettres);

        var lettres = $$("[data-zap] .c");

        if (lettres.length) {
            var boites = [];
            var recalculer = function () {
                boites = lettres.map(function (l) {
                    var b = l.getBoundingClientRect();
                    return { el: l, x: b.left + b.width / 2, y: b.top + b.height / 2 };
                });
            };
            recalculer();
            window.addEventListener("resize", recalculer, { passive: true });
            /* Les positions bougent au défilement : on les relit plutôt que
               de garder un cache qui mentirait dès le premier scroll. */
            window.addEventListener("scroll", recalculer, { passive: true });

            var RAYON = 115;

            window.addEventListener("pointermove", function (e) {
                var i, d, b;
                for (i = 0; i < boites.length; i++) {
                    b = boites[i];
                    d = Math.hypot(e.clientX - b.x, e.clientY - b.y);
                    if (d < RAYON) {
                        if (!b.el.classList.contains("zap") && !b.el.classList.contains("zap-2")) {
                            /* Deux teintes tirées au sort : un grésillement
                               régulier se lit comme une animation, un
                               grésillement irrégulier se lit comme une
                               interférence. */
                            b.el.classList.add(Math.random() < 0.62 ? "zap" : "zap-2");
                            (function (el) {
                                setTimeout(function () {
                                    el.classList.remove("zap", "zap-2");
                                }, 110 + Math.random() * 220);
                            })(b.el);
                        }
                    }
                }
            }, { passive: true });
        }
    }

    /* ═══════════════════════════════════════════════════════════════════
       ÉVEIL AU DÉFILEMENT
       ═══════════════════════════════════════════════════════════════════ */

    /* Mouvement réduit ou navigateur sans observateur : on ne masque rien.
       Un contenu invisible qui ne se révèle jamais serait bien pire qu'une
       absence d'animation. */
    if (!reduit && "IntersectionObserver" in window) {
        var blocs = $$(".bloc-tete, .vignette");

        blocs.forEach(function (b) { b.classList.add("eveil"); });

        var guetteur = new IntersectionObserver(function (entrees) {
            entrees.forEach(function (e) {
                if (!e.isIntersecting) { return; }
                e.target.classList.add("vu");
                guetteur.unobserve(e.target);
            });
        }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });

        blocs.forEach(function (b) { guetteur.observe(b); });
    }
})();

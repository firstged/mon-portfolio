/* ═══════════════════════════════════════════════════════════════════════
   GFIRST — l'arrivée
   Aucune dépendance. Le boîtier, son visage tramé, la profondeur de bits
   et la langue. La page est entièrement lisible sans ce fichier : il
   n'ajoute que du mouvement et deux réglages.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    /* ═══ OUTILS ═══ */

    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rand(a, b) { return a + Math.random() * (b - a); }

    var racine = document.documentElement;
    var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    /* ═══════════════════════════════════════════════════════════════════
       TRAMAGE
       La quantification est le sujet du site : réduire le nombre de valeurs
       possibles et répartir l'erreur sur les pixels voisins. C'est très
       exactement ce que fait la quantization sur les poids d'un réseau.
       ═══════════════════════════════════════════════════════════════════ */

    /* Préréglages par peau. Changer de peau change la précision de l'image :
       BRUT et NET sont le même visage à deux profondeurs de bits, et c'est
       la démonstration du propos plutôt qu'une décoration. */
    var PRESETS = {
        brut: { algo: "atkinson", niveaux: 2, grain: 3, pal: ["#07070a", "#c3f200"] },
        net: { algo: "floyd", niveaux: 8, grain: 1, pal: ["#262c2f", "#7fd4c6"] },
        papier: { algo: "floyd", niveaux: 2, grain: 2, pal: ["#17160f", "#e8e4d9"] }
    };

    function hexVersRvb(h) {
        return [
            parseInt(h.substr(1, 2), 16),
            parseInt(h.substr(3, 2), 16),
            parseInt(h.substr(5, 2), 16)
        ];
    }

    function diffuser(lum, l, h, x, y, v) {
        if (x < 0 || x >= l || y >= h) { return; }
        lum[y * l + x] += v;
    }

    function tramer(lum, l, h, algo, niveaux) {
        var pas = 255 / (niveaux - 1);
        var x, y, i, avant, apres, q;

        for (y = 0; y < h; y++) {
            for (x = 0; x < l; x++) {
                i = y * l + x;
                avant = lum[i];
                apres = clamp(Math.round(avant / pas), 0, niveaux - 1) * pas;
                lum[i] = apres;

                if (algo === "floyd") {
                    q = avant - apres;
                    diffuser(lum, l, h, x + 1, y, q * 7 / 16);
                    diffuser(lum, l, h, x - 1, y + 1, q * 3 / 16);
                    diffuser(lum, l, h, x, y + 1, q * 5 / 16);
                    diffuser(lum, l, h, x + 1, y + 1, q * 1 / 16);
                } else if (algo === "atkinson") {
                    /* Atkinson ne rend que 6/8 de l'erreur à ses voisins. Le
                       huitième perdu est exactement ce qui pousse les clairs
                       au blanc et les sombres au noir : d'où son contraste
                       tranché, et des aplats là où Floyd garderait du détail. */
                    q = (avant - apres) / 8;
                    diffuser(lum, l, h, x + 1, y, q);
                    diffuser(lum, l, h, x + 2, y, q);
                    diffuser(lum, l, h, x - 1, y + 1, q);
                    diffuser(lum, l, h, x, y + 1, q);
                    diffuser(lum, l, h, x + 1, y + 1, q);
                    diffuser(lum, l, h, x, y + 2, q);
                }
            }
        }
    }

    function rendreVers(cible, ctx, src, r) {
        var l = Math.max(2, Math.round(cible.width / r.grain));
        var h = Math.max(2, Math.round(cible.height / r.grain));
        var n = l * h;

        petit.width = l;
        petit.height = h;
        pctx.drawImage(src, 0, 0, l, h);

        var img = pctx.getImageData(0, 0, l, h);
        var d = img.data;
        var lum = new Float32Array(n);
        var i;

        for (i = 0; i < n; i++) {
            lum[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
        }

        tramer(lum, l, h, r.algo, r.niveaux);

        var bas = hexVersRvb(r.pal[0]);
        var haut = hexVersRvb(r.pal[1]);
        var t;

        for (i = 0; i < n; i++) {
            t = lum[i] / 255;
            d[i * 4] = bas[0] + (haut[0] - bas[0]) * t;
            d[i * 4 + 1] = bas[1] + (haut[1] - bas[1]) * t;
            d[i * 4 + 2] = bas[2] + (haut[2] - bas[2]) * t;
            d[i * 4 + 3] = 255;
        }

        pctx.putImageData(img, 0, 0);

        /* Le lissage est coupé à la remontée : c'est lui qui transformerait
           la trame en bouillie grise, et la trame est tout le sujet. */
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cible.width, cible.height);
        ctx.drawImage(petit, 0, 0, l, h, 0, 0, cible.width, cible.height);
    }

    var petit = document.createElement("canvas");
    var pctx = petit.getContext("2d", { willReadFrequently: true });


    /* ═══════════════════════════════════════════════════════════════════
       LE BOÎTIER
       Six faces CSS en preserve-3d. Une boîte est le seul solide qu'on
       obtient exactement sans une ligne de mathématiques.
       ═══════════════════════════════════════════════════════════════════ */

    var boitier = $("#boitier");
    var scene = $("#scene");
    var visage = $("#visage");
    var vctx = visage.getContext("2d");
    var vSource = document.createElement("canvas");
    var vsctx = vSource.getContext("2d");
    var VL = 160;
    var VH = 112;
    vSource.width = VL;
    vSource.height = VH;

    var visee = { x: 0, y: 0 };   /* où pointe le curseur, normalisé −1..1 */
    var boite = { x: 0, y: 0 };   /* la boîte : lente */
    var oeil = { x: 0, y: 0 };    /* les yeux : rapides */
    var dernierGeste = -99999;
    var prochainClin = 2200;
    var finClin = 0;
    var dernierVisage = 0;

    /* roundRect manque encore à des WebView Android en circulation, et son
       absence ferait disparaître le visage entier sans message d'erreur. */
    function arrondi(g, x, y, l, h, r) {
        r = Math.min(r, l / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + l, y, x + l, y + h, r);
        g.arcTo(x + l, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + l, y, r);
        g.closePath();
        g.fill();
    }

    function dessinerOeil(g, cx, cy, ferme) {
        if (ferme) {
            arrondi(g, cx - 13, cy - 3, 26, 6, 3);
            return;
        }
        arrondi(g, cx - 13, cy - 17, 26, 34, 9);
        g.save();
        g.fillStyle = "#f6f6f6";
        arrondi(g, cx - 7, cy - 12, 8, 9, 3);
        g.restore();
    }

    function composerVisage(ox, oy, ferme) {
        var g = vsctx;

        /* La lueur se décale avec le regard : c'est elle qui donne au tramage
           de quoi travailler. Sur un aplat uni, les algorithmes rendent tous
           la même chose et la mascotte perd tout relief. */
        var lueur = g.createRadialGradient(
            VL / 2 + ox * 22, VH / 2 + oy * 15, 5,
            VL / 2, VH / 2, VL * 0.72
        );
        lueur.addColorStop(0, "#ffffff");
        lueur.addColorStop(0.52, "#9d9d9d");
        lueur.addColorStop(1, "#24241f");
        g.fillStyle = lueur;
        g.fillRect(0, 0, VL, VH);

        g.fillStyle = "#0d0d0d";
        dessinerOeil(g, VL * 0.33 + ox * 14, VH * 0.42 + oy * 10, ferme);
        dessinerOeil(g, VL * 0.67 + ox * 14, VH * 0.42 + oy * 10, ferme);

        var ml = 30 + Math.abs(ox) * 14;
        arrondi(g, VL / 2 - ml / 2 + ox * 8, VH * 0.73 + oy * 6, ml, 8, 4);
    }

    function rendreVisage(ox, oy, ferme) {
        composerVisage(ox, oy, ferme);
        rendreVers(visage, vctx, vSource, PRESETS[peauCourante]);
    }

    /* requestAnimationFrame est ici le bon outil, contrairement à un écran
       de chargement : une animation pilotée au curseur n'a aucune raison de
       tourner dans un onglet masqué, et doit se caler sur l'écran. */
    function boucle(t) {
        /* Dérive au repos. Sans elle la mascotte se fige dès que la souris
           s'arrête et elle a l'air morte — pire que pas de mascotte. */
        if (t - dernierGeste > 2200) {
            visee.x = Math.sin(t / 2700) * 0.52;
            visee.y = Math.sin(t / 3900) * 0.34;
        }

        /* Deux vitesses : la boîte traîne, les yeux devancent. C'est l'écart
           entre les deux qui fait qu'elle regarde au lieu de viser. */
        boite.x = lerp(boite.x, visee.x, 0.055);
        boite.y = lerp(boite.y, visee.y, 0.055);
        oeil.x = lerp(oeil.x, visee.x, 0.17);
        oeil.y = lerp(oeil.y, visee.y, 0.17);

        boitier.style.transform =
            "rotateX(" + (-boite.y * 15).toFixed(2) + "deg) " +
            "rotateY(" + (boite.x * 28).toFixed(2) + "deg) " +
            "translateY(" + (Math.sin(t / 1900) * 5).toFixed(2) + "px)";

        if (t > prochainClin) {
            finClin = t + 130;
            prochainClin = t + rand(2800, 6400);
        }

        /* Le visage est bridé à ~30 images par seconde : il repasse par une
           diffusion d'erreur complète à chaque dessin, inutile de la payer
           deux fois par image écran. */
        if (t - dernierVisage > 33) {
            dernierVisage = t;
            rendreVisage(oeil.x, oeil.y, t < finClin);
        }

        requestAnimationFrame(boucle);
    }


    /* ═══════════════════════════════════════════════════════════════════
       PROFONDEUR DE BITS
       ═══════════════════════════════════════════════════════════════════ */

    var peauCourante = "brut";
    var boutonsPeau = $$(".plaque [data-peau]");

    function appliquerPeau(nom) {
        peauCourante = nom;
        racine.setAttribute("data-peau", nom);
        boutonsPeau.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.peau === nom));
        });
        rendreVisage(oeil.x, oeil.y, false);
    }

    boutonsPeau.forEach(function (b) {
        b.addEventListener("click", function () { appliquerPeau(b.dataset.peau); });
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
       le reconstruire depuis le DOM après un passage en japonais donnerait
       du japonais. */
    traduisibles.forEach(function (el) {
        el.dataset.fr = el.innerHTML;
    });

    /* La fonte japonaise n'est demandée qu'au clic sur 日本語, et
       sous-découpée aux seuls caractères présents dans la page : le
       paramètre `text=` de Google Fonts ramène ~2 Ko au lieu de ~300 Ko.
       Un visiteur francophone ne la paie jamais. */
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

        /* La pile de replis système évite les tofus si le sous-découpage
           échoue ou si la requête n'aboutit pas. */
        racine.style.setProperty("--courante",
            '"Noto Sans JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif');
    }

    function appliquerLangue(code) {
        if (code === "ja") { chargerFonteJaponaise(); }
        else { racine.style.removeProperty("--courante"); }

        racine.setAttribute("lang", code === "ja" ? "ja" : code);
        traduisibles.forEach(function (el) {
            var t = code === "fr" ? el.dataset.fr : el.dataset[code];
            if (t) { el.innerHTML = t; }
        });
        boutonsLangue.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.langue === code));
        });
    }

    boutonsLangue.forEach(function (b) {
        b.addEventListener("click", function () { appliquerLangue(b.dataset.langue); });
    });


    /* ═══ DÉMARRAGE ═══ */

    if (reduit) {
        rendreVisage(0, 0, false);
    } else {
        window.addEventListener("pointermove", function (e) {
            var b = scene.getBoundingClientRect();
            visee.x = clamp((e.clientX - (b.left + b.width / 2)) / (b.width / 2), -1.4, 1.4);
            visee.y = clamp((e.clientY - (b.top + b.height / 2)) / (b.height / 2), -1.4, 1.4);
            dernierGeste = performance.now();
        }, { passive: true });

        requestAnimationFrame(boucle);
    }
})();

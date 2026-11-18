/* ═══════════════════════════════════════════════════════════════════════
   GFIRST — portfolio de Gédéon Mouloundi Mayagha
   Aucune dépendance. La page est entièrement lisible et utilisable sans ce
   fichier : le français est le contenu réel du HTML, les chiffres sont
   dans le texte, et rien n'est masqué tant que la classe `js` n'est pas
   posée.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var rand = function (a, b) { return a + Math.random() * (b - a); };
    var pioche = function (t) { return t[Math.floor(Math.random() * t.length)]; };

    var racine = document.documentElement;
    var doux = matchMedia("(prefers-reduced-motion: reduce)").matches;
    racine.classList.add("js");


    /* ═══════════════════════════════════════════════════════════════════
       LA TRAME DE PHOSPHORE
       Mécanique de distorsion de daveholloway.uk détournée vers la
       lumière : chaque cellule stocke la VITESSE du passage, pas sa
       position. C'est ce qui donne la traînée — la charge persiste et
       décroît, elle n'est jamais rafraîchie. Canvas 2D et non WebGL : la
       grille est si grossière qu'un shader serait 703 Ko payés pour rien.
       ═══════════════════════════════════════════════════════════════════ */

    var COTE = 19;            // côté d'une cellule, en px CSS
    var DECROISSANCE = 0.93;  // ce qui reste d'une charge à l'image suivante
    var PORTEE = 132;         // rayon d'influence du doigt, en px
    var GAIN = 0.055;
    var SEUIL = 0.012;        // sous ce niveau la cellule n'est plus dessinée

    var cv = $(".trame");
    var ctx = cv.getContext("2d", { alpha: false });
    var cols = 0, lignes = 0, charge = null, decal = null;
    var dpr = 1, L = 0, H = 0;
    var vivant = true;   // une trame éteinte n'a pas besoin d'être repeinte
    var calme = false;   // peau COOL : le signal est reconstitué, plus de parasites

    function dimensionner() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        L = innerWidth;
        H = innerHeight;
        cv.width = Math.round(L * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = L + "px";
        cv.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(L / COTE) + 1;
        lignes = Math.ceil(H / COTE) + 1;
        charge = new Float32Array(cols * lignes);
        decal = new Int8Array(lignes);
    }

    function deposer(x, y, v) {
        if (!charge) { return; }
        var r = PORTEE / COTE;
        var cx = x / COTE, cy = y / COTE;
        var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(cols - 1, Math.ceil(cx + r));
        var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(lignes - 1, Math.ceil(cy + r));
        var i, j, dx, dy, d;
        for (j = y0; j <= y1; j++) {
            for (i = x0; i <= x1; i++) {
                dx = (i + .5) - cx;
                dy = (j + .5) - cy;
                d = Math.sqrt(dx * dx + dy * dy);
                if (d >= r) { continue; }
                /* Atténuation linéaire, pas gaussienne : le bord de la
                   trace doit rester franc, sinon la trame se lit comme un
                   flou. */
                charge[i + cols * j] += (1 - d / r) * v * GAIN;
            }
        }
        vivant = true;
    }

    /* La couleur vient du CSS : la peau décide, pas le script. Mise en cache
       parce que getComputedStyle force un recalcul de style — l'appeler à
       chaque image coûterait plus cher que tout le rendu. */
    var teinteA = [155, 255, 60], teinteB = [216, 255, 176], intensite = 1, fond = "#000";

    function relireLaPeau() {
        var s = getComputedStyle(racine);
        var lire = function (nom, repli) {
            var v = s.getPropertyValue(nom).trim().split(/[\s,]+/).map(Number);
            return (v.length === 3 && v.every(function (n) { return !isNaN(n); })) ? v : repli;
        };
        teinteA = lire("--phosphore", [155, 255, 60]);
        teinteB = lire("--braise", [216, 255, 176]);
        intensite = parseFloat(s.getPropertyValue("--intensite")) || 1;
        fond = s.getPropertyValue("--nuit").trim() || "#000";
    }

    function peindre() {
        ctx.fillStyle = fond;
        ctx.fillRect(0, 0, L, H);
        var i, j, c, a, t, dx;
        for (j = 0; j < lignes; j++) {
            dx = decal[j] * COTE;
            for (i = 0; i < cols; i++) {
                c = charge[i + cols * j];
                if (c < SEUIL) { continue; }
                a = clamp(c, 0, 1);
                /* Le phosphore n'a pas UNE couleur, il a une température :
                   frappé fort, il vire au blanc-vert. C'est ce qui l'empêche
                   d'être l'accent unique et mort des pages générées. */
                t = clamp((a - .35) / .5, 0, 1);
                ctx.fillStyle = "rgba("
                    + Math.round(teinteA[0] + (teinteB[0] - teinteA[0]) * t) + ","
                    + Math.round(teinteA[1] + (teinteB[1] - teinteA[1]) * t) + ","
                    + Math.round(teinteA[2] + (teinteB[2] - teinteA[2]) * t) + ","
                    + (a * intensite).toFixed(3) + ")";
                /* Coordonnées entières : un fillRect à virgule serait lissé
                   par le navigateur et la trame perdrait son bord net. */
                ctx.fillRect(Math.round(i * COTE + dx), Math.round(j * COTE), COTE - 1, COTE - 1);
            }
        }
    }


    /* ═══════════════════════════════════════════════════════════════════
       LE GRÉSILLEMENT
       En permanence, pas par crises : à tout instant une poignée de lettres
       a décroché. La largeur de chaque lettre est figée au montage, sinon
       le passage à la fonte bitmap pousserait ses voisines et le mot entier
       danserait au lieu de grésiller.
       ═══════════════════════════════════════════════════════════════════ */

    var BUGS = ["police", "couleur", "les-deux", "les-deux"]; // les deux ensemble, plus souvent
    var lettres = [];      // toutes celles qui peuvent décrocher
    var lettresNom = [];   // celles du nom seulement

    function decouper() {
        lettres = [];
        lettresNom = [];
        $$("[data-gresille]").forEach(function (el) {
            /* `== null` et non `!` : une ligne volontairement vide —
               « Gfirst » n'en occupe qu'une sur trois — serait sinon
               reprise du DOM, et le nom afficherait
               « Gédéon / Premier / Mayagha ». */
            if (el.dataset.source == null) { el.dataset.source = el.textContent; }
            var txt = el.dataset.source;
            el.textContent = "";

            /* Chaque mot est enveloppé, et c'est indispensable dès qu'un
               texte grésillant tient sur plusieurs lignes : les lettres
               sont des `inline-block` de largeur figée, donc le navigateur
               les traite comme autant de mots et coupe À L'INTÉRIEUR des
               mots. Mesuré sur la règle : « sur une connexion q / ui
               lâche ». Le nom n'avait jamais montré le défaut parce qu'il
               est en `nowrap`. */
            var mot = null;
            var dansLeMot = function () {
                if (!mot) {
                    mot = document.createElement("span");
                    mot.className = "mot";
                    el.appendChild(mot);
                }
                return mot;
            };

            var duNom = !!el.closest(".nom");
            var i, c, s, fin;
            for (i = 0; i < txt.length; i++) {
                c = txt[i];
                if (c === " ") {
                    el.appendChild(document.createTextNode(" "));
                    mot = null;   // le mot suivant ouvrira son propre bloc
                    continue;
                }
                if (c === "{") {
                    /* {er} : le chiffre de règne part d'un seul tenant.
                       Découpé lettre à lettre, le « e » et le « r »
                       grésilleraient séparément et l'exposant se
                       disloquerait. */
                    fin = txt.indexOf("}", i);
                    if (fin < 0) { fin = txt.length; }
                    s = document.createElement("sup");
                    s.className = "gr";
                    s.textContent = txt.slice(i + 1, fin);
                    dansLeMot().appendChild(s);
                    lettres.push(s);
                    if (duNom) { lettresNom.push(s); }
                    i = fin;
                    continue;
                }
                s = document.createElement("span");
                s.className = "gr";
                s.textContent = c;
                dansLeMot().appendChild(s);
                lettres.push(s);
                if (duNom) { lettresNom.push(s); }
            }
        });
    }

    function figerLesLargeurs() {
        /* Deux passes : on mesure tout avant d'écrire quoi que ce soit,
           sinon chaque écriture invalide la mise en page de la mesure
           suivante. */
        var l = lettres.map(function (s) { s.style.width = ""; return s; });
        var w = l.map(function (s) { return s.getBoundingClientRect().width; });
        l.forEach(function (s, i) { s.style.width = w[i].toFixed(2) + "px"; });
    }

    var prochainGres = 0;

    function gresiller(t) {
        if (t < prochainGres || !lettres.length) { return; }
        prochainGres = t + rand(55, 210);

        var combien = Math.random() < .25 ? 2 : 1;
        var k, s;
        for (k = 0; k < combien; k++) {
            s = pioche(lettres);
            if (s.dataset.bug) { continue; }
            s.dataset.bug = pioche(BUGS);
            if (Math.random() < .45) { s.style.setProperty("--saut", (rand(-3, 3)).toFixed(1) + "px"); }
            (function (el) {
                setTimeout(function () {
                    delete el.dataset.bug;
                    el.style.setProperty("--saut", "0px");
                }, rand(45, 190));
            })(s);
        }
    }


    /* ═══════════════════════════════════════════════════════════════════
       LE DÉCROCHAGE DE BANDE
       Plus rare et plus large que le grésillement : une tranche entière du
       signal perd la synchronisation. Le fond ET une ligne du nom partent
       ensemble — sinon ce serait un filtre posé sur l'image, pas une panne
       du même appareil.
       ═══════════════════════════════════════════════════════════════════ */

    var lignesNom = $$(".nom .ligne");
    /* Pas de décrochage pendant la séquence d'arrivée : le premier serait
       pris pour un défaut de chargement. */
    var prochainZap = 3000;

    function zapper(t) {
        if (t < prochainZap) { return; }
        prochainZap = t + rand(2600, 6200);

        var haut = Math.floor(rand(0, Math.max(1, lignes - 4)));
        var epaisseur = Math.floor(rand(1, 4));
        var saut = (Math.random() < .5 ? -1 : 1) * Math.floor(rand(1, 4));
        var j;
        for (j = haut; j < Math.min(lignes, haut + epaisseur); j++) { decal[j] = saut; }
        vivant = true;

        var victime = pioche(lignesNom);
        if (victime) { victime.style.setProperty("--decroche", (saut * 7) + "px"); }

        setTimeout(function () {
            decal.fill(0);
            vivant = true;
            if (victime) { victime.style.setProperty("--decroche", "0px"); }
        }, rand(70, 150));
    }


    /* ═══════════════════════════════════════════════════════════════════
       LE NOM QUI ZAPPE EN MARQUE
       Trois états, et l'ordre est le propos : le nom civil, puis le nom de
       règne, puis la marque. Le décrochage explique d'où vient le poinçon
       au lieu de le décorer. Le chiffre de règne passe par `{er}` et non
       par les exposants Unicode ᵉ ʳ : ils manquent à Archivo et tomberaient
       en tofu.
       ═══════════════════════════════════════════════════════════════════ */

    var NOMS = [
        ["Gédéon I{er}", "Mouloundi", "Mayagha"],
        ["GÉDÉON I{er}", "", ""],   // le nom de règne monte en capitales
        ["Gfirst", "", ""]
    ];
    var etatNom = 0, prochaineMut = 5200;

    function poserNom(k) {
        NOMS[k].forEach(function (mot, i) {
            if (lignesNom[i]) { lignesNom[i].dataset.source = mot; }
        });
        decouper();
        figerLesLargeurs();
    }

    function muterNom(t) {
        if (t < prochaineMut) { return; }
        etatNom = (etatNom + 1) % NOMS.length;

        /* Les lettres DU NOM décrochent toutes, le texte change pendant
           qu'elles sont illisibles, puis elles se rétablissent. Sans ce
           voile, la bascule se lirait comme un simple remplacement de texte.

           Restreint au nom, et c'est le correctif : le voile portait sur
           toutes les lettres grésillantes de la page, donc le titre et la
           règle de la section suivante basculaient en bitmap vert avec lui.
           Un paragraphe entier illisible pendant 180 ms se lit comme une
           panne — et la hardiesse ne doit se dépenser qu'à un seul endroit. */
        lettresNom.forEach(function (s) { s.dataset.bug = "les-deux"; });
        setTimeout(function () {
            poserNom(etatNom);
            lettresNom.forEach(function (s) { s.dataset.bug = "les-deux"; });
            setTimeout(function () {
                lettresNom.forEach(function (s) { delete s.dataset.bug; });
            }, 85);
        }, 95);

        prochaineMut = t + (etatNom === 0 ? rand(7000, 13000)
            : etatNom === 1 ? 560
                : 1050);
    }


    /* ═══ LA MARQUE QUI DÉCROCHE ════════════════════════════════════════ */

    var ETATS_MARQUE = ["sceau", "nu", "sceau"];  // le sceau plus souvent : c'est son favori
    var poincon = $(".poincon");
    var prochainePoincon = 2400;

    function zapperLaMarque(t) {
        if (t < prochainePoincon || !poincon) { return; }
        prochainePoincon = t + rand(2200, 5600);
        poincon.dataset.etat = pioche(ETATS_MARQUE);
        if (Math.random() < .55) { poincon.dataset.bug = "1"; }
        setTimeout(function () {
            poincon.dataset.etat = "cercle";
            poincon.removeAttribute("data-bug");
        }, rand(130, 420));
    }


    /* ═══ CE QUI ALIMENTE LA GRILLE ═════════════════════════════════════ */

    var px = -1, py = -1;

    addEventListener("pointermove", function (e) {
        if (px >= 0) {
            /* Plafond : un saut de curseur d'un bord à l'autre ne doit pas
               saturer toute la grille d'un coup. */
            deposer(e.clientX, e.clientY, Math.min(Math.hypot(e.clientX - px, e.clientY - py), 90));
        }
        px = e.clientX;
        py = e.clientY;
    }, { passive: true });

    /* Sur téléphone il n'y a pas de survol : c'est le défilement qui fait
       vivre la trame. Sans ça le fond serait mort sur le cas d'usage
       principal — exactement le défaut de daveholloway.uk, qui ne pose
       aucun écouteur en tactile. */
    var yPrec = scrollY;
    addEventListener("scroll", function () {
        var dv = Math.abs(scrollY - yPrec);
        yPrec = scrollY;
        if (dv >= 1) { deposer(L * .5, H * .62, Math.min(dv * 1.4, 70)); }
    }, { passive: true });

    var minuteurTaille = 0;
    addEventListener("resize", function () {
        dimensionner();
        clearTimeout(minuteurTaille);
        /* Les largeurs figées sont fausses dès que le corps change : le nom
           est dimensionné en vw. */
        minuteurTaille = setTimeout(figerLesLargeurs, 160);
    });


    /* ═══ LA BOUCLE ═════════════════════════════════════════════════════ */

    function battre(t) {
        if (!calme) {
            zapper(t);
            gresiller(t);
            muterNom(t);
            zapperLaMarque(t);
        }
        var reste = 0, k;
        for (k = 0; k < charge.length; k++) {
            charge[k] *= DECROISSANCE;
            if (charge[k] > SEUIL) { reste++; }
        }
        if (reste || vivant) {
            peindre();
            vivant = reste > 0;
        }
        requestAnimationFrame(battre);
    }


    /* ═══ MISE EN ROUTE ═════════════════════════════════════════════════ */

    dimensionner();
    relireLaPeau();
    decouper();

    /* Les largeurs ne valent rien tant qu'Archivo n'est pas là : mesurées
       sur la fonte de repli, elles figeraient le nom à la mauvaise chasse. */
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
        .then(figerLesLargeurs);

    if (doux) {
        /* Mouvement réduit : la trame existe, elle ne bouge pas. Aucun
           grésillement, aucun décrochage, pas de rAF. */
        deposer(L * .72, H * .3, 55);
        peindre();
    } else {
        /* Impulsion d'arrivée : la grille s'allume une fois, puis s'éteint.
           C'est la seule animation que la visiteuse n'a pas déclenchée. */
        deposer(L * .74, H * .34, 190);
        requestAnimationFrame(battre);
    }

    requestAnimationFrame(function () {
        racine.classList.add("pret");
        /* Une fois la séquence d'arrivée finie, on coupe la transition de
           `transform` sur les lignes du nom : à partir de là, le seul
           mouvement horizontal est le décrochage, et il doit être sec. */
        setTimeout(function () {
            racine.classList.add("pose");
        }, 1100);
    });


    /* ═══════════════════════════════════════════════════════════════════
       LA MESURE — une case, un kilo-octet
       Les cases sont bâties par le script et non écrites dans la page :
       737 éléments dans le HTML pèseraient plus que le propos qu'ils
       servent. Les chiffres, eux, sont dans le texte — donc l'argument
       tient sans JavaScript.
       ═══════════════════════════════════════════════════════════════════ */

    function batir(bloc) {
        var mien = parseInt(bloc.dataset.mien, 10) || 0;
        var ailleurs = parseInt(bloc.dataset.ailleurs, 10) || 0;
        var total = mien + ailleurs;
        if (!total) { return; }
        var lot = document.createDocumentFragment();
        var i, c;
        for (i = 0; i < total; i++) {
            c = document.createElement("i");
            c.className = "ko " + (i < mien ? "ko--mien" : "ko--ailleurs");
            /* Égrenage proportionnel, plafonné à 740 ms pour le bloc
               entier : 632 cases à 4 ms chacune feraient deux secondes et
               demie avant que la dernière arrive, et le décompte
               deviendrait une animation à regarder au lieu d'une mesure à
               lire. */
            c.style.setProperty("--retard", Math.round(i / total * 740) + "ms");
            lot.appendChild(c);
        }
        bloc.appendChild(lot);
    }

    var mesures = $$(".mesure");
    mesures.forEach(batir);


    /* ═══════════════════════════════════════════════════════════════════
       L'ÉVEIL AU DÉFILEMENT
       Un seul guetteur pour les mesures et les blocs : le décompte part
       quand la section entre dans le champ, pas au chargement — c'est le
       seul moment où il se lit.
       ═══════════════════════════════════════════════════════════════════ */

    if ("IntersectionObserver" in window) {
        var guet = new IntersectionObserver(function (entrees) {
            entrees.forEach(function (e) {
                if (!e.isIntersecting) { return; }
                e.target.classList.add(e.target.classList.contains("mesure") ? "compte" : "vu");
                guet.unobserve(e.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });

        mesures.forEach(function (m) { guet.observe(m); });

        /* Mouvement réduit : rien n'est masqué, donc rien à révéler. Un
           contenu invisible qui ne se révèle jamais serait bien pire qu'une
           absence d'animation. */
        if (!doux) {
            $$(".bloc-tete, .vignette").forEach(function (b) {
                b.classList.add("eveil");
                guet.observe(b);
            });
        }
    } else {
        /* Sans guetteur, les cases doivent être visibles tout de suite :
           une mesure invisible est une mesure perdue. */
        mesures.forEach(function (m) { m.classList.add("compte"); });
    }


    /* ═══════════════════════════════════════════════════════════════════
       L'EFFET PIXEL — les captures décrochent au survol

       Une impulsion, pas un état : la capture se grossit en gros pixels
       puis se rétablit toute seule. Un état coarse tenu tant que le doigt
       reste dessus cacherait justement ce qu'on vient regarder.

       La toile n'est créée qu'au premier survol — cinq toiles montées au
       chargement pour un effet que personne n'a encore demandé, c'est le
       genre de dépense que ce site refuse.
       ═══════════════════════════════════════════════════════════════════ */

    if (!doux) {
        $$(".ecran").forEach(function (cadre) {
            var img = $("img", cadre);
            if (!img) { return; }
            var toile = null, ctx2 = null, debut = 0, encours = false;

            var DUREE = 540;
            var GROS = 9;   // taille du plus gros pixel, en pixels d'image

            function pulsation(t) {
                var a = clamp((t - debut) / DUREE, 0, 1);
                /* Aller-retour : le décrochage monte vite et redescend plus
                   lentement, comme une charge qui s'évacue. */
                var f = a < .32 ? a / .32 : 1 - (a - .32) / .68;
                var k = 1 + f * f * (GROS - 1);
                var l = Math.max(1, Math.round(toile.width / k));
                var h = Math.max(1, Math.round(toile.height / k));
                ctx2.imageSmoothingEnabled = false;
                ctx2.clearRect(0, 0, toile.width, toile.height);
                ctx2.drawImage(img, 0, 0, l, h);
                ctx2.drawImage(toile, 0, 0, l, h, 0, 0, toile.width, toile.height);
                if (a < 1) {
                    requestAnimationFrame(pulsation);
                } else {
                    encours = false;
                    toile.style.opacity = "0";
                }
            }

            cadre.addEventListener("pointerenter", function () {
                if (encours || !img.complete || !img.naturalWidth) { return; }
                if (!toile) {
                    toile = document.createElement("canvas");
                    toile.width = img.naturalWidth;
                    toile.height = img.naturalHeight;
                    toile.setAttribute("aria-hidden", "true");
                    ctx2 = toile.getContext("2d");
                    cadre.appendChild(toile);
                }
                toile.style.opacity = "1";
                encours = true;
                debut = performance.now();
                requestAnimationFrame(pulsation);
            });
        });
    }


    /* ═══════════════════════════════════════════════════════════════════
       LES PUPITRES
       ═══════════════════════════════════════════════════════════════════ */

    $$("[data-peau]").forEach(function (b) {
        b.addEventListener("click", function () {
            $$("[data-peau]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
            racine.setAttribute("data-peau", b.dataset.peau);
            relireLaPeau();
            vivant = true;

            calme = b.dataset.peau === "cool";
            if (calme) {
                /* Remettre le signal au propre : COOL ne doit garder aucune
                   trace d'un décrochage resté en cours au moment de la
                   bascule. */
                lettres.forEach(function (s) {
                    delete s.dataset.bug;
                    s.style.setProperty("--saut", "0px");
                });
                lignesNom.forEach(function (l) { l.style.setProperty("--decroche", "0px"); });
                if (decal) { decal.fill(0); }
                if (poincon) {
                    poincon.dataset.etat = "cercle";
                    poincon.removeAttribute("data-bug");
                }
                if (etatNom !== 0) { etatNom = 0; poserNom(0); }
            } else {
                /* Le compte à rebours repart de zéro, sinon le premier
                   décrochage tomberait aussitôt après le retour en BRUT. */
                var t = performance.now();
                prochaineMut = t + 4200;
                prochainePoincon = t + 1800;
                prochainZap = t + 2000;
                prochainGres = t + 400;
            }
            if (doux) { peindre(); }
        });
    });

    /* Le français d'origine est relevé une fois, avant toute substitution :
       le reconstruire depuis le DOM après un passage en japonais rendrait
       du japonais. */
    var origine = new WeakMap();

    $$("[data-langue]").forEach(function (b) {
        b.addEventListener("click", function () {
            var vers = b.dataset.langue;
            $$("[data-langue]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
            racine.lang = vers;

            $$("[data-en]").forEach(function (el, i) {
                if (!origine.has(el)) { origine.set(el, el.dataset.source || el.innerHTML); }
                var txt = vers === "fr" ? origine.get(el) : el.dataset[vers];
                if (txt == null) { return; }
                /* Fondu avec un léger décalage par bloc : une bascule
                   instantanée se lit comme un bug, pas comme un changement
                   de langue. */
                el.style.transition = "opacity .2s var(--ease-out)";
                el.style.opacity = "0";
                setTimeout(function () {
                    if (el.hasAttribute("data-gresille")) {
                        el.dataset.source = txt;   // le texte source change avec la langue
                    } else {
                        el.innerHTML = txt;
                    }
                    el.style.opacity = "1";
                    if (el.hasAttribute("data-gresille")) { decouper(); figerLesLargeurs(); }
                }, 120 + Math.min(i, 10) * 45);
            });
        });
    });

    /* Le japonais n'est chargé qu'au clic, et sous-découpé aux seuls
       caractères présents : un visiteur francophone ne paie jamais les
       ~300 Ko de la fonte CJK. */
    var jaDemande = false;
    var btnJa = $('[data-langue="ja"]');
    if (btnJa) {
        btnJa.addEventListener("click", function () {
            if (jaDemande) { return; }
            jaDemande = true;
            var jeu = "日本語";
            $$("[data-ja]").forEach(function (el) { jeu += el.dataset.ja; });
            var l = document.createElement("link");
            l.rel = "stylesheet";
            l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&text="
                + encodeURIComponent(Array.from(new Set(jeu.split(""))).join("")) + "&display=swap";
            document.head.appendChild(l);
            /* Pile de replis système : si le sous-découpage échoue ou si la
               requête n'aboutit pas, la page affiche du japonais et non des
               tofus. */
            document.body.style.fontFamily =
                '"Archivo", "Noto Sans JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
        });
    }
})();

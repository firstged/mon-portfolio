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
       Les carrés de phosphore qui s'allumaient au passage du curseur
       sont retirés : il les a refusés deux fois, et ce qu'il demandait
       depuis le 8 novembre est ici. Les signes sont gravés dans le
       fond en permanence, et c'est leur TRACÉ qui s'éclaire quand le
       curseur approche, signe par signe.
       Canvas 2D et non WebGL : on dessine une quinzaine de chemins par
       image, un shader serait 703 Ko payés pour rien.
       ═══════════════════════════════════════════════════════════════════ */

    var PAS = 58;             // écart du semis, en px écran
    var TAILLE = 38;          // côté d'un signe, en px écran
    var GRAVURE = 0.085;      // ce qu'on voit d'un signe sans lumière
    var LUEUR_R = 200;        // au-delà, un signe reste éteint
    var BANDE = 26;           // hauteur d'une bande de décrochage, en px

    var cv = $(".trame");
    var ctx = cv.getContext("2d", { alpha: false });

    /* La gravure est dessinée UNE fois dans une toile hors écran. À chaque
       image on la recopie d'un seul `drawImage`, puis on ne redessine que
       les quelques signes qui tombent sous la lumière. Le coût par image ne
       dépend donc pas de la densité du semis. */
    var graveCv = document.createElement("canvas");
    var graveCtx = graveCv.getContext("2d");

    var semis = [];           // les signes posés : où, quelle taille, quel tour
    var Lref = 0, Href = 0;   // l'étendue sur laquelle la gravure a été faite
    var decal = null;         // le décrochage, par bande
    var dpr = 1, L = 0, H = 0;
    var vivant = true;        // un mur immobile n'a pas besoin d'être repeint
    var calme = false;        // peau COOL : le signal est reconstitué, plus de parasites

    /* Les motifs. Ce ne sont pas des glyphes inventés : ce sont des figures
       relevées sur l'art kota et sur les scarifications d'ici. Losanges
       simples et redoublés, mabinda à neuf losanges, chevrons de tempe,
       damiers, peignes. Un fond décoratif aurait pu venir de n'importe où ;
       celui-ci ne pouvait venir que de ce pays.

       Tracés au trait dans un carré unitaire, donc semés, tournés et mis à
       l'échelle sans coûter un octet d'image. La démonstration qu'il avait
       apportée chargeait 1,8 Mo pour obtenir le même genre de fond. */
    var SIGNES = [
        /* losange nu — kota */
        "M .5 .06 L .94 .5 L .5 .94 L .06 .5 Z",
        /* losange redoublé */
        "M .5 .02 L .98 .5 L .5 .98 L .02 .5 Z M .5 .24 L .76 .5 L .5 .76 L .24 .5 Z",
        /* mabinda — les neuf losanges, grille 3x3 tournée de 45° */
        "M .5 0 L 1 .5 L .5 1 L 0 .5 Z M .333 .167 L .833 .667 M .167 .333 L .667 .833 " +
            "M .333 .833 L .833 .333 M .167 .667 L .667 .167",
        /* losange croisé */
        "M .5 .08 L .92 .5 L .5 .92 L .08 .5 Z M .5 .08 L .5 .92 M .08 .5 L .92 .5",
        /* chevrons empilés — tempes */
        "M .08 .34 L .5 .1 L .92 .34 M .08 .6 L .5 .36 L .92 .6 M .08 .86 L .5 .62 L .92 .86",
        /* chevrons inversés */
        "M .08 .14 L .5 .38 L .92 .14 M .08 .4 L .5 .64 L .92 .4 M .08 .66 L .5 .9 L .92 .66",
        /* damier plein 3x3 */
        "F .06 .06 .29 .29 F .64 .06 .29 .29 F .35 .35 .29 .29 F .06 .64 .29 .29 F .64 .64 .29 .29",
        /* damier évidé */
        "M .06 .06 L .94 .06 L .94 .94 L .06 .94 Z M .06 .35 L .94 .35 M .06 .65 L .94 .65 " +
            "M .35 .06 L .35 .94 M .65 .06 L .65 .94",
        /* peigne — les traits répétés de la scarification */
        "M .14 .12 L .14 .88 M .32 .12 L .32 .88 M .5 .12 L .5 .88 M .68 .12 L .68 .88 M .86 .12 L .86 .88",
        /* peigne couché, barré */
        "M .06 .5 L .94 .5 M .18 .22 L .18 .78 M .42 .22 L .42 .78 M .66 .22 L .66 .78 M .9 .22 L .9 .78",
        /* croissant — coiffure kota */
        "M .1 .72 L .5 .14 L .9 .72 M .22 .72 L .5 .34 L .78 .72",
        /* losange sur socle */
        "M .5 .06 L .86 .44 L .5 .82 L .14 .44 Z M .22 .94 L .78 .94",
        /* œil de losange */
        "M .5 .1 L .9 .5 L .5 .9 L .1 .5 Z C .5 .5 .17",
        /* bande en zigzag */
        "M .04 .68 L .28 .32 L .52 .68 L .76 .32 L .96 .62 M .04 .9 L .96 .9"
    ];

    function tracerSigne(c, def, taille) {
        var j = def.split(" ");
        var i = 0, n = j.length, op, a, b, r;
        c.beginPath();
        while (i < n) {
            op = j[i++];
            if (op === "M") { c.moveTo(+j[i++] * taille, +j[i++] * taille); }
            else if (op === "L") { c.lineTo(+j[i++] * taille, +j[i++] * taille); }
            else if (op === "Z") { c.closePath(); }
            else if (op === "C") {
                a = +j[i++] * taille; b = +j[i++] * taille; r = +j[i++] * taille;
                c.moveTo(a + r, b);
                c.arc(a, b, r, 0, Math.PI * 2);
            } else if (op === "F") {
                a = +j[i++] * taille; b = +j[i++] * taille;
                c.rect(a, b, +j[i++] * taille, +j[i++] * taille);
            }
        }
        c.stroke();
    }

    /* Un bruit déterministe plutôt que Math.random : le semis doit rester
       identique après un redimensionnement, sinon tout le mur se rejoue à
       chaque poignée de pixels gagnés sur la fenêtre. */
    function brouiller(n) {
        var x = Math.sin(n * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    }

    /* La couleur vient du CSS : la peau décide, pas le script. Mise en cache
       parce que getComputedStyle force un recalcul de style — l'appeler à
       chaque image coûterait plus cher que tout le rendu. */
    var teinteA = [155, 255, 60], teinteB = [216, 255, 176], intensite = 1, fond = "#000";

    function dimensionner() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        L = innerWidth;
        H = innerHeight;
        cv.width = Math.round(L * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = L + "px";
        cv.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        decal = new Int8Array(Math.ceil(H / BANDE) + 1);

        /* La gravure n'est refaite que si elle ne couvre plus l'écran. Sur
           téléphone, la barre d'adresse qui se rétracte déclenche un resize
           à chaque défilement : rebâtir le semis à chaque fois ferait sauter
           le motif sous les doigts et coûterait cher pour rien. La réserve
           de 240 px absorbe l'oscillation. */
        if (L !== Lref || H > Href) {
            Lref = L;
            Href = H + 240;
            graveCv.width = Math.round(L * dpr);
            graveCv.height = Math.round(Href * dpr);
            graveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            batirLeMur();
        }

        /* Une toile opaque fraîchement redimensionnée est NOIRE, pas vide.
           Sans ce repeint immédiat, la peau COOL virait au noir à chaque
           défilement sur téléphone, le temps qu'un autre événement réveille
           la boucle. C'est le défaut qu'il a vu sur son appareil. */
        vivant = true;
        peindre();
    }

    function batirLeMur() {
        semis.length = 0;
        var cm = Math.ceil(L / PAS) + 1, lm = Math.ceil(Href / PAS) + 1;
        var a, b, g;

        for (b = 0; b < lm; b++) {
            for (a = 0; a < cm; a++) {
                g = brouiller(a * 7919 + b * 104729);
                /* Un emplacement sur huit reste vide : un semis parfaitement
                   plein ferait un papier peint régulier, et ces signes
                   doivent se deviner, pas se compter. */
                if (g > 0.88) { continue; }
                semis.push({
                    x: a * PAS + (brouiller(a * 31 + b * 17) - 0.5) * PAS * 0.34,
                    y: b * PAS + (brouiller(a * 13 + b * 57) - 0.5) * PAS * 0.34,
                    t: TAILLE * (0.72 + brouiller(a * 101 + b * 211) * 0.56),
                    r: Math.floor(brouiller(a * 53 + b * 97) * 4) * (Math.PI / 2),
                    d: SIGNES[Math.floor(g * 15.9) % SIGNES.length]
                });
            }
        }
        graverLeMur();
    }

    function poserSigne(c, sg) {
        c.save();
        c.translate(sg.x + TAILLE * 0.5, sg.y + TAILLE * 0.5);
        c.rotate(sg.r);
        c.translate(-sg.t * 0.5, -sg.t * 0.5);
        tracerSigne(c, sg.d, sg.t);
        c.restore();
    }

    /* L'état de repos : les signes sont INSCRITS, visibles en permanence, à
       peine détachés du fond. C'est une gravure, pas une apparition. */
    function graverLeMur() {
        if (!semis.length) { return; }
        graveCtx.clearRect(0, 0, L, Href);
        graveCtx.lineWidth = 1;
        graveCtx.lineCap = "square";
        graveCtx.lineJoin = "miter";
        graveCtx.strokeStyle = "rgba(" + teinteB[0] + "," + teinteB[1] + "," + teinteB[2]
            + "," + (GRAVURE * intensite).toFixed(3) + ")";
        var i;
        for (i = 0; i < semis.length; i++) { poserSigne(graveCtx, semis[i]); }
    }

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
        graverLeMur();   // la gravure porte la couleur de la peau
        vivant = true;
        /* Peint tout de suite, sans attendre la boucle : quand le navigateur
           met `requestAnimationFrame` en veille (fenêtre sans le focus), la
           toile gardait la couleur de l'ancienne peau. En COOL, ça donnait
           un fond noir sous un texte sombre. */
        peindre();
    }

    /* ─── LE RENDU ──────────────────────────────────────────────────────
       Ce n'est pas une lampe posée sur le mur. Une lampe dessine un disque,
       et son bord se voit. Ici chaque signe décide lui-même de son éclat
       selon sa distance au curseur : ce sont les COURBES qui s'allument, et
       la limite de la zone éclairée épouse les signes au lieu d'être ronde.

       Deux conséquences qu'un masque circulaire ne donne pas : un signe
       s'allume entier ou pas du tout, jamais coupé en deux par un cercle ;
       et son trait épaissit en s'éclairant, comme un filament qui chauffe. */
    function peindre() {
        ctx.fillStyle = fond;
        ctx.fillRect(0, 0, L, H);
        if (!semis.length) { return; }

        /* La gravure, recopiée bande par bande : c'est ce découpage qui
           permet au décrochage de faire glisser une tranche du mur. Hors
           décrochage, une seule recopie suffit. */
        var zappe = false, j;
        for (j = 0; j < decal.length; j++) { if (decal[j]) { zappe = true; break; } }

        /* La gravure est plus haute que l'écran : on n'en recopie que la
           tranche visible, sinon elle serait comprimée à la hauteur de la
           fenêtre et le motif changerait de taille au défilement. */
        if (!zappe) {
            ctx.drawImage(graveCv, 0, 0, graveCv.width, H * dpr, 0, 0, L, H);
        } else {
            for (j = 0; j < decal.length; j++) {
                ctx.drawImage(graveCv,
                    0, j * BANDE * dpr, graveCv.width, BANDE * dpr,
                    decal[j] * 7, j * BANDE, L, BANDE);
            }
        }

        /* Les signes sous la lumière. Rien à faire tant que le pointeur
           n'est pas entré dans la page : sur téléphone le mur reste gravé,
           ce qui est son état normal et non une version dégradée. */
        if (px < 0) { return; }

        var i, sg, dx, dy, d, k;
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
        for (i = 0; i < semis.length; i++) {
            sg = semis[i];
            dx = (sg.x + TAILLE * 0.5) - px;
            dy = (sg.y + TAILLE * 0.5) - py;
            d = Math.sqrt(dx * dx + dy * dy);
            if (d >= LUEUR_R) { continue; }

            /* Puissance 1,6 et non linéaire : l'éclat doit tomber vite,
               sinon tous les signes du voisinage s'allument à peu près
               pareil et on retrouve le disque qu'on voulait éviter. */
            k = Math.pow(1 - d / LUEUR_R, 1.6);

            ctx.lineWidth = 1 + k * 1.1;
            ctx.strokeStyle = "rgba("
                + Math.round(teinteA[0] + (teinteB[0] - teinteA[0]) * k) + ","
                + Math.round(teinteA[1] + (teinteB[1] - teinteA[1]) * k) + ","
                + Math.round(teinteA[2] + (teinteB[2] - teinteA[2]) * k) + ","
                + (k * 0.92 * intensite).toFixed(3) + ")";
            poserSigne(ctx, sg);
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
    var machineTrait = $(".machine-trait");
    var titreNom = $(".nom");
    /* Pas de décrochage pendant la séquence d'arrivée : le premier serait
       pris pour un défaut de chargement. */
    var prochainZap = 3000;

    function zapper(t) {
        if (t < prochainZap) { return; }
        prochainZap = t + rand(2600, 6200);

        /* Les bandes sont celles du mur, pas celles de l'ancienne grille :
           `lignes` n'existe plus, et s'y référer plantait la boucle à chaque
           image — donc plus un seul repeint, donc plus de lumière. */
        var nb = decal.length;
        var haut = Math.floor(rand(0, Math.max(1, nb - 4)));
        var epaisseur = Math.floor(rand(1, 4));
        var saut = (Math.random() < .5 ? -1 : 1) * Math.floor(rand(1, 4));
        var j;
        for (j = haut; j < Math.min(nb, haut + epaisseur); j++) { decal[j] = saut; }
        vivant = true;

        var victime = pioche(lignesNom);
        if (victime) { victime.style.setProperty("--decroche", (saut * 7) + "px"); }

        /* Le tracé de la machine décroche avec le reste : c'est le même
           signal qui lâche, au fond comme à la surface. Une propriété
           custom plutôt qu'une classe, pour que le CSS garde la main sur
           ce qu'il en fait selon la peau. */
        if (machineTrait) {
            machineTrait.style.setProperty("--machine-decroche", (saut * 3.5) + "px");
        }

        setTimeout(function () {
            decal.fill(0);
            vivant = true;
            if (victime) { victime.style.setProperty("--decroche", "0px"); }
            if (machineTrait) { machineTrait.style.setProperty("--machine-decroche", "0px"); }
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
        /* L'état est publié sur le titre parce que la marque peinte doit
           s'effacer quand le nom devient « Gfirst » lui-même — sans ça le
           mot s'affiche deux fois. C'est le CSS qui s'en charge, le JS ne
           fait que dire où on en est. */
        if (titreNom) { titreNom.dataset.etat = k; }
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


    /* ═══ LA SIGNATURE QUI ZAPPE ════════════════════════════════════════
       Le dernier objet de la page alterne entre le mot peint et le poinçon.
       C'est le seul endroit du site où la marque se montre sous ses deux
       formes au même endroit : ce qu'on voit en dernier est ce qu'on
       emporte.

       Quatre secondes de mot, deux de poinçon. Plus court, la page
       clignoterait ; plus long, on quitterait l'onglet sans avoir vu la
       seconde forme.                                                      */

    var signature = $(".contact-signature");
    var prochaineSignature = 4000;

    function zapperLaSignature(t) {
        if (!signature || t < prochaineSignature) { return; }

        var versPoincon = signature.dataset.etat !== "poincon";
        /* L'état intermédiaire dure 90 ms : c'est le temps d'une image de
           signal perdu, pas celui d'une transition. */
        signature.dataset.etat = "entre";
        setTimeout(function () {
            signature.dataset.etat = versPoincon ? "poincon" : "mot";
        }, 90);

        prochaineSignature = t + (versPoincon ? 2000 : 4000);
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

    /* Le pointeur n'alimente plus rien : il dit seulement où regarder. La
       lumière ne laisse aucune traînée, elle n'est que la position
       courante, donc il suffit de la retenir et de demander une image. */
    addEventListener("pointermove", function (e) {
        px = e.clientX;
        py = e.clientY;
        vivant = true;
    }, { passive: true });

    /* Le mur quitte l'écran avec le curseur, sinon la dernière zone
       éclairée resterait allumée après que la souris est sortie. */
    addEventListener("pointerleave", function () {
        px = -1;
        py = -1;
        vivant = true;
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

    /* Plus de champ qui décroît à entretenir : le mur ne change que si le
       curseur bouge, si une bande décroche ou si la peau change. On repeint
       donc sur demande, pas soixante fois par seconde. */
    function battre(t) {
        if (!calme) {
            zapper(t);
            gresiller(t);
            muterNom(t);
            zapperLaMarque(t);
            zapperLaSignature(t);
        }
        if (vivant) {
            peindre();
            vivant = false;
        }
        requestAnimationFrame(battre);
    }


    /* ═══ MISE EN ROUTE ═════════════════════════════════════════════════ */

    /* La peau d'abord : `dimensionner` peint dès qu'il a fini, et sans les
       couleurs lues il peindrait avec le noir de repli. Une image de fond
       noir au chargement, invisible en BRUT, mais pas en COOL. */
    relireLaPeau();
    dimensionner();
    decouper();

    /* Les largeurs ne valent rien tant qu'Archivo n'est pas là : mesurées
       sur la fonte de repli, elles figeraient le nom à la mauvaise chasse. */
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
        .then(figerLesLargeurs);

    /* `dimensionner` a déjà peint la première image : la gravure est là dès
       le départ, elle n'a pas à être révélée, c'est l'état de repos du
       fond. En mouvement réduit on s'arrête là : pas de boucle du tout. */
    if (!doux) { requestAnimationFrame(battre); }

    /* Le voile de chargement peut partir : tout ce qui devait être mesuré
       l'a été, et la première image du fond est peinte. */
    if (window.__pageEstPrete) { window.__pageEstPrete(); }

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
       LE POSTE D'ESSAI — la section projets tout entière

       L'idée vient de la console mise en référence. Son DESSIN ne peut pas
       servir — c'est BMO, propriété Cartoon Network — mais l'idée d'un
       appareil dont on zappe l'écran n'appartient à personne.

       Le poste ne surmonte plus la grille : il la remplace. Les dix
       vignettes restent dans le HTML — c'est la source, et c'est ce que
       voit un moteur de recherche ou un navigateur sans JavaScript — mais
       elles sont masquées dès que ce fichier tourne, et leur contenu est
       DÉPLACÉ dans le poste, pas copié. Aucun nœud n'existe en double,
       donc aucun identifiant en double dans les SVG des fiches.
       ═══════════════════════════════════════════════════════════════════ */

    (function () {
        var hote = $(".poste-hote");
        if (!hote) { return; }

        var pieces = $$(".vignette").map(function (v) {
            var cadre = $(".ecran", v);
            var img = cadre ? $("img", cadre) : null;
            return {
                nom: ($("h3", v) || {}).textContent || "",
                genre: ($(".genre", v) || {}).textContent || "",
                image: img ? img.getAttribute("src") : null,
                nuit: cadre ? cadre.hasAttribute("data-nuit") : false,
                source: v
            };
        });
        if (!pieces.length) { return; }

        var bandeau = pieces.map(function (p, i) {
            return '<button type="button" class="poste-canal" data-i="' + i + '">'
                 + (i + 1 < 10 ? "0" : "") + (i + 1) + '</button>';
        }).join("");

        hote.innerHTML =
            '<div class="poste-appareil">' +
              '<div class="poste-corps">' +
                '<div class="pf pf-arriere"></div>' +
                '<div class="pf pf-droite"></div>' +
                '<div class="pf pf-gauche"></div>' +
                '<div class="pf pf-haut"></div>' +
                '<div class="pf pf-bas"></div>' +
                '<div class="pf pf-avant">' +
                  '<div class="pf-ecran">' +
                    '<img alt="">' +
                    '<div class="pf-titre"><span class="pf-genre"></span><span class="pf-nom"></span></div>' +
                    '<canvas class="pf-neige"></canvas>' +
                  '</div>' +
                  '<div class="pf-plaque">' +
                    '<svg class="poincon-plaque" viewBox="0 0 100 100" aria-hidden="true">' +
                      '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="square" ' +
                         'stroke-linejoin="round" transform="translate(9 9) scale(0.82)">' +
                        '<use href="#gf-lettres" />' +
                      '</g>' +
                    '</svg>' +
                    '<span>Poste d’essai</span>' +
                    '<span class="pf-canal"></span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="poste-commandes">' +
                /* Un chevron tracé et non ◀ : ni Anton ni JetBrains Mono ne portent
                   U+25C0, le navigateur irait le chercher dans une fonte de
                   secours et certains systèmes le rendent en emoji couleur. */
                '<button type="button" class="poste-prec" aria-label="Pièce précédente">' +
                  '<svg class="ico-nav" viewBox="0 0 12 12" aria-hidden="true">' +
                    '<path d="M8 1.5 L3.5 6 L8 10.5" />' +
                  '</svg>' +
                '</button>' +
                '<div class="poste-bandeau" role="group" aria-label="Choisir la pièce">' + bandeau + '</div>' +
                '<button type="button" class="poste-suiv" aria-label="Pièce suivante">' +
                  '<svg class="ico-nav" viewBox="0 0 12 12" aria-hidden="true">' +
                    '<path d="M4 1.5 L8.5 6 L4 10.5" />' +
                  '</svg>' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="poste-fiche" aria-live="polite"></div>';

        var corps = $(".poste-corps", hote);
        var ecran = $(".pf-ecran", hote);
        var ecranImg = $("img", ecran);
        var elGenre = $(".pf-genre", hote);
        var elNom = $(".pf-nom", hote);
        var elCanal = $(".pf-canal", hote);
        var neige = $(".pf-neige", hote);
        var fiche = $(".poste-fiche", hote);
        var canaux = $$(".poste-canal", hote);
        var nctx = neige.getContext("2d");

        var canal = -1, mainMise = false;

        /* Le contenu est DÉPLACÉ, jamais copié : la pièce qu'on quitte
           reprend ses nœuds, la pièce affichée prend les siens. Un clone
           dupliquerait les identifiants des SVG de fiches, et `url(#...)`
           irait chercher le mauvais. */
        function poser(i) {
            if (canal >= 0 && pieces[canal]) {
                var ancienne = pieces[canal].source;
                while (fiche.firstChild) { ancienne.appendChild(fiche.firstChild); }
            }
            var p = pieces[i];
            $$(":scope > *", p.source).forEach(function (n) {
                if (n.classList.contains("ecran")) { return; }
                fiche.appendChild(n);
            });

            if (p.image) {
                ecranImg.src = p.image;
                ecranImg.style.display = "block";
                /* Une capture déjà sombre n'est pas retournée : sur l'écran
                   noir du poste elle deviendrait le pavé blanc qu'on évite
                   déjà ailleurs. */
                ecranImg.style.filter = p.nuit ? "none" : "invert(1)";
                /* Le nom est sous l'écran, dans la fiche : l'écrire aussi
                   par-dessus la capture le dirait deux fois. */
                elGenre.textContent = "";
                elNom.textContent = "";
                ecran.classList.remove("pf-ecran--vide");
            } else {
                /* Les quatre pièces qu'on ouvre n'ont pas de capture :
                   l'écran affiche alors leur nom, comme un appareil qui
                   n'a rien à montrer mais sait ce qu'il tient. */
                ecranImg.removeAttribute("src");
                ecranImg.style.display = "none";
                elGenre.textContent = p.genre;
                elNom.textContent = p.nom;
                ecran.classList.add("pf-ecran--vide");
            }
            elCanal.textContent = (i + 1) + " / " + pieces.length;
            canaux.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === i)); });
            canal = i;
        }

        function dimensionnerNeige() {
            var r = neige.getBoundingClientRect();
            neige.width = Math.max(1, Math.round(r.width));
            neige.height = Math.max(1, Math.round(r.height));
        }

        /* La neige : un changement de canal, c'est du signal perdu, et le
           signal perdu a du grain. Tirée sur une grille de 6 px et non au
           pixel près — à l'écran la différence ne se voit pas, et le coût
           est divisé par trente-six. */
        var teintePhosphore = "155,255,60";
        function relireTeinte() {
            var v = getComputedStyle(racine).getPropertyValue("--phosphore").trim().split(/[\s,]+/);
            if (v.length === 3) { teintePhosphore = v.join(","); }
        }
        relireTeinte();

        function grainer(force) {
            var L = neige.width, H = neige.height, c = 6, i, j;
            nctx.clearRect(0, 0, L, H);
            nctx.fillStyle = "rgb(" + teintePhosphore + ")";
            for (j = 0; j < H; j += c) {
                for (i = 0; i < L; i += c) {
                    if (Math.random() < force) { nctx.fillRect(i, j, c - 1, c - 1); }
                }
            }
        }

        function zapper(vers) {
            var i = (vers + pieces.length) % pieces.length;
            if (i === canal) { return; }
            if (doux) { poser(i); return; }
            relireTeinte();
            dimensionnerNeige();
            var debut = performance.now(), bascule = false;
            neige.style.opacity = "1";
            fiche.style.opacity = "0";
            requestAnimationFrame(function image(t) {
                var a = (t - debut) / 280;
                if (a >= .40 && !bascule) { bascule = true; poser(i); fiche.style.opacity = "1"; }
                if (a >= 1) { neige.style.opacity = "0"; return; }
                grainer(a < .40 ? .55 : .55 * (1 - (a - .40) / .60));
                requestAnimationFrame(image);
            });
        }

        poser(0);
        racine.classList.add("poste-vivant");

        $(".poste-suiv", hote).addEventListener("click", function () { mainMise = true; zapper(canal + 1); });
        $(".poste-prec", hote).addEventListener("click", function () { mainMise = true; zapper(canal - 1); });
        canaux.forEach(function (b) {
            b.addEventListener("click", function () { mainMise = true; zapper(+b.dataset.i); });
        });

        /* Le volume suit le doigt : c'est la profondeur qui manquait, et
           elle vient d'un objet qu'on manipule, pas d'un effet posé
           derrière du texte. */
        if (!doux) {
            var zone = $(".poste-appareil", hote);
            var rx = 5, ry = -11, cx = 5, cy = -11;
            zone.addEventListener("pointermove", function (e) {
                var r = zone.getBoundingClientRect();
                cy = clamp(((e.clientX - r.left) / r.width - .5) * 26, -13, 13);
                cx = clamp(-((e.clientY - r.top) / r.height - .5) * 16, -8, 8);
            });
            zone.addEventListener("pointerleave", function () { cx = 5; cy = -11; });
            requestAnimationFrame(function suivre() {
                rx += (cx - rx) * .09;
                ry += (cy - ry) * .09;
                corps.style.setProperty("--rx", rx.toFixed(2) + "deg");
                corps.style.setProperty("--ry", ry.toFixed(2) + "deg");
                requestAnimationFrame(suivre);
            });

            /* Il zappe tout seul tant que personne n'a pris la main, et
               seulement quand il est à l'écran : un appareil qui tourne
               dans un onglet qu'on ne regarde pas ne sert à rien. Il
               s'arrête définitivement au premier geste — on ne change pas
               la page sous les yeux de quelqu'un qui lit. */
            var enVue = false;
            if ("IntersectionObserver" in window) {
                new IntersectionObserver(function (e) { enVue = e[0].isIntersecting; },
                    { threshold: .35 }).observe(hote);
            }
            setInterval(function () {
                if (enVue && !mainMise && !document.hidden) { zapper(canal + 1); }
            }, 6000);
        }
    })();


    /* ═══════════════════════════════════════════════════════════════════
       LES PUPITRES
       ═══════════════════════════════════════════════════════════════════ */

    /* ═══ LA BASCULE DE PEAU ═══════════════════════════════════════════
       Le bouton n'est pas un mode sombre : c'est une commande de profondeur
       de bits. La bascule doit donc se lire comme un signal qui se
       recompose, et non comme un fondu de couleur de fond.

       Un voile quadrillé traverse l'écran, la peau change pendant qu'il le
       couvre, puis il sort par l'autre bord. Le voile porte la couleur de
       la peau VERS laquelle on va, sinon la page clignote au milieu.
       Animé par l'API Web Animations, native : aucune bibliothèque, et un
       repli immédiat là où elle manque.                                  */

    var voilePeau = null;

    function voileDeBascule() {
        if (!voilePeau) {
            voilePeau = document.createElement("div");
            voilePeau.className = "balayage";
            voilePeau.setAttribute("aria-hidden", "true");
            document.body.appendChild(voilePeau);
        }
        return voilePeau;
    }

    function balayerVers(vers, poser) {
        /* Sans mouvement, sans API d'animation, ou si la page n'est pas
           visible : on pose la peau sans cérémonie. Une animation dans un
           onglet masqué ne se joue pas, et son `onfinish` n'arriverait
           jamais — la peau resterait bloquée derrière le voile. */
        if (doux || !document.body.animate || document.hidden) { poser(); return; }

        var v = voileDeBascule();
        v.dataset.vers = vers;

        /* Les animations précédentes sont annulées avant d'en lancer une.
           Mesuré à l'écran : elles s'empilaient à chaque bascule, quatre
           après quatre clics, et une `fill: forwards` oubliée tenait le
           voile en place par-dessus la nouvelle. */
        v.getAnimations().forEach(function (a) { a.cancel(); });

        v.animate(
            [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
            { duration: 240, easing: "cubic-bezier(.77,0,.175,1)", fill: "forwards" }
        );

        /* La peau est posée par minuterie et non par `onfinish`. Quand le
           navigateur met les animations en veille — fenêtre sans le focus,
           onglet en arrière-plan — l'animation ne tourne pas et `onfinish`
           ne vient jamais : la page restait alors sur l'ancienne peau,
           derrière un voile de la nouvelle. Une minuterie finit toujours
           par se déclencher, même ralentie. */
        setTimeout(function () {
            poser();
            v.getAnimations().forEach(function (a) { a.cancel(); });
            v.animate(
                [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 0 100%)" }],
                { duration: 320, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" }
            );
        }, 240);
    }

    $$("[data-peau]").forEach(function (b) {
        b.addEventListener("click", function () {
            if (racine.getAttribute("data-peau") === b.dataset.peau) { return; }
            balayerVers(b.dataset.peau, function () { poserLaPeau(b); });
        });
    });

    function poserLaPeau(b) {
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
    }

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

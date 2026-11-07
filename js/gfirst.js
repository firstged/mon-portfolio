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

# Gfirst — portfolio de Gédéon Mouloundi Mayagha

Développeur et ingénieur IA & Big Data, Libreville (Gabon).

**En ligne :** https://firstged.github.io/mon-portfolio/

---

## Parti pris technique

**Aucune dépendance.** Pas de framework, pas d'outil de construction, pas de
bibliothèque d'animation. Trois fichiers écrits à la main. Seule chose chargée
depuis l'extérieur : Google Fonts.

```
index.html        page autonome
css/gfirst.css    feuille unique
js/gfirst.js      interactions
marque/           le poinçon Gfirst, en SVG
```

Ce n'est pas une coquetterie. Mes visiteurs sont au Gabon, souvent au
téléphone, sur des connexions irrégulières. Une page qui s'ouvre en moins
d'une seconde vaut mieux qu'un paquet de JavaScript — et un portfolio qui
plaide pour la sobriété devrait commencer par se l'appliquer.

**Pas d'écran de chargement**, pour la même raison : un site dont l'argument
est l'ouverture immédiate ne peut pas faire attendre.

---

## Ce qui est fait maison

- **Moteur de tramage** — diffusion d'erreur Floyd–Steinberg et Atkinson,
  profondeur réglable, palette par peau. Atkinson ne rend que 6/8 de l'erreur
  à ses voisins : le huitième perdu pousse les clairs au blanc et les sombres
  au noir, d'où son contraste tranché.
- **Trois peaux commutables** — le bouton n'est pas un mode sombre, c'est une
  **commande de profondeur de bits**. BRUT (1 bit), NET (24 bits) et PAPIER
  (sérigraphie) sont le même site à trois précisions. Le sujet du site est la
  quantification : réduire le nombre de valeurs possibles et répartir l'erreur
  sur les voisins, ce que fait aussi la *quantization* sur les poids d'un
  réseau de neurones.
- **Le boîtier** — un vrai volume en six faces CSS en `preserve-3d`, sans une
  ligne de bibliothèque 3D. Son visage passe par le même moteur de tramage que
  le reste. Deux vitesses d'interpolation : la boîte traîne, les yeux
  devancent — c'est l'écart entre les deux qui fait qu'il regarde au lieu de
  viser.
- **Trois langues** — le français est le contenu réel du HTML, l'anglais et le
  japonais sont des attributs : sans JavaScript, la page reste lisible. La
  fonte japonaise n'est demandée qu'au clic sur 日本語, et **sous-découpée aux
  seuls caractères présents dans la page** (paramètre `text=` de Google
  Fonts) : quelques kilo-octets au lieu de trois cents. Un visiteur
  francophone ne la paie jamais.
- **Le poinçon Gfirst** — monogramme G + I dessiné à la main en SVG, décliné
  en cercle, sceau et marque nue. Tout en `currentColor` : un seul fichier
  sert les trois peaux. Tailles minimales mesurées à l'écran, pas estimées.

---

## Accessibilité

`prefers-reduced-motion` neutralise tout mouvement, le focus est visible
partout, le contenu reste lisible sans JavaScript, et la page ne défile jamais
horizontalement — vérifié à 384 px.

---

## Développement

```bash
python -m http.server 8787
# puis http://127.0.0.1:8787/
```

---

## Licence

Le code est à moi, les textes et la marque aussi. Reprenez les techniques,
pas l'identité.

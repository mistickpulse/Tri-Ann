# Site Tri-Ann Crêperie

Site des 3 crêperies Tri-Ann (Moussy-le-Neuf, Lagny-le-Sec, Saint-Maximin), en français et en anglais.
Il est généré avec [Eleventy](https://www.11ty.dev/) et publié automatiquement sur GitHub Pages à chaque push sur `main`.

## Lancer le site en local

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm start
```

Le site est alors visible sur http://localhost:8081 et se recharge à chaque modification.

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Un plat, un prix, un allergène | `src/_data/menu.json` |
| Les boissons | `src/_data/drinks.json` |
| Adresse, téléphone, horaires, réseaux d'un restaurant | `src/_data/restaurants.json` |
| Les spécialités du moment | `src/content/specials/*.md` (un fichier par spécialité) |
| Les événements (karaoké, concerts…) | `src/content/events/*.md` |
| Un bandeau d'info (fermeture exceptionnelle…) | `src/content/notices/*.md` |
| Les textes du site (FR et EN) | `src/_data/i18n.json` |
| Les photos | `src/assets/img/` |

Les spécialités, événements et bandeaux acceptent un champ `etablissements` : `[tous]` ou une liste parmi `moussy-le-neuf`, `lagny-le-sec`, `saint-maximin`.
Mettre `active: false` retire un élément du site sans supprimer le fichier.
Un événement peut avoir un picto avec `icon:` : `mic` (karaoké), `guitar` (concert, groupe), `drum` (batterie), `music`, `party` (fête). La liste est dans `src/_data/eventIcons.json`.

## Documents

- `docs/formulaires/` : les 4 formulaires que les directeurs envoient par mail (spécialités, événements, horaires, menus spéciaux).
- `docs/textes-a-valider.md` : liste des textes numérotés (T1, T2…) de la version de relecture.
- `docs/photos-a-fournir.md` : liste des photos et vidéos attendues, avec leur nom de fichier.

## Mise en ligne

Le workflow `.github/workflows/static.yml` construit le site (`npm run build`, dossier `_site`) puis le publie sur GitHub Pages.
Le site est servi dans le sous-dossier `/Tri-Ann/` (variable `PATH_PREFIX`). Avec un nom de domaine personnalisé, passer `PATH_PREFIX` à `/` et mettre à jour `url` dans `src/_data/site.json`.

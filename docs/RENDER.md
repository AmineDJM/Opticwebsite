# Déployer en ligne sur Render

Ce guide met la **boutique** (Application A) en ligne sur [Render](https://render.com),
avec une base **PostgreSQL** gérée, **sans aucun service externe** à configurer.
Tout est décrit par le fichier [`render.yaml`](../render.yaml) à la racine : Render
le lit et crée automatiquement le service web + la base de données.

> Résultat : une URL publique `https://optic-storefront-xxxx.onrender.com` servant
> la boutique Aura Optique, avec les produits, images de démo, quiz, visagisme et
> le paiement à la livraison. Le back-office (Application B) est optionnel — voir
> la section « Ajouter l'administration » plus bas.

---

## Ce que le Blueprint déploie

| Ressource | Rôle | Plan |
| --- | --- | --- |
| `optic-db` | Base PostgreSQL 16 gérée | Free |
| `optic-storefront` | Boutique Next.js (Application A) | Free |

Au démarrage, le service : applique les migrations (`db:migrate:deploy`), exécute
le seed **idempotent** (`db:seed`) qui crée la marque + les données de démo et
regénère les images dans `STORAGE_LOCAL_DIR`, puis sert l'app sur le `$PORT` de Render.

---

## Prérequis

1. Le code doit être **poussé sur GitHub** (il l'est déjà, sur la branche
   `claude/ecommerce-optical-generator-1nhhq9`).
2. Un compte **Render** gratuit : https://dashboard.render.com — connectez-le à
   votre compte GitHub et autorisez l'accès au dépôt `aminedjm/opticwebsite`.

---

## Déploiement en 1 clic (Blueprint)

1. Sur le dashboard Render : **New +** → **Blueprint**.
2. Choisissez le dépôt **`aminedjm/opticwebsite`**.
3. Render détecte `render.yaml`. Il déploie la branche indiquée dans le fichier
   (`claude/ecommerce-optical-generator-1nhhq9`). Si Render vous demande une
   branche, choisissez celle-ci.
4. Il vous demande de renseigner les variables marquées **sync: false** :
   - `NEXT_PUBLIC_STOREFRONT_URL` — laissez **vide** pour l'instant (vous ne
     connaissez pas encore l'URL). On la remplira après le premier déploiement.
5. Cliquez **Apply**. Render crée la base, puis construit et démarre la boutique.

Le **premier build** prend quelques minutes (installation + build Next.js). Suivez
les logs dans l'onglet **Logs** du service `optic-storefront`.

---

## Après le premier déploiement

1. Render affiche l'URL publique du service, par ex.
   `https://optic-storefront-xxxx.onrender.com`. Ouvrez-la : la boutique s'affiche.
2. **Pour un bon SEO** (URLs absolues dans le sitemap, les canoniques et
   l'Open Graph) : dans **Settings → Environment** du service, mettez
   `NEXT_PUBLIC_STOREFRONT_URL` à cette URL, puis **Manual Deploy → Deploy latest
   commit**. Cette variable est injectée au moment du build, donc un **redéploiement
   est nécessaire** pour qu'elle prenne effet. Le site fonctionne même si elle
   reste vide.

C'est tout — la boutique est en ligne.

---

## À savoir sur le plan gratuit

- **Mise en veille** : un service web gratuit s'endort après ~15 min d'inactivité.
  La requête suivante le réveille (démarrage à froid de ~30 s, car il rejoue
  migrations + seed + démarrage).
- **Images regénérées à chaque réveil** : le disque du plan gratuit est éphémère,
  donc les images de démo sont recréées au démarrage (le seed est idempotent).
  C'est normal et sans risque.
- **PostgreSQL gratuit** : la base Render gratuite **expire au bout de 30 jours**.
  Passez la base en plan payant (ou recréez-la) pour la conserver.
- Pour **éviter le seed à chaque démarrage** (démarrages plus rapides), passez à un
  plan payant et déplacez `pnpm db:migrate:deploy && pnpm db:seed` dans un
  **Pre-Deploy Command** (indisponible en gratuit) — le seed ne s'exécutera alors
  qu'à chaque déploiement, pas à chaque réveil.

---

## Ajouter l'administration (Application B)

La boutique seule suffit à « publier le site ». Pour gérer le catalogue, les
commandes, le contenu, etc., ajoutez le back-office. **Important :** le storefront
et l'admin sont deux services séparés, chacun avec son disque. Pour que les images
**téléversées depuis l'admin** apparaissent sur la boutique, les deux services
doivent partager le **même stockage objet** (S3/R2). Sans ça, seules les images de
démo (déterministes, regénérées des deux côtés) s'afficheront correctement.

### 1. Créer un bucket compatible S3 (Cloudflare R2, gratuit)

1. Compte Cloudflare → **R2** → **Create bucket** (ex. `optic-media`).
2. Rendez le bucket **public** (R2 → Settings → Public access → autorisez un
   domaine `r2.dev`, ou branchez un domaine personnalisé). Notez l'URL publique,
   ex. `https://pub-xxxx.r2.dev`.
3. **Manage R2 API Tokens** → créez un token (Object Read & Write). Notez
   `Access Key ID`, `Secret Access Key`, et l'**endpoint** S3
   (`https://<accountid>.r2.cloudflarestorage.com`).

### 2. Basculer les DEUX services sur R2

Ajoutez ces variables au service `optic-storefront` **et** à `optic-admin`
(remplacez `local` par `s3`), puis redéployez-les :

| Variable | Valeur |
| --- | --- |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `optic-media` |
| `S3_ACCESS_KEY_ID` | *(votre clé)* |
| `S3_SECRET_ACCESS_KEY` | *(votre secret)* |
| `STORAGE_PUBLIC_URL` | `https://pub-xxxx.r2.dev` |

Le seed pousse alors les images **à travers le driver** vers R2, et les deux
services lisent/écrivent le même bucket.

### 3. Ajouter le service admin dans `render.yaml`

Ajoutez ce bloc sous `services:` (l'admin **ne rejoue pas** le seed — la boutique
s'en charge — il applique seulement les migrations puis démarre) :

```yaml
  - type: web
    name: optic-admin
    runtime: node
    plan: free
    region: frankfurt
    branch: claude/ecommerce-optical-generator-1nhhq9
    autoDeploy: true
    healthCheckPath: /login
    buildCommand: npm install -g pnpm@10.33.0 && pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @optic/admin build
    startCommand: pnpm db:migrate:deploy && pnpm --filter @optic/admin exec next start -H 0.0.0.0 -p $PORT
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: COREPACK_INTEGRITY_KEYS
        value: "0"
      - key: NODE_ENV
        value: production
      - key: NEXT_TELEMETRY_DISABLED
        value: "1"
      - key: SITE_SLUG
        value: aura-optique
      - key: STORAGE_DRIVER
        value: s3            # doit correspondre au storefront
      - key: DATABASE_URL
        fromDatabase:
          name: optic-db
          property: connectionString
      - key: NEXT_PUBLIC_STOREFRONT_URL
        sync: false          # l'URL de la boutique (bouton « Voir la boutique »)
      # + S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID,
      #   S3_SECRET_ACCESS_KEY, STORAGE_PUBLIC_URL (mêmes valeurs que la boutique)
```

### 4. Se connecter à l'admin

Une fois `optic-admin` en ligne, ouvrez son URL `/login` et connectez-vous avec le
compte de démonstration créé par le seed :

- **E-mail** : `admin@aura-optique.demo`
- **Mot de passe** : `AuraOptique2026!`

> Changez ce mot de passe immédiatement après la première connexion.

---

## Dépannage

- **Seed : `new row violates row-level security policy` (42501)** → la base a été
  migrée avant le correctif RLS. La migration
  `20260822230000_rls_trusted_owner_no_force` retire le `FORCE` appliqué par erreur
  (le rôle propriétaire — le backend de confiance — redevient exempté ; la RLS
  continue de protéger intégralement tout rôle applicatif restreint). Comme
  `db:migrate:deploy` tourne au démarrage, **Manual Deploy → Deploy latest commit**
  suffit. Le seed est par ailleurs non bloquant : s'il échoue, le serveur démarre
  quand même et l'erreur reste visible dans les logs.
- **Build : `corepack … Cannot find matching keyid`** → Render lance corepack
  AVANT la commande de build (déclenché par le champ `packageManager` de
  `package.json`), et le corepack des vieux runtimes Node embarque des clés de
  signature npm périmées. Deux verrous dans `render.yaml` : `NODE_VERSION=22`
  et `COREPACK_INTEGRITY_KEYS=0` (désactive la vérification fautive, quelle que
  soit la version de corepack). Si l'erreur apparaît sur un service créé avant
  ces correctifs : ajoutez ces deux variables dans **Settings → Environment**,
  puis **Manual Deploy → Clear build cache & deploy** (vider le cache est
  indispensable).
- **Le build échoue sur le lockfile** → vérifiez que `pnpm-lock.yaml` est bien
  commité et à jour (`pnpm install` en local, puis commit).
- **`No website resolved` au démarrage** → `SITE_SLUG` doit valoir `aura-optique`
  (la valeur du seed).
- **Images cassées sur la boutique** → en stockage `local`, c'est attendu après une
  mise en veille tant que le seed n'a pas fini de se rejouer ; patientez le temps du
  démarrage à froid. En multi-services, passez à R2 (section ci-dessus).
- **Images téléversées depuis l'admin absentes de la boutique** → les deux services
  ne partagent pas encore le stockage : basculez-les tous les deux sur `s3`/R2.
- **La base a disparu après un mois** → PostgreSQL gratuit expire à 30 jours ;
  passez-la en payant pour la conserver.

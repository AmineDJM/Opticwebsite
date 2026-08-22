# Déployer en ligne sur Render

Ce guide met **toute la plateforme** en ligne sur [Render](https://render.com) —
boutique, back-office et générateur — avec une base **PostgreSQL** gérée, **sans
aucun service externe** à configurer. Tout est décrit par le fichier
[`render.yaml`](../render.yaml) à la racine : Render le lit et crée automatiquement
les services web + la base de données.

> ⚠️ **Dès que l'admin et le générateur sont en ligne, changez le mot de passe du
> compte de démonstration** (il figure dans le code du seed, donc il est public).
> Connexion → Utilisateurs → modifier le compte, ou créez votre propre compte
> propriétaire puis rétrogradez/désactivez le compte démo.

---

## Ce que le Blueprint déploie

| Ressource | Rôle | Plan |
| --- | --- | --- |
| `optic-db` | Base PostgreSQL 16 gérée | Free |
| `optic-storefront` | Boutique publique (Application A) | Free |
| `optic-admin` | Back-office de la marque (Application B) | Free |
| `optic-generator` | Générateur de sites / super-admin (Application C) | Free |

Au démarrage, chaque service applique les migrations (`db:migrate:deploy`) — étape
bloquante — puis la boutique, l'admin et le générateur exécutent le seed
**idempotent** (`db:seed`, non bloquant : le serveur démarre même s'il échoue) qui
crée la marque + les données de démo et regénère les images dans
`STORAGE_LOCAL_DIR`, avant de servir sur le `$PORT` de Render (bind `0.0.0.0`).
Le seed tourne sur chaque service car en stockage `local` chaque disque est privé —
c'est ce qui garantit les mêmes images de démo partout.

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
4. Il vous demande de renseigner les variables marquées **sync: false**
   (`NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_ADMIN_URL`) — laissez-les **vides**
   pour l'instant (les URL n'existent pas encore). On les remplira après le premier
   déploiement.
5. Cliquez **Apply**. Render crée la base, puis construit et démarre les trois
   services.

> **Blueprint déjà créé avant l'ajout de l'admin/générateur ?** Pousser le nouveau
> `render.yaml` déclenche une synchronisation : ouvrez l'onglet **Blueprints** du
> dashboard, l'instance liste les nouveaux services à approuver (`optic-admin`,
> `optic-generator`). Approuvez, laissez les variables `sync: false` vides, et
> Render les crée sans toucher aux services existants.

Le **premier build** prend quelques minutes par service (installation + build
Next.js). Suivez les logs dans l'onglet **Logs** de chaque service.

---

## Après le premier déploiement

1. Render affiche l'URL publique de chaque service :
   - boutique → `https://optic-storefront-xxxx.onrender.com`
   - admin → `https://optic-admin-xxxx.onrender.com/login`
   - générateur → `https://optic-generator-xxxx.onrender.com/login`
2. **Changez le mot de passe du compte démo** (voir l'avertissement en tête).
3. Renseignez les URLs entre services (elles sont injectées **au build**, donc un
   redéploiement du service modifié est nécessaire) :
   - sur `optic-storefront` : `NEXT_PUBLIC_STOREFRONT_URL` = l'URL de la boutique
     (SEO : sitemap, canoniques, Open Graph) ;
   - sur `optic-admin` : `NEXT_PUBLIC_STOREFRONT_URL` = l'URL de la boutique
     (bouton « Voir la boutique ») ;
   - sur `optic-generator` : les deux URLs (liens vers la boutique et l'admin).
   Puis **Manual Deploy → Deploy latest commit** sur chaque service modifié. Tout
   fonctionne même si ces variables restent vides — seuls les liens/SEO en profitent.

C'est tout — la plateforme est en ligne.

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

## Accès admin & générateur

Connectez-vous sur `optic-admin` (`/login`) et `optic-generator` (`/login`) avec le
compte de démonstration créé par le seed :

- **E-mail** : `admin@aura-optique.demo`
- **Mot de passe** : `AuraOptique2026!`

> Ce compte est un **identifiant de démo public** (il est dans le code du seed).
> Changez son mot de passe dès la première connexion.

---

## Partager les images téléversées (Cloudflare R2, optionnel)

Les trois services tournent en stockage `local` : chacun a son disque (éphémère sur
le plan gratuit). Les **images de démo** sont identiques partout car chaque service
les regénère au boot via le seed. En revanche, une image **téléversée depuis
l'admin** n'atterrit que sur le disque de l'admin : la boutique ne la verra pas, et
elle disparaît à la mise en veille. Dès que vous chargez vos propres photos,
basculez tous les services sur un stockage objet partagé — R2 est gratuit.

### 1. Créer un bucket compatible S3 (Cloudflare R2)

1. Compte Cloudflare → **R2** → **Create bucket** (ex. `optic-media`).
2. Rendez le bucket **public** (R2 → Settings → Public access → autorisez un
   domaine `r2.dev`, ou branchez un domaine personnalisé). Notez l'URL publique,
   ex. `https://pub-xxxx.r2.dev`.
3. **Manage R2 API Tokens** → créez un token (Object Read & Write). Notez
   `Access Key ID`, `Secret Access Key`, et l'**endpoint** S3
   (`https://<accountid>.r2.cloudflarestorage.com`).

### 2. Basculer les TROIS services sur R2

Sur `optic-storefront`, `optic-admin` **et** `optic-generator` : passez
`STORAGE_DRIVER` à `s3`, ajoutez les variables ci-dessous, puis redéployez.

| Variable | Valeur |
| --- | --- |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `optic-media` |
| `S3_ACCESS_KEY_ID` | *(votre clé)* |
| `S3_SECRET_ACCESS_KEY` | *(votre secret)* |
| `STORAGE_PUBLIC_URL` | `https://pub-xxxx.r2.dev` |

Le seed pousse alors les images **à travers le driver** vers R2, et tous les
services lisent/écrivent le même bucket — uploads durables et visibles partout.

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

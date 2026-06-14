# SpinShare pour VS Code

Gagnez pendant que votre IA travaille. SpinShare affiche des publicités discrètes et contextuelles pendant les temps d'attente de génération IA dans VS Code, Cursor et Trae.

## Fonctionnalités

- **Monétisation des temps d'attente** — Les annonces apparaissent dans une notification de progression pendant que l'agent IA réfléchit.
- **Connexion via navigateur** — Flux d'appareil unique ; votre jeton est stocké de manière sécurisée dans l'éditeur.
- **Liens cliquables** — Ouvrez les liens des annonceurs directement depuis la notification.
- **Éditeurs compatibles** — Basé sur les API stables de VS Code ; fonctionne dans VS Code, Cursor et Trae.

## Démarrage

1. Installez l'extension (depuis un VSIX local ou le Marketplace une fois publiée).
2. Au premier lancement, vous serez invité à **vous connecter** — approuvez l'appareil dans votre navigateur.
3. Lors d'un temps d'attente de génération IA, SpinShare peut afficher un message sponsorisé en bas à droite.

### Commandes

| Commande | Description |
|----------|-------------|
| `SpinShare: Sign In` | Démarrer l'autorisation d'appareil via le navigateur |
| `SpinShare: Sign Out` | Supprimer le jeton enregistré |
| `SpinShare: Start Generation (show ad)` | Déclencher manuellement l'annonce (test) |
| `SpinShare: Complete Generation (dismiss ad)` | Fermer la notification d'annonce active |

## Configuration

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `spinshare.baseUrl` | `https://spinshare.dev` | URL de base de l'application web SpinShare |

## Confidentialité

L'authentification utilise un flux de code d'appareil. Les impressions ne sont signalées que lorsqu'une annonce est réellement affichée. Voir [spinshare.dev/privacy](https://spinshare.dev/privacy).

## Produits associés

SpinShare propose aussi un **wrapper CLI** (`@spinshare/cli`) pour les outils IA en terminal — produit distinct, non inclus dans cette extension.

## Support

Questions ou retours : [support@spinshare.dev](mailto:support@spinshare.dev)

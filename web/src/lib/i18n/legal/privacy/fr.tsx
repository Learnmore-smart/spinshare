import { LegalSection, codeClass } from "../shared";

export function PrivacyBodyFr() {
  return (
    <>
      <LegalSection title="Aperçu">
        <p>
          spinshare-web-vert.vercel.app (« nous ») exploite l&apos;extension VS Code SpinShare, le wrapper CLI{" "}
          <code className={codeClass}>spinshare</code> et le site spinshare-web-vert.vercel.app. SpinShare est une
          place de marché publicitaire orientée développeurs qui affiche de courtes annonces textuelles
          à la place des spinners de chargement et indicateurs de progression pendant que les agents
          de codage IA génèrent leur sortie. Cette politique décrit les informations que nous
          collectons, comment nous les utilisons et les choix dont vous disposez.
        </p>
      </LegalSection>

      <LegalSection title="Informations que nous collectons">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Informations de compte.</strong> Lorsque vous vous
            connectez avec Google ou GitHub, nous recevons votre adresse e-mail, votre nom
            d&apos;affichage (le cas échéant) et un identifiant stable côté fournisseur (comme la
            revendication OAuth <code className={codeClass}>sub</code>) afin d&apos;identifier votre
            compte, créditer vos gains et prévenir les comptes en double.
          </li>
          <li>
            <strong className="text-slate-900">Identifiant d&apos;appareil.</strong> Un identifiant
            client par installation est généré localement pour associer les événements
            d&apos;impression à votre compte. Il est pseudonyme : il ne vous identifie pas seul, mais
            pour les utilisateurs connectés il est lié à votre compte pour créditer les gains.
          </li>
          <li>
            <strong className="text-slate-900">Événements d&apos;interaction publicitaire.</strong>{" "}
            Pour chaque annonce servie, nous enregistrons la télémétrie : type d&apos;événement
            (impression rendue, visible, ticks de durée de vue, clics), identifiants
            annonce/campagne/créatif, surface d&apos;affichage (spinner, ligne de statut,
            notification de progression ou overlay), métriques de visibilité à l&apos;écran, ID par
            événement pour dédupliquer, horodatages, et versions client et application hôte (par ex.
            version de l&apos;extension SpinShare et VS Code ou Claude Code). En mode aperçu non
            connecté (« démo »), cette télémétrie n&apos;est attribuée à aucun compte.
          </li>
          <li>
            <strong className="text-slate-900">Adresse IP.</strong> Nous traitons votre adresse IP de
            manière transitoire pour la limitation de débit, la détection d&apos;abus et la prévention
            de la fraude.
          </li>
          <li>
            <strong className="text-slate-900">Informations de paiement.</strong> Si vous achetez de
            l&apos;inventaire publicitaire, le paiement est traité par Stripe. Nous ne stockons pas
            les détails complets de votre carte.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Informations que nous ne collectons pas">
        <ul className="list-disc space-y-2 pl-6">
          <li>Votre code source, contenu de fichiers, noms de fichiers ou structure de projet.</li>
          <li>Vos prompts, réponses IA, historique de chat ou invocations d&apos;outils.</li>
          <li>
            Votre activité de navigation en dehors de notre extension, wrapper CLI et site web.
          </li>
          <li>
            La télémétrie de l&apos;extension et du wrapper CLI est structurellement limitée aux
            métriques d&apos;événements publicitaires décrites ci-dessus &mdash; les données
            transmises ne contiennent aucun champ capable de porter votre code, vos prompts ou vos
            interactions IA.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Traitement local (jamais transmis)">
        <p>
          Pour détecter quand un agent de codage IA est actif et quelle session est à l&apos;écran,
          l&apos;extension SpinShare lit localement les fichiers de transcription de session Claude
          Code (
          <code className={codeClass}>~/.claude/projects/**/*.jsonl</code>). Elle n&apos;en extrait
          qu&apos;un petit ensemble de signaux &mdash; par exemple le tag d&apos;entrée de session
          (panneau VS Code vs terminal), le nom de la dernière invocation d&apos;outil, et si le tour
          en cours est terminé. Cela sert uniquement à temporiser l&apos;affichage publicitaire et à
          arrêter le compteur de facturation quand l&apos;activité cesse.
        </p>
        <p>
          Ce traitement se fait entièrement sur votre appareil. Aucun contenu de transcription &mdash;
          prompt, réponse, code ou nom d&apos;outil &mdash; n&apos;est transmis à nos serveurs, et
          notre schéma de télémétrie ne contient aucun champ capable de le porter. Le code source de
          l&apos;extension est open source et publiquement accessible pour vérification.
        </p>
      </LegalSection>

      <LegalSection title="Analytique web et cookies">
        <p>
          Le site spinshare-web-vert.vercel.app (pas l&apos;extension ni le wrapper CLI) peut utiliser un service
          d&apos;analytique d&apos;usage enregistrant les interactions (clics, défilement,
          navigation) et des cookies pour distinguer les visiteurs. Nous l&apos;utilisons pour
          comprendre et améliorer le site. Voir la déclaration de confidentialité du fournisseur
          tiers. Nos pages peuvent aussi charger des polices depuis un service tiers, qui reçoit votre
          IP lors du téléchargement des fichiers de police.
        </p>
      </LegalSection>

      <LegalSection title="Comment nous utilisons les informations">
        <ul className="list-disc space-y-2 pl-6">
          <li>Créditer les gains sur votre compte selon impressions et clics.</li>
          <li>Servir des annonces pertinentes dans le slot spinner de l&apos;extension.</li>
          <li>Améliorer le service et détecter fraude ou abus.</li>
          <li>Communiquer des mises à jour importantes de compte ou de service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Données utilisateur Google et GitHub">
        <p>
          Notre utilisation des informations reçues des API Google respecte la Google API Services User
          Data Policy, y compris les exigences d&apos;usage limité. Notre utilisation des
          informations GitHub respecte les GitHub Developer Terms et la GitHub Privacy Statement. En
          particulier, nous :
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            N&apos;utilisons l&apos;e-mail, le nom d&apos;affichage et l&apos;identifiant stable du
            fournisseur que pour identifier le compte et créditer les gains.
          </li>
          <li>
            N&apos;utilisons pas les données fournisseur pour publicité, reciblage ou profilage.
          </li>
          <li>Ne vendons, ne louons ni ne partageons ces données avec des courtiers de données.</li>
          <li>N&apos;utilisons pas ces données pour entraîner des modèles IA ou ML.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Partage des données">
        <p>Nous ne vendons pas vos informations personnelles. Nous pouvons partager des données avec :</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Stripe.</strong> Pour le traitement des paiements et,
            lorsque les retraits s&apos;ouvrent, les retraits et la collecte d&apos;informations
            fiscales associées.
          </li>
          <li>
            <strong className="text-slate-900">Google Cloud / Firebase.</strong> Pour
            l&apos;hébergement, l&apos;authentification et le stockage.
          </li>
          <li>
            <strong className="text-slate-900">Twilio SendGrid</strong> (ou équivalent). Pour les
            e-mails transactionnels (liens de connexion et avis de compte).
          </li>
          <li>
            <strong className="text-slate-900">Fournisseur d&apos;analytique.</strong> Pour
            l&apos;analytique web décrite ci-dessus.
          </li>
          <li>
            <strong className="text-slate-900">Annonceurs.</strong> Uniquement des comptages
            agrégés et anonymisés d&apos;impressions et de clics.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Conservation et suppression">
        <p>
          Les données de compte sont conservées tant que le compte est actif, et jusqu&apos;à 7 ans
          après résiliation ou dernière activité si nécessaire pour la fraude, la réconciliation
          financière et la conformité légale. Vous pouvez demander la suppression à
          support@learnx.pro ; après suppression, les identifiants personnels sont retirés ou
          anonymisés sous 30 jours, tandis que les données agrégées/anonymisées et registres
          financiers légalement requis peuvent être conservés.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits à la vie privée">
        <p>
          Selon votre lieu de résidence (y compris la Californie, la Virginie, le Colorado, le
          Connecticut, l&apos;Utah et d&apos;autres États américains, ainsi que l&apos;UE/Royaume-Uni
          sous le RGPD et le Canada sous PIPEDA), vous pouvez avoir le droit d&apos;accéder, corriger
          ou supprimer vos informations personnelles, et de refuser toute vente ou partage (que nous ne
          faisons pas). Pour exercer ces droits, écrivez à support@learnx.pro.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Nous utilisons des mesures standard incluant connexions chiffrées (TLS), jetons
          d&apos;authentification sécurisés et contrôles d&apos;accès. Aucune méthode de transmission
          ou stockage électronique n&apos;est totalement sûre ; nous ne garantissons pas une sécurité
          absolue.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Nous pouvons mettre à jour cette politique. Les changements importants seront communiqués via
          l&apos;extension ou par e-mail.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Des questions sur cette politique ? Écrivez à{" "}
          <a
            href="mailto:support@learnx.pro"
            className="font-bold text-emerald-700 underline-offset-2 hover:underline"
          >
            support@learnx.pro
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}

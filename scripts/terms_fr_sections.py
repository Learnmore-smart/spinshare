"""Auto-generated French LegalSection blocks for terms/fr.tsx."""

from __future__ import annotations

SECTIONS_FR: dict[int, str] = {
    1: (
        """\
<LegalSection id={1} title={titles[1] ?? ""}>
            <p>
              Les présentes Conditions d&apos;utilisation (l&apos;« Accord ») constituent un accord juridiquement contraignant entre vous (« vous », « votre » ou « Utilisateur ») et spinshare-web-vert.vercel.app (« SpinShare », « nous » ou « notre »), régissant votre accès au Service SpinShare, à l&apos;extension Visual Studio Code (VS Code), au plugin IDE, au wrapper en ligne de commande (CLI) et aux services connexes (collectivement, le « Service »).
            </p>
            <p>
              EN INSTALLANT SPINSHARE, EN CRÉANT UN COMPTE, EN ACCÉDANT À NOTRE SITE WEB OU EN UTILISANT LE SERVICE DE QUELQUE MANIÈRE QUE CE SOIT, VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ D&apos;ÊTRE LIÉ PAR LE PRÉSENT ACCORD. SI VOUS N&apos;ACCEPTEZ PAS L&apos;ENSEMBLE DES TERMES ET CONDITIONS, VOUS DEVEZ IMMÉDIATEMENT CESSER D&apos;UTILISER LE SERVICE ET DÉSINSTALLER L&apos;EXTENSION ET LE WRAPPER CLI.
            </p>
            <p>
              Le présent Accord s&apos;applique à tous les utilisateurs du Service, y compris : (i) les utilisateurs finaux qui utilisent SpinShare pour percevoir une rémunération en affichant des publicités pendant les états d&apos;attente IA (« Utilisateurs rémunérés ») ; (ii) les annonceurs qui achètent des inventaires publicitaires via notre plateforme (« Annonceurs ») ; et (iii) tous les autres visiteurs de notre site web ou utilisateurs de nos services.
            </p>
            <p>
              Si vous utilisez le Service au nom d&apos;une organisation, d&apos;une entité ou d&apos;un employeur, vous déclarez et garantissez disposer du pouvoir de lier cette organisation au présent Accord, et les références à « vous » incluront à la fois la personne physique et l&apos;organisation.
            </p>
          </LegalSection>
        """),
    2: (
        """\
<LegalSection id={2} title={titles[2] ?? ""}>
            <p>Les termes suivants ont la signification indiquée ci-dessous :</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-slate-900">« Contenu publicitaire »</strong> ou{" "}
                <strong className="text-slate-900">« Supports publicitaires »</strong> désigne tout texte, image, graphique, lien, code ou autre matériel soumis par un Annonceur pour affichage via le Service.
              </li>
              <li>
                <strong className="text-slate-900">« État d&apos;attente IA »</strong> ou{" "}
                <strong className="text-slate-900">« État d&apos;attente »</strong> désigne la période pendant laquelle un assistant de programmation IA (tel que Claude Code d&apos;Anthropic ou des produits similaires) traite, raisonne ou génère une réponse, pendant laquelle le client SpinShare affiche du contenu sponsorisé à la place du spinner de chargement ou de l&apos;indicateur de progression.
              </li>
              <li>
                <strong className="text-slate-900">« Enchères »</strong> désigne le système d&apos;enchères en temps réel par lequel les Annonceurs se disputent la priorité de placement dans la file d&apos;affichage.
              </li>
              <li>
                <strong className="text-slate-900">« Enchère »</strong> désigne le coût maximal pour mille impressions (CPM) qu&apos;un Annonceur propose de payer pour sa campagne.
              </li>
              <li>
                <strong className="text-slate-900">« Campagne »</strong> désigne un enregistrement créé par un Annonceur contenant le texte publicitaire, une enchère CPM maximale et un budget restant.
              </li>
              <li>
                <strong className="text-slate-900">« CPM »</strong> désigne le coût pour mille impressions (Cost Per Mille) &mdash; le prix qu&apos;un Annonceur accepte de payer pour 1 000 impressions, exprimé en dollars américains.
              </li>
              <li>
                <strong className="text-slate-900">« Clic »</strong> désigne l&apos;interaction affirmative d&apos;un utilisateur avec une publicité qui déclenche une navigation vers l&apos;URL de destination désignée par l&apos;Annonceur.
              </li>
              <li>
                <strong className="text-slate-900">« Claude Code »</strong> désigne le produit assistant de programmation IA développé et exploité par Anthropic, PBC, qu&apos;il soit accessible via l&apos;extension Visual Studio Code, le CLI terminal ou d&apos;autres interfaces.
              </li>
              <li>
                <strong className="text-slate-900">« Revenus »</strong> ou{" "}
                <strong className="text-slate-900">« Revenus utilisateur »</strong> désigne la rémunération accumulée par un Utilisateur rémunéré sur la base d&apos;impressions et de clics éligibles, calculée comme la part de l&apos;utilisateur des revenus générés par les publicités affichées pendant ses états d&apos;attente IA.
              </li>
              <li>
                <strong className="text-slate-900">« Extension »</strong> désigne l&apos;extension SpinShare Visual Studio Code (VS Code), le plugin IDE ou tout autre plugin d&apos;éditeur installé par un utilisateur pour activer le Service.
              </li>
              <li>
                <strong className="text-slate-900">« Wrapper CLI »</strong> désigne le package NPM{" "}
                <code className={codeClass}>spinshare</code> (ou successeur) qui lance un CLI cible en tant que processus enfant, intercepte la sortie du spinner et injecte des publicités sur une ligne de mise à jour unique.
              </li>
              <li>
                <strong className="text-slate-900">« Impression »</strong> désigne une instance unique d&apos;affichage d&apos;une publicité au sein d&apos;un état d&apos;attente IA.
              </li>
              <li>
                <strong className="text-slate-900">« Grand livre »</strong> désigne l&apos;enregistrement comptable interne maintenu par SpinShare, suivant les impressions, clics, revenus et paiements attribuables à chaque compte utilisateur ou annonceur.
              </li>
              <li>
                <strong className="text-slate-900">« Seuil de paiement »</strong> désigne le solde minimum requis sur le compte d&apos;un utilisateur avant qu&apos;un paiement ne soit initié, tel que déterminé par SpinShare à sa seule discrétion.
              </li>
              <li>
                <strong className="text-slate-900">« Plateforme »</strong> désigne l&apos;IDE, l&apos;éditeur de code ou l&apos;environnement terminal sous-jacent (tel que Visual Studio Code) dans lequel l&apos;Extension ou le Wrapper CLI fonctionne.
              </li>
              <li>
                <strong className="text-slate-900">« Partage des revenus »</strong> désigne la répartition en pourcentage des revenus publicitaires nets entre SpinShare et les Utilisateurs rémunérés, actuellement de soixante pour cent (60 %) pour l&apos;Utilisateur rémunéré et quarante pour cent (40 %) retenus par SpinShare, mais pouvant être modifiée comme décrit à la Section 6.4.
              </li>
              <li>
                <strong className="text-slate-900">« Limite de vélocité »</strong> désigne le plafond de débit de trente (30) impressions par minute et par développeur utilisé pour l&apos;application anti-fraude.
              </li>
            </ul>
          </LegalSection>
        """),
    3: (
        """\
<LegalSection id={3} title={titles[3] ?? ""}>
            <LegalSubsection title="3.1 Exigences générales">
              Vous devez avoir au moins dix-huit (18) ans et être capable de conclure un contrat contraignant pour utiliser le Service. En utilisant le Service, vous déclarez et garantissez remplir ces conditions et que toutes les informations que vous fournissez sont exactes, complètes et à jour.
            </LegalSubsection>
            <LegalSubsection title="3.2 Autorisation de l&apos;employeur">
              Si vous installez ou utilisez le Service sur un appareil appartenant à ou contrôlé par un employeur, une organisation ou un tiers, vous déclarez et garantissez que : (i) vous avez obtenu toutes les autorisations nécessaires de cette entité pour installer un logiciel qui modifie le comportement de l&apos;IDE ou du terminal et affiche des publicités tierces ; et (ii) votre utilisation du Service ne viole aucun contrat de travail, politique d&apos;entreprise, code de conduite ou loi applicable.
            </LegalSubsection>
            <LegalSubsection title="3.3 Restrictions géographiques">
              Le Service n&apos;est disponible que pour les utilisateurs situés dans des juridictions où le Service et son exploitation sont légaux. Nous nous réservons le droit de restreindre l&apos;accès au Service depuis toute juridiction à tout moment. Vous êtes seul responsable du respect de toutes les lois, règles et réglementations locales applicables.
            </LegalSubsection>
            <LegalSubsection title="3.4 Limitations de compte">
              Chaque personne physique ne peut maintenir qu&apos;un (1) seul compte Utilisateur rémunéré. La création de plusieurs comptes par une même personne, l&apos;utilisation de systèmes automatisés pour créer des comptes, ou la coordination avec d&apos;autres personnes pour contourner les limitations de compte constituent une violation substantielle du présent Accord.
            </LegalSubsection>
          </LegalSection>
        """),
    4: (
        """\
<LegalSection id={4} title={titles[4] ?? ""}>
            <LegalSubsection title="4.1 Aperçu">
              SpinShare exploite une place de marché publicitaire qui affiche du contenu sponsorisé à la place des spinners de chargement, du texte de la ligne d&apos;état et des indicateurs de progression qui apparaissent pendant les états d&apos;attente IA dans les environnements de développement pris en charge. Le Service remplace, corrige ou superpose l&apos;interface utilisateur de progression par défaut des agents de codage IA et CLI pris en charge avec des messages sponsorisés pendant les intervalles de traitement.
            </LegalSubsection>
            <LegalSubsection title="4.2 Pour les Utilisateurs rémunérés">
              Après avoir installé l&apos;Extension ou le Wrapper CLI et complété l&apos;enregistrement du compte, les Utilisateurs rémunérés verront du contenu sponsorisé remplacer ou compléter le spinner ou le texte de progression par défaut pendant les états d&apos;attente de Claude Code, Codex et d&apos;autres assistants IA pris en charge. Les Utilisateurs rémunérés accumulent des crédits sur la base d&apos;impressions et de clics éligibles, avec environ soixante pour cent (60 %) des revenus publicitaires nets attribuables crédités sur leur compte par défaut, sous réserve de la Limite de vélocité, du Partage des revenus et des autres conditions énoncées aux présentes. Les revenus sont versés mensuellement, sous réserve du Seuil de paiement et des autres conditions énoncées aux présentes.
            </LegalSubsection>
            <LegalSubsection title="4.3 Pour les Annonceurs">
              Les Annonceurs créent des Campagnes qui s&apos;enchérissent mutuellement en temps réel pour la priorité de placement. La Campagne avec l&apos;enchère CPM maximale active la plus élevée remporte l&apos;emplacement ; en cas d&apos;égalité, la priorité est accordée à la date de création la plus ancienne, puis à l&apos;identifiant de campagne le plus bas. Tous les montants sont non remboursables et sont considérés comme dépensés dès que l&apos;impression ou le clic correspondant est diffusé. Les tarifs et paramètres actuels sont affichés dans le tableau de bord annonceur au moment de l&apos;enchère, et SpinShare peut ajuster cette méthodologie de temps à autre.
            </LegalSubsection>
            <LegalSubsection title="4.4 Aucune garantie de disponibilité">
              Nous ne garantissons pas que le Service sera disponible en permanence, que les impressions seront diffusées en continu, ou qu&apos;un niveau minimum de revenus sera atteint. Le Service dépend de l&apos;utilisation et de la disponibilité de plateformes tierces (y compris Visual Studio Code, Claude Code et les services d&apos;Anthropic) qui échappent à notre contrôle.
            </LegalSubsection>
          </LegalSection>
        """),
    5: (
        """\
<LegalSection id={5} title={titles[5] ?? ""}>
            <LegalSubsection title="5.1 Création de compte">
              Pour participer au Programme de revenus ou au Programme publicitaire, vous devez créer un compte en vous connectant via un fournisseur d&apos;identité pris en charge (actuellement Google ou GitHub). Vous acceptez de maintenir l&apos;exactitude des informations de profil que vous fournissez et de les mettre à jour rapidement en cas de changement. Vous êtes responsable de la confidentialité de vos identifiants de compte et de toutes les activités effectuées sous votre compte.
            </LegalSubsection>
            <LegalSubsection title="5.2 Sécurité du compte">
              Vous acceptez de : (i) maintenir la sécurité de votre compte fournisseur d&apos;identité avec un mot de passe fort et unique et, lorsque disponible, une authentification multifacteur ; (ii) ne pas partager vos identifiants de compte avec un tiers ; et (iii) nous notifier immédiatement de toute utilisation non autorisée de votre compte ou de toute autre faille de sécurité. Nous ne serons pas responsables de toute perte ou dommage résultant de votre non-respect de ces obligations.
            </LegalSubsection>
            <LegalSubsection title="5.3 Propriété du compte">
              Les comptes sont personnels à l&apos;utilisateur enregistré et ne peuvent être transférés, vendus ou cédés à un tiers sans notre consentement écrit préalable. Toute tentative de transfert de compte sans autorisation entraînera la résiliation immédiate et la confiscation de tous les revenus impayés.
            </LegalSubsection>
            <LegalSubsection title="5.4 Connaissance de votre entreprise (Annonceurs)">
              Les Annonceurs peuvent être tenus de fournir des informations de vérification supplémentaires, notamment : documents d&apos;immatriculation commerciale (le cas échéant), numéros d&apos;identification fiscale, vérification du mode de paiement et identification du représentant. Le défaut de fournir la documentation demandée peut entraîner la suspension du compte ou le rejet des campagnes publicitaires.
            </LegalSubsection>
          </LegalSection>
        """),
    6: (
        """\
<LegalSection id={6} title={titles[6] ?? ""}>
            <LegalSubsection title="6.1 Accumulation des revenus">
              Les Utilisateurs rémunérés accumulent des crédits sur la base de : (i) impressions éligibles de publicités affichées pendant les états d&apos;attente IA sur leurs appareils authentifiés ; et (ii) clics éligibles sur ces publicités. Le Partage des revenus actuel est de soixante pour cent (60 %) des revenus par impression (c&apos;est-à-dire le CPM de la Campagne divisé par 1 000) attribuables aux impressions et clics d&apos;un utilisateur, sous réserve de la Limite de vélocité, du Partage des revenus et des autres termes des présentes.
            </LegalSubsection>
            <LegalSubsection title="6.2 Impressions éligibles">
              Une impression est éligible aux revenus uniquement si : (i) la publicité est affichée pendant un état d&apos;attente IA actif sur un appareil authentifié ; (ii) l&apos;Extension ou le Wrapper CLI est correctement installé, authentifié et connecté à nos serveurs ; (iii) l&apos;impression est générée par une requête de codage IA authentique et initiée par un humain (non automatisée, scriptée ou artificiellement générée) ; (iv) l&apos;utilisateur n&apos;a pas dépassé la Limite de vélocité ou tout autre plafond applicable ; et (v) l&apos;impression n&apos;est pas exclue par nos systèmes de détection de fraude. Un refus de réclamation éligible peut faire l&apos;objet d&apos;un recours ou d&apos;un litige conformément aux exigences de la Section 17 du présent Accord.
            </LegalSubsection>
            <LegalSubsection title="6.3 Plafonds d&apos;utilisation">
              SpinShare se réserve le droit, à sa seule discrétion et sans préavis, d&apos;établir, modifier ou appliquer des plafonds quotidiens, hebdomadaires, mensuels, par minute ou autres périodiques concernant : (a) le nombre d&apos;impressions éligibles par utilisateur ; (b) le nombre de clics éligibles par utilisateur ; (c) le montant des revenus pouvant être accumulés sur une période donnée ; et (d) le nombre d&apos;états d&apos;attente IA générant des impressions facturables. Le plafond actuel par minute est la Limite de vélocité définie à la Section 2. Toute activité dépassant un plafond applicable n&apos;est pas facturable et ne génère pas de revenus. Nous pouvons appliquer des plafonds globalement, par région, par niveau de compte ou individuellement.
            </LegalSubsection>
            <LegalSubsection title="6.4 Ajustements du partage des revenus">
              SpinShare se réserve le droit d&apos;ajuster le Partage des revenus, les tarifs par impression, les tarifs par clic, les prix planchers d&apos;enchères et les calendriers de paiement à tout moment moyennant un préavis raisonnable (qui peut inclure un avis publié sur notre site web ou via l&apos;Extension). Les modifications des conditions de revenus s&apos;appliqueront de manière prospective et n&apos;affecteront pas les revenus déjà accumulés au moment du changement.
            </LegalSubsection>
            <LegalSubsection title="6.5 Mécanismes de paiement">
              Les revenus accumulés restent crédités sur le solde de votre compte jusqu&apos;à leur versement. Une fois les paiements activés pour votre compte, les revenus sont versés mensuellement (vers le premier de chaque mois), sous réserve que le solde du compte dépasse le Seuil de paiement alors en vigueur (actuellement 10,00 USD, sous réserve de modification). Les paiements sont effectués via Stripe Connect ou d&apos;autres modes de paiement choisis par SpinShare. Les utilisateurs sont responsables de fournir des informations de paiement exactes et de toutes les taxes, frais et obligations réglementaires associés à la réception des paiements. Pour recevoir des paiements, les Utilisateurs rémunérés doivent compléter l&apos;intégration Stripe Connect et fournir toute documentation fiscale (telle que le formulaire IRS W-9 ou W-8) demandée par le processeur.
            </LegalSubsection>
            <LegalSubsection title="6.6 Retenues et corrections de paiement">
              Tous les soldes de revenus sont des estimations sujettes à correction, rapprochement et audit. SpinShare se réserve le droit de : (i) retenir les paiements en attente d&apos;examen ou d&apos;enquête pour fraude ; (ii) déduire les montants associés à des transactions frauduleuses, invalides ou annulées ; (iii) recouvrer les montants trop versés à partir de revenus futurs ou, si nécessaire, par demande de paiement direct ; et (iv) refuser le paiement si le compte fait l&apos;objet d&apos;une enquête pour violation présumée du présent Accord, si les paiements vers ce compte entraîneraient des risques de sanctions, réglementaires ou autres conformité, ou si le paiement vers ce compte serait autrement illégal.
            </LegalSubsection>
            <LegalSubsection title="6.7 Confiscation">
              Lors de la résiliation d&apos;un compte pour quelque raison que ce soit (que ce soit par l&apos;utilisateur ou par SpinShare), tout revenu impayé inférieur au Seuil de paiement est confisqué. Si la résiliation résulte d&apos;une violation du présent Accord, tous les revenus impayés sont confisqués quel que soit le solde. Les Utilisateurs rémunérés n&apos;ont aucun droit de propriété sur les revenus en attente ou accumulés tant qu&apos;ils ne sont pas effectivement versés.
            </LegalSubsection>
            <LegalSubsection title="6.8 Classification fiscale et obligations de déclaration">
              <LegalSubsection title="6.8.1 Nature des paiements">
                Les paiements effectués aux Utilisateurs rémunérés représentent des distributions de partage de revenus attribuables à l&apos;affichage de publicités tierces via l&apos;utilisation sous licence par l&apos;utilisateur de l&apos;Extension SpinShare ou du Wrapper CLI. SpinShare ne qualifie pas ces paiements de salaires, traitements ou rémunération pour services rendus. Les utilisateurs reconnaissent qu&apos;ils ne sont pas employés, contractants indépendants ou agents de SpinShare. La classification fiscale de ces paiements (par exemple, revenus de redevances, autres revenus ou revenus de travail indépendant) dépend des circonstances individuelles de l&apos;utilisateur et de la loi applicable.
              </LegalSubsection>
              <LegalSubsection title="6.8.2 Déclaration fiscale aux États-Unis &mdash; Formulaire 1099-MISC">
                Pour les Utilisateurs rémunérés qui sont des personnes américaines (au sens de l&apos;IRS) et qui reçoivent des paiements totalisant six cents dollars (600 $) ou plus au cours d&apos;une année civile, notre processeur de paiement tiers, Stripe Connect, déposera le formulaire IRS 1099-MISC (ou tout autre déclaration d&apos;information applicable) en déclarant ces montants dans la case 3 (Autres revenus). Le processeur de paiement remettra le formulaire applicable à chaque Utilisateur rémunéré concerné avant la date limite exigée par la loi (généralement le 31 janvier de l&apos;année civile suivante). Les documents fiscaux peuvent être remis électroniquement via le processeur de paiement, sous réserve du consentement de l&apos;utilisateur à la remise électronique fourni lors de la configuration du compte de paiement. Le processeur de paiement peut ajuster la catégorie ou le formulaire de déclaration applicable si la loi applicable ou les directives de l&apos;IRS l&apos;exigent.
              </LegalSubsection>
              <LegalSubsection title="6.8.3 Pas de 1099-NEC ni de retenue">
                SpinShare n&apos;émet pas le formulaire 1099-NEC (Rémunération de non-employé) et ne traitera pas les paiements comme soumis à la retenue de secours, sauf disposition contraire à la Section 6.8.6. Les utilisateurs reconnaissent que la classification de SpinShare aux fins de déclaration ne détermine pas le traitement fiscal définitif des paiements, et les utilisateurs assument l&apos;entière responsabilité de la caractérisation correcte sur leurs déclarations fiscales.
              </LegalSubsection>
              <LegalSubsection title="6.8.4 Collecte d&apos;informations fiscales &mdash; Formulaire W-9">
                Dans le cadre de l&apos;intégration Stripe Connect, et avant qu&apos;un paiement puisse être traité, les Utilisateurs rémunérés personnes américaines doivent compléter et soumettre le formulaire IRS W-9 (Demande de numéro d&apos;identification du contribuable et certification) au processeur de paiement. Le défaut de fournir un W-9 valide dans les trente (30) jours suivant la demande du processeur entraînera une suspension temporaire des paiements jusqu&apos;à réception du formulaire.
              </LegalSubsection>
              <LegalSubsection title="6.8.5 Utilisateurs internationaux &mdash; Formulaire W-8BEN / W-8ECI">
                Dans le cadre de l&apos;intégration Stripe Connect, les Utilisateurs rémunérés qui ne sont pas des personnes américaines doivent compléter le formulaire IRS W-8BEN (Certificat de statut étranger du propriétaire bénéficiaire) ou le formulaire W-8ECI (Certificat de revendication d&apos;exemption de retenue pour une personne étrangère sur les revenus effectivement liés à l&apos;exercice d&apos;une activité commerciale ou professionnelle aux États-Unis), selon le cas. Les personnes étrangères recevant des paiements de sources américaines peuvent être soumises à une retenue à un taux allant jusqu&apos;à trente pour cent (30 %) sur les paiements bruts, sauf si un taux réduit s&apos;applique en vertu d&apos;une convention fiscale applicable entre les États-Unis et le pays de résidence du bénéficiaire. Le processeur de paiement retiendra au taux légal applicable sauf si un W-8BEN valide revendiquant les avantages de la convention est archivé auprès du processeur. Les utilisateurs sont responsables de fournir des informations exactes de revendication de convention et de comprendre leurs obligations fiscales dans leur pays d&apos;origine.
              </LegalSubsection>
              <LegalSubsection title="6.8.6 Retenue de secours">
                Conformément à l&apos;article 3406 du Code des impôts internes (IRC), notre processeur de paiement tiers est tenu d&apos;imposer une retenue de secours au taux de vingt-quatre pour cent (24 %) sur les paiements déclarables à tout bénéficiaire qui : (i) ne fournit pas de numéro d&apos;identification du contribuable (TIN) valide ; (ii) a été notifié par l&apos;IRS d&apos;un défaut de déclaration de tous les intérêts ou dividendes ; ou (iii) a fourni un TIN incorrect. Si le processeur de paiement reçoit un avis de l&apos;IRS exigeant une retenue de secours sur le compte d&apos;un utilisateur, tous les paiements ultérieurs à cet utilisateur seront soumis à la retenue de secours jusqu&apos;à ce que l&apos;IRS émette un avis de cessation ou que l&apos;utilisateur fournisse un W-9 corrigé.
              </LegalSubsection>
              <LegalSubsection title="6.8.7 Obligations fiscales de l&apos;utilisateur">
                Que SpinShare émette ou non une déclaration d&apos;information, toutes les distributions reçues via le Service constituent un revenu brut pour le bénéficiaire au sens du Code des impôts internes (et équivalents étrangers), et les utilisateurs sont seuls responsables de : (i) déclarer tous les paiements sur leurs déclarations fiscales applicables ; (ii) payer toutes les taxes sur le revenu fédérales, étatiques, locales et étrangères applicables ; (iii) verser la taxe sur le travail indépendant si les activités de l&apos;utilisateur constituent une activité commerciale ou professionnelle ; (iv) effectuer des paiements d&apos;impôt estimé si requis ; et (v) conserver des registres suffisants pour justifier les revenus et toute déduction revendiquée.
              </LegalSubsection>
              <LegalSubsection title="6.8.8 Pas de conseil fiscal">
                Rien dans le présent Accord ou sur le site web SpinShare ne constitue un conseil fiscal, juridique ou comptable. Les utilisateurs sont fortement encouragés à consulter leurs propres conseillers fiscaux concernant la caractérisation et la déclaration des paiements reçus via le Service. SpinShare décline toute responsabilité pour toute position fiscale adoptée (ou non adoptée) par les utilisateurs.
              </LegalSubsection>
            </LegalSubsection>
          </LegalSection>
        """),
    7: (
        """\
<LegalSection id={7} title={titles[7] ?? ""}>
            <LegalSubsection title="7.1 Création de campagne et enchères">
              Les Annonceurs peuvent créer des Campagnes en soumettant du Contenu publicitaire et une enchère CPM maximale via notre plateforme. La Campagne avec l&apos;enchère CPM maximale active la plus élevée remporte chaque emplacement publicitaire ; en cas d&apos;égalité, la priorité est accordée à la date de création la plus ancienne, puis à l&apos;identifiant de campagne le plus bas. Les Annonceurs peuvent augmenter leur enchère à tout moment pour améliorer la priorité de placement.
            </LegalSubsection>
            <LegalSubsection title="7.2 Enchères non remboursables">
              TOUTES LES ENCHÈRES SONT DÉFINITIVES ET NON REMBOURSABLES UNE FOIS QU&apos;UNE IMPRESSION A ÉTÉ DIFFUSÉE. Les Annonceurs reconnaissent que les enchères représentent un engagement contraignant de payer pour les impressions diffusées. Nonobstant ce qui précède, SpinShare peut, à sa seule discrétion, émettre des crédits pour les impressions que nos systèmes déterminent ne pas avoir été diffusées conformément aux paramètres de la campagne.
            </LegalSubsection>
            <LegalSubsection title="7.3 Exigences relatives au contenu publicitaire">
              Les Annonceurs garantissent et déclarent que tout Contenu publicitaire : (i) est conforme à toutes les lois, réglementations et normes sectorielles applicables ; (ii) ne porte pas atteinte à des droits de propriété intellectuelle ; (iii) n&apos;est pas faux, trompeur, mensonger ou diffamatoire ; (iv) ne promeut pas de produits, services ou activités illégaux ; (v) ne contient pas de logiciels malveillants, de liens de hameçonnage ou d&apos;autres codes nuisibles ; et (vi) est conforme aux exigences de contenu du présent Accord, y compris la Section 7.4.
            </LegalSubsection>
            <LegalSubsection title="7.4 Interdictions de contenu">
              Sans limitation, le Contenu publicitaire ne peut pas : promouvoir les jeux d&apos;argent (là où c&apos;est interdit) ; promouvoir l&apos;alcool, le tabac ou les substances contrôlées en violation de la loi ; contenir du contenu pour adultes, des propos haineux ou du matériel discriminatoire ; faire des allégations de santé ou financières non étayées ; usurper l&apos;identité de SpinShare ou d&apos;un tiers ; ou violer les droits de propriété intellectuelle, de confidentialité ou de publicité de toute personne ou entité.
            </LegalSubsection>
            <LegalSubsection title="7.5 Droit de refuser ou de retirer">
              SpinShare se réserve le droit, à sa seule discrétion et sans responsabilité, de refuser, retirer ou suspendre tout Contenu publicitaire ou campagne pour quelque raison que ce soit ou sans raison, y compris, sans limitation, les violations du présent Accord, les plaintes d&apos;utilisateurs ou les préoccupations relatives à la sécurité de la marque. Aucun remboursement ni crédit ne sera accordé pour les campagnes retirées, sauf si SpinShare détermine, à sa seule discrétion, que le retrait était erroné. Les Annonceurs peuvent contester un retrait ou une suspension dans les trente (30) jours en contactant support@learnx.pro. SpinShare examinera le recours et, s&apos;il détermine que l&apos;action était erronée, rétablira la campagne et/ou émettra un crédit. Toutes les décisions de recours sont définitives.
            </LegalSubsection>
            <LegalSubsection title="7.6 Indemnisation de l&apos;annonceur pour le contenu">
              Les Annonceurs indemnisent expressément et tiennent SpinShare indemne de toute réclamation, dommage, perte et dépense (y compris les honoraires d&apos;avocat raisonnables) découlant de ou liés à : (i) le contenu, l&apos;exactitude ou la légalité du Contenu publicitaire ; (ii) les produits ou services promus ; (iii) les sites web de destination ou pages d&apos;atterrissage liés depuis les publicités ; et (iv) toute fausse déclaration ou violation de garantie par l&apos;Annonceur.
            </LegalSubsection>
            <LegalSubsection title="7.7 Facturation des clics">
              Lorsque les clics sont facturés séparément pour une campagne, le prix par clic est un multiple du prix effectif par impression de la campagne. Ce multiple n&apos;est pas fixe et peut être ajusté par SpinShare de temps à autre ; les tarifs actuels sont affichés dans le tableau de bord annonceur. Un « clic » est enregistré lorsqu&apos;un utilisateur interagit de manière affirmative avec une publicité d&apos;une manière qui initie la navigation vers l&apos;URL désignée par l&apos;Annonceur. SpinShare ne fait aucune déclaration ni garantie concernant les taux de conversion, le retour sur investissement ou les résultats commerciaux des campagnes publicitaires.
            </LegalSubsection>
          </LegalSection>
        """),
    8: (
        """\
<LegalSection id={8} title={titles[8] ?? ""}>
            <LegalSubsection title="8.1 Obligations de paiement de l&apos;annonceur">
              Les Annonceurs acceptent de payer tous les frais engagés en relation avec leur compte, y compris toutes les impressions diffusées et les clics enregistrés. Le paiement est dû conformément aux conditions de facturation sélectionnées lors de la configuration de la campagne (généralement le prépaiement d&apos;un budget de Campagne via Stripe Checkout, avec déduction des impressions au fur et à mesure de leur diffusion). Le défaut de paiement des soldes impayés peut entraîner la suspension du compte, la résiliation de la campagne et le recours au recouvrement.
            </LegalSubsection>
            <LegalSubsection title="8.2 Modes de paiement">
              SpinShare accepte les paiements via Stripe Checkout, exploité par notre processeur de paiement tiers, Stripe, Inc. En fournissant des informations de paiement, vous déclarez et garantissez être autorisé à utiliser le mode de paiement désigné. Vous nous autorisez à débiter votre mode de paiement pour tous les frais engagés.
            </LegalSubsection>
            <LegalSubsection title="8.3 Paiements en retard">
              Les paiements non reçus à la date d&apos;échéance sont soumis à des pénalités de retard de 2,5 % par mois (ou le montant maximum autorisé par la loi, si inférieur) sur le solde impayé. SpinShare se réserve le droit de suspendre toutes les campagnes et de résilier les comptes en cas de non-paiement persistant.
            </LegalSubsection>
            <LegalSubsection title="8.4 Rétrofacturations et litiges">
              Les Annonceurs doivent notifier SpinShare par écrit de tout litige de facturation dans les trente (30) jours suivant la date de prélèvement. Les parties non contestées seront payées rapidement. L&apos;initiation d&apos;une rétrofacturation ou d&apos;un litige de paiement sans avoir d&apos;abord tenté de résoudre le problème avec SpinShare constitue une violation substantielle du présent Accord et peut entraîner une suspension ou une résiliation immédiate du compte.
            </LegalSubsection>
            <LegalSubsection title="8.5 Conditions de paiement des utilisateurs">
              Les Utilisateurs rémunérés peuvent demander la suppression du compte et le paiement des revenus accumulés (sous réserve du Seuil de paiement) en contactant support@learnx.pro, ou via l&apos;interface des paramètres du compte lorsque disponible. Les demandes de paiement sont traitées dans les trente (30) jours ouvrables. Nous nous réservons le droit de retarder les paiements en attente de l&apos;achèvement de l&apos;examen anti-fraude ou de la vérification des informations de paiement.
            </LegalSubsection>
          </LegalSection>
        """),
    9: (
        """\
<LegalSection id={9} title={titles[9] ?? ""}>
            <LegalSubsection title="9.1 Interdiction stricte de la fraude">
              <p>
                SpinShare applique une politique de tolérance zéro envers la fraude, les abus et la manipulation. Les activités suivantes sont strictement interdites et constituent des violations substantielles du présent Accord :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-slate-900">Fraude au clic.</strong> Toute tentative de générer des clics artificiels, y compris, sans limitation : scripts de clics automatisés, fermes de clics, systèmes payés au clic, réseaux de clics coordonnés, ou tout mécanisme conçu pour gonfler artificiellement le nombre de clics.
                </li>
                <li>
                  <strong className="text-slate-900">Manipulation d&apos;impressions.</strong>{" "}
                  Toute tentative de générer des impressions artificielles, y compris : utiliser des outils automatisés pour déclencher des états d&apos;attente IA, exécuter des invites sans signification ou répétitives uniquement pour générer des vues publicitaires, automatiser ou scripter les interactions IDE ou terminal, ou conspirer avec d&apos;autres pour gonfler le nombre d&apos;impressions.
                </li>
                <li>
                  <strong className="text-slate-900">Contournement de la vélocité.</strong>{" "}
                  Toute tentative de contourner la Limite de vélocité ou d&apos;autres plafonds de débit, y compris par le partage d&apos;identifiants, l&apos;utilisation de comptes multiples ou une activité coordonnée.
                </li>
                <li>
                  <strong className="text-slate-900">Abus de comptes multiples.</strong>{" "}
                  Création ou utilisation de plusieurs comptes par une même personne, coordination avec d&apos;autres pour exploiter des réseaux de comptes, ou utilisation d&apos;identifiants partagés entre plusieurs utilisateurs pour agréger des revenus.
                </li>
                <li>
                  <strong className="text-slate-900">Manipulation de métriques.</strong>{" "}
                  Toute tentative d&apos;interférer avec, d&apos;altérer ou de falsifier les données de télémétrie, les nombres d&apos;impressions, les événements de clic ou toute autre métrique utilisée pour calculer les revenus ou les frais publicitaires.
                </li>
                <li>
                  <strong className="text-slate-900">Rétro-ingénierie.</strong>{" "}
                  Toute tentative de décompiler, désassembler, effectuer de la rétro-ingénierie ou autrement dériver le code source de l&apos;Extension ou du Wrapper CLI ; ou d&apos;intercepter, modifier ou falsifier les communications entre le client et les serveurs SpinShare, sauf autorisation par les licences open source applicables.
                </li>
                <li>
                  <strong className="text-slate-900">Contournement.</strong>{" "}
                  Toute tentative de contourner les plafonds d&apos;utilisation, les restrictions géographiques, les limitations de compte ou d&apos;autres contrôles techniques ou politiques mis en œuvre par SpinShare.
                </li>
              </ul>
            </LegalSubsection>
            <LegalSubsection title="9.2 Détection et enquête">
              SpinShare peut employer des systèmes automatisés et des processus d&apos;examen manuel pour détecter les activités frauduleuses ou abusives. Ces systèmes analysent des modèles incluant, sans limitation : la fréquence des invites, la durée des sessions, le timing des clics, les relations entre comptes et les anomalies comportementales. Les utilisateurs reconnaissent et acceptent que leur utilisation du Service sera surveillée à des fins de prévention de la fraude.
            </LegalSubsection>
            <LegalSubsection title="9.3 Mesures d&apos;application">
              En cas de détection ou de suspicion raisonnable de fraude ou d&apos;abus, SpinShare peut, à sa seule discrétion et sans préavis : (i) suspendre ou résilier le(s) compte(s) concerné(s) ; (ii) annuler tout ou partie des entrées du grand livre associées à une activité frauduleuse ; (iii) retenir ou annuler les paiements en attente ; (iv) recouvrer les fonds précédemment versés pour une activité frauduleuse, y compris par compensation sur les revenus futurs ou l&apos;initiation de procédures de recouvrement direct ; (v) bannir définitivement l&apos;utilisateur du Service ; et (vi) signaler l&apos;affaire aux autorités d&apos;application de la loi ou réglementaires.
            </LegalSubsection>
            <LegalSubsection title="9.4 Charge de la preuve">
              Dans tout litige concernant la légitimité des impressions, clics ou revenus, la détermination de SpinShare basée sur ses enregistrements internes et ses systèmes de détection sera présumée valide. L&apos;utilisateur supporte la charge de prouver, par des preuves claires et convaincantes, que l&apos;activité contestée était légitime.
            </LegalSubsection>
            <LegalSubsection title="9.5 Droits de recouvrement">
              Si une activité frauduleuse est détectée après qu&apos;un paiement a eu lieu, SpinShare se réserve le droit de recouvrer les fonds versés. Les méthodes de recouvrement incluent : déduction des revenus futurs ; rétrofacturation sur le mode de paiement enregistré de l&apos;utilisateur (s&apos;il est archivé) ; demande de paiement direct ; et recours au recouvrement. Les utilisateurs consentent à ces méthodes de recouvrement en acceptant le présent Accord.
            </LegalSubsection>
            <LegalSubsection title="9.6 Trop-perçu de bonne foi">
              Si SpinShare détermine que les revenus ont été surestimés en raison d&apos;une erreur technique, d&apos;un dysfonctionnement du système ou d&apos;un mauvais calcul (indépendamment d&apos;une faute de l&apos;utilisateur), nous nous réservons le droit de corriger le Grand livre et de recouvrer les montants trop versés, à condition que cette correction soit effectuée dans les quatre-vingt-dix (90) jours suivant le trop-perçu.
            </LegalSubsection>
          </LegalSection>
        """),
    10: (
        """\
<LegalSection id={10} title={titles[10] ?? ""}>
            <LegalSubsection title="10.1 Portée de la collecte de données">
              SpinShare collecte et traite uniquement les données nécessaires pour créditer les revenus, facturer les annonceurs, prévenir la fraude, et exploiter et améliorer le Service. Pour chaque publicité diffusée, nous enregistrons la télémétrie d&apos;événements comprenant : le type d&apos;événement (par exemple, impression rendue, impression visible, ticks de durée de visualisation et clics) ; les identifiants de publicité, de campagne et de créatif associés ; la surface sur laquelle la publicité a été affichée (par exemple, spinner, ligne d&apos;état, notification de progression ou overlay) ; les métriques de visibilité à l&apos;écran (telles que le pourcentage visible et la durée visible) ; un identifiant client par installation ; un identifiant par événement (UUID) utilisé pour dédupliquer et rapprocher les événements ; les horodatages ; la version du client et la version de l&apos;application hôte (par exemple, la version SpinShare, Claude Code ou Visual Studio Code) ; et, pour les Utilisateurs rémunérés connectés, un identifiant de compte utilisé pour attribuer le crédit. Nous traitons également votre adresse de protocole internet (IP) de manière transitoire à des fins de limitation de débit, de détection d&apos;abus et de prévention de la fraude.
            </LegalSubsection>
            <LegalSubsection title="10.2 Ce que nous ne collectons PAS">
              SpinShare ne collecte pas et ne collectera pas, n&apos;accède pas, ne traite pas et ne stocke pas : (i) le contenu de votre code, de vos invites ou de vos requêtes soumises aux assistants de programmation IA ; (ii) les réponses IA, le code généré ou les sorties de modèle ; (iii) vos fenêtres de contexte, historique de conversation, fichiers ou contenus de projet ; (iv) des informations personnelles au-delà de ce qui est nécessaire pour la création de compte, le traitement des paiements, la conformité fiscale et la prévention de la fraude ; ou (v) toute donnée pouvant révéler vos secrets commerciaux, code source propriétaire ou informations commerciales confidentielles.
            </LegalSubsection>
            <LegalSubsection title="10.3 Télémétrie facturable">
              La participation au Programme de revenus requiert le consentement à la collecte de télémétrie facturable. Cette télémétrie est strictement limitée aux métriques pseudonymisées décrites à la Section 10.1 et est nécessaire pour créditer les revenus et détecter la fraude. Le retrait du consentement à la télémétrie entraînera l&apos;arrêt immédiat de l&apos;accumulation des revenus, bien que les revenus précédemment accumulés (s&apos;ils sont éligibles au paiement) seront versés.
            </LegalSubsection>
            <LegalSubsection title="10.4 Conservation des données">
              Les données de compte individuelles sont conservées pendant 7 ans suivant la résiliation du compte ou 7 ans à compter de la dernière activité du compte, selon la période la plus longue, à des fins de prévention de la fraude, de rapprochement financier et de conformité légale. Les données agrégées peuvent être conservées indéfiniment pour l&apos;analyse et l&apos;amélioration du service, et anonymisées dans la mesure du possible ou si requis.
            </LegalSubsection>
            <LegalSubsection title="10.5 Demandes de suppression de données">
              Les utilisateurs peuvent demander la suppression de leur compte et des données personnelles associées en contactant support@learnx.pro. Lors de la suppression : (i) les identifiants personnels seront supprimés ou anonymisés dans les 30 jours ; (ii) les données agrégées et anonymisées dérivées du compte peuvent être conservées ; (iii) les registres financiers exigés par la loi seront conservés conformément aux obligations légales ; et (iv) les données d&apos;impressions et de clics anonymisées nécessaires au rapprochement de facturation des annonceurs seront conservées sous une forme non identifiable.
            </LegalSubsection>
            <LegalSubsection title="10.6 Sous-traitants tiers">
              SpinShare utilise des prestataires de services tiers pour le traitement des paiements, l&apos;analyse, l&apos;hébergement et le support client. Ceux-ci incluent actuellement Stripe (traitement des paiements et versements), Google Cloud / Firebase (hébergement, authentification et stockage de données), Twilio SendGrid (courriel transactionnel) et un fournisseur d&apos;analyse d&apos;utilisation du site web, bien que les prestataires puissent changer. En utilisant le Service, vous consentez à l&apos;engagement de ces sous-traitants sous réserve d&apos;accords de protection des données appropriés.
            </LegalSubsection>
            <LegalSubsection title="10.7 Mesures de sécurité">
              SpinShare maintient des mesures techniques et organisationnelles conçues pour protéger les données collectées contre l&apos;accès non autorisé, la divulgation, l&apos;altération et la destruction &mdash; y compris le chiffrement des données en transit (TLS) et au repos, les contrôles d&apos;accès basés sur les rôles selon le principe du moindre privilège, la gestion dédiée des secrets (plutôt que la configuration en texte clair), la journalisation, la surveillance et la limitation de débit pour détecter la fraude et les abus, ainsi que des évaluations de sécurité périodiques. SpinShare limite également son exposition par conception : comme décrit à la Section 10.2, il ne collecte pas le contenu de votre code, de vos invites ou de vos interactions IA.
            </LegalSubsection>
          </LegalSection>
        """),
    11: (
        """\
<LegalSection id={11} title={titles[11] ?? ""}>
            <LegalSubsection title="11.1 Reconnaissance de modification de l&apos;Extension et du Wrapper CLI">
              LES UTILISATEURS RECONNAISSENT ET COMPRENNENT EXPRESSÉMENT QUE L&apos;EXTENSION SPINSHARE ET LE WRAPPER CLI FONCTIONNENT EN MODIFIANT, EN CORRIGEANT OU EN S&apos;INTÉGRANT AUX MÉCANISMES DE RENDU INTERNES DE LOGICIELS TIERS, Y COMPRIS, SANS LIMITATION, L&apos;EXTENSION CLAUDE CODE D&apos;ANTHROPIC, VISUAL STUDIO CODE ET LES OUTILS CLI CIBLES. CETTE MODIFICATION PEUT IMPLIQUER : (i) l&apos;interception ou le remplacement des appels de rendu UI ; (ii) la substitution du contenu de la ligne d&apos;état ou du spinner pendant les états d&apos;attente ; et (iii) l&apos;injection de contenu servi à distance dans l&apos;interface de l&apos;éditeur ou du terminal.
            </LegalSubsection>
            <LegalSubsection title="11.2 Conditions d&apos;utilisation des tiers">
              L&apos;installation et l&apos;utilisation de l&apos;Extension SpinShare et du Wrapper CLI par les utilisateurs ne doivent pas violer les conditions d&apos;utilisation, les contrats de licence utilisateur final ou les politiques d&apos;utilisation acceptable d&apos;Anthropic, Microsoft (Visual Studio Code), OpenAI, GitHub ou d&apos;autres plateformes tierces. LES UTILISATEURS ASSUMENT L&apos;ENTIÈRE RESPONSABILITÉ DE S&apos;ASSURER QUE LEUR UTILISATION DE SPINSHARE EST CONFORME À TOUTES LES CONDITIONS TIERS APPLICABLES. SpinShare ne déclare ni ne garantit qu&apos;une utilisation de l&apos;Extension ou du Wrapper CLI est autorisée par une plateforme tierce.
            </LegalSubsection>
            <LegalSubsection title="11.3 Modifications de plateforme et interruption de service">
              Les plateformes tierces (y compris Anthropic et Microsoft) peuvent, à tout moment : (i) modifier leurs logiciels, API ou architecture d&apos;extension ; (ii) mettre en œuvre des mesures techniques qui bloquent, désactivent ou interfèrent avec l&apos;Extension SpinShare ou le Wrapper CLI ; (iii) mettre à jour leurs conditions d&apos;utilisation pour interdire le mode d&apos;exploitation de SpinShare ; ou (iv) prendre des mesures d&apos;application à l&apos;encontre des utilisateurs ayant installé l&apos;Extension ou le Wrapper CLI, y compris la suspension ou la résiliation de leurs comptes sur la plateforme tierce.
            </LegalSubsection>
            <LegalSubsection title="11.4 Aucune affiliation">
              SpinShare n&apos;est pas affilié à, approuvé par, sponsorisé par ou autrement associé à Anthropic, Microsoft, OpenAI, GitHub ou tout autre fournisseur de plateforme tierce. Les références à Claude Code, Visual Studio Code ou d&apos;autres produits sont uniquement à des fins descriptives et n&apos;impliquent aucune relation avec les propriétaires respectifs des marques.
            </LegalSubsection>
            <LegalSubsection title="11.5 Assumption des risques par l&apos;utilisateur">
              EN INSTALLANT ET EN UTILISANT L&apos;EXTENSION OU LE WRAPPER CLI, VOUS ASSUMEZ EXPRESSÉMENT TOUS LES RISQUES ASSOCIÉS AUX INTERACTIONS AVEC DES PLATEFORMES TIERS, Y COMPRIS : (i) le risque que votre compte Anthropic, Microsoft ou autre plateforme soit suspendu ou résilié ; (ii) le risque de perte de données ou d&apos;interruption de service ; (iii) le risque que l&apos;Extension ou le Wrapper CLI entre en conflit avec d&apos;autres extensions, plugins ou fonctionnalités IDE ; et (iv) le risque de vulnérabilités de sécurité découlant de l&apos;interaction du client avec des logiciels tiers.
            </LegalSubsection>
          </LegalSection>
        """),
    12: (
        """\
<LegalSection id={12} title={titles[12] ?? ""}>
            <LegalSubsection title="12.1 Résiliation par l&apos;utilisateur">
              Vous pouvez résilier votre compte à tout moment en contactant support@learnx.pro et en demandant la suppression. La résiliation ne vous libère pas des obligations contractées avant la résiliation et n&apos;affecte pas les dispositions qui, par leur nature, survivent à la résiliation.
            </LegalSubsection>
            <LegalSubsection title="12.2 Résiliation par SpinShare">
              SpinShare se réserve le droit, à sa seule discrétion et sans préavis, de suspendre ou résilier tout compte, restreindre l&apos;accès au Service ou cesser de fournir le service à tout utilisateur ou annonceur pour quelque raison que ce soit ou sans raison, y compris, sans limitation : violation du présent Accord ; fraude ou abus suspectés ; demande d&apos;une autorité d&apos;application de la loi ou réglementaire ; période prolongée d&apos;inactivité ; ou cessation d&apos;activité.
            </LegalSubsection>
            <LegalSubsection title="12.3 Résiliation pour cause">
              Sans limiter la Section 12.2, SpinShare peut résilier immédiatement tout compte en cas de : (i) violation substantielle du présent Accord ; (ii) détection de fraude, d&apos;abus ou de manipulation ; (iii) utilisation du Service à des fins illégales ; (iv) actions exposant SpinShare à une responsabilité légale ; ou (v) violations répétées des politiques d&apos;utilisation acceptable. La résiliation pour cause entraîne la confiscation immédiate de tous les revenus impayés et une responsabilité potentielle pour dommages-intérêts.
            </LegalSubsection>
            <LegalSubsection title="12.4 Effet de la résiliation">
              Lors de la résiliation : (i) toutes les licences accordées aux présentes prennent fin immédiatement ; (ii) vous devez cesser toute utilisation du Service et désinstaller l&apos;Extension et le Wrapper CLI ; (iii) les revenus accumulés inférieurs au Seuil de paiement sont confisqués ; (iv) nous pouvons supprimer vos données de compte conformément à la Section 10.5 ; et (v) toute disposition destinée par sa nature à survivre à la résiliation survivra.
            </LegalSubsection>
            <LegalSubsection title="12.5 Aucun droit de réintégration">
              Les utilisateurs résiliés n&apos;ont aucun droit de réintégration. SpinShare peut, à sa seule discrétion, autoriser la création d&apos;un nouveau compte par un utilisateur précédemment résilié, à condition que toutes les obligations en suspens aient été satisfaites.
            </LegalSubsection>
          </LegalSection>
        """),
    13: (
        """\
<LegalSection id={13} title={titles[13] ?? ""}>
            <LegalSubsection title="13.1 Propriété de SpinShare">
              Tous les droits, titres et intérêts relatifs au Service, y compris l&apos;Extension, le Wrapper CLI, le site web, les logiciels, algorithmes, systèmes d&apos;enchères, analyses, marques, apparence commerciale et toute propriété intellectuelle associée, sont et resteront la propriété exclusive de SpinShare et de ses concédants de licence. Le présent Accord ne confère aucun droit de propriété sur le Service ou ses composants.
            </LegalSubsection>
            <LegalSubsection title="13.2 Licence limitée aux utilisateurs">
              Sous réserve de votre conformité au présent Accord, SpinShare vous accorde une licence limitée, non exclusive, non transférable et révocable pour : (i) installer et utiliser l&apos;Extension et le Wrapper CLI uniquement aux fins prévues ; et (ii) accéder au site web et aux fonctionnalités de la plateforme. Cette licence n&apos;autorise pas : la modification, la distribution, les œuvres dérivées, la rétro-ingénierie, la décompilation ou la suppression des mentions de propriété, sauf autorisation par les licences open source applicables couvrant l&apos;Extension ou le Wrapper CLI.
            </LegalSubsection>
            <LegalSubsection title="13.3 Licence de contenu annonceur">
              En soumettant du Contenu publicitaire, les Annonceurs accordent à SpinShare une licence mondiale, non exclusive et exempte de redevances pour : (i) reproduire, afficher et transmettre le Contenu publicitaire via le Service ; (ii) modifier le Contenu publicitaire uniquement dans la mesure nécessaire au formatage technique ; et (iii) utiliser le nom et les marques de l&apos;Annonceur uniquement en relation avec l&apos;affichage des publicités. Cette licence prend fin lorsque la Campagne associée se termine ou que le compte est résilié.
            </LegalSubsection>
            <LegalSubsection title="13.4 Commentaires">
              Tout commentaire, suggestion ou idée que vous fournissez concernant le Service peut être utilisé par SpinShare sans restriction, compensation ni attribution. Vous cédez par les présentes à SpinShare tous les droits, titres et intérêts relatifs à ces commentaires.
            </LegalSubsection>
            <LegalSubsection title="13.5 Open source">
              Des parties de l&apos;Extension et du Wrapper CLI peuvent être publiées sous des licences open source. Rien dans le présent Accord ne restreint les droits qui vous sont accordés par ces licences. En cas de conflit entre le présent Accord et une licence open source applicable, la licence open source prévaut pour le code couvert.
            </LegalSubsection>
          </LegalSection>
        """),
    14: (
        """\
<LegalSection id={14} title={titles[14] ?? ""}>
            <LegalSubsection title="14.1 Service fourni « en l&apos;état »">
              LE SERVICE EST FOURNI « EN L&apos;ÉTAT » ET « SELON DISPONIBILITÉ », SANS GARANTIE D&apos;AUCUNE SORTE, EXPRESSE OU IMPLICITE. DANS LA MESURE MAXIMALE PERMISE PAR LA LOI, SPINSHARE DÉCLINE TOUTES LES GARANTIES, Y COMPRIS, SANS LIMITATION : LES GARANTIES IMPLICITES DE QUALITÉ MARCHANDE, D&apos;ADÉQUATION À UN USAGE PARTICULIER, DE NON-CONTREFAÇON, DE TITRE, ET TOUTE GARANTIE DÉCOULANT DES USAGES COMMERCIAUX, DE L&apos;EXÉCUTION DES CONTRATS OU DES PRATIQUES COMMERCIALES.
            </LegalSubsection>
            <LegalSubsection title="14.2 Aucune garantie de résultats">
              SPINSHARE NE GARANTIT PAS QUE : (i) LE SERVICE RÉPONDRA À VOS EXIGENCES OU ATTENTES ; (ii) LES REVENUS ATTEINDRONT UN NIVEAU PARTICULIER ; (iii) LES CAMPAGNES PUBLICITAIRES ATTEINDRONT DES RÉSULTATS COMMERCIAUX ; (iv) LE SERVICE SERA ININTERROMPU, OPPORTUN, SÉCURISÉ OU EXEMPT D&apos;ERREURS ; (v) LES DÉFAUTS SERONT CORRIGÉS ; OU (vi) LE SERVICE EST EXEMPT DE VIRUS OU D&apos;AUTRES COMPOSANTS NUISIBLES.
            </LegalSubsection>
            <LegalSubsection title="14.3 Contenu tiers">
              SpinShare n&apos;approuve pas, ne vérifie pas et n&apos;assume pas la responsabilité de tout Contenu publicitaire, site web de destination ou produit ou service tiers annoncé via le Service. Toutes les transactions entre utilisateurs et annonceurs se font uniquement entre ces parties.
            </LegalSubsection>
            <LegalSubsection title="14.4 Risques de l&apos;Extension et du Wrapper CLI">
              SPINSHARE NE GARANTIT PAS QUE L&apos;EXTENSION OU LE WRAPPER CLI NE SERONT PAS EN CONFLIT AVEC, N&apos;INTERFÉRERONT PAS AVEC OU N&apos;ENDOMMAGERONT PAS D&apos;AUTRES LOGICIELS, EXTENSIONS, PLUGINS, FICHIERS OU SYSTÈMES. VOUS ASSUMEZ TOUS LES RISQUES DE PERTE DE DONNÉES OU DE DOMMAGES SYSTÈME DÉCOULANT DE L&apos;INSTALLATION OU DE L&apos;UTILISATION DE L&apos;EXTENSION OU DU WRAPPER CLI.
            </LegalSubsection>
          </LegalSection>
        """),
    15: (
        """\
<LegalSection id={15} title={titles[15] ?? ""}>
            <LegalSubsection title="15.1 Exclusion des dommages indirects">
              DANS LA MESURE MAXIMALE PERMISE PAR LA LOI, SPINSHARE, SES AFFILIÉS, DIRIGEANTS, ADMINISTRATEURS, EMPLOYÉS, AGENTS, FOURNISSEURS OU CONCÉDANTS DE LICENCE NE SERONT PAS RESPONSABLES DE TOUT DOMMAGE INDIRECT, ACCESSOIRE, SPÉCIAL, CONSÉCUTIF, PUNITIF OU EXEMPLAIRE, Y COMPRIS, SANS LIMITATION : PERTE DE PROFITS, PERTE DE REVENUS, PERTE DE DONNÉES, PERTE DE CLIENTÈLE, INTERRUPTION D&apos;ACTIVITÉ, DOMMAGES INFORMATIQUES, PANNE SYSTÈME OU COÛT DE SERVICES DE SUBSTITUTION, DÉCOULANT DE OU EN RELATION AVEC LE PRÉSENT ACCORD OU L&apos;UTILISATION DU SERVICE, QUEL QUE SOIT LE FONDEMENT DE LA RESPONSABILITÉ.
            </LegalSubsection>
            <LegalSubsection title="15.2 Plafond de responsabilité">
              LA RESPONSABILITÉ TOTALE CUMULÉE DE SPINSHARE DÉCOULANT DE OU EN RELATION AVEC LE PRÉSENT ACCORD NE DÉPASSERA PAS LE PLUS ÉLEVÉ DES MONTANTS SUIVANTS : (i) LE MONTANT QUE VOUS AVEZ PAYÉ À SPINSHARE AU COURS DES DOUZE (12) MOIS PRÉCÉDANT L&apos;ÉVÉNEMENT DONNANT LIEU À LA RESPONSABILITÉ ; OU (ii) CENT DOLLARS AMÉRICAINS (100,00 $).
            </LegalSubsection>
            <LegalSubsection title="15.3 Objet essentiel">
              LES LIMITATIONS DE RESPONSABILITÉ ÉNONCÉES DANS LA PRÉSENTE SECTION 15 S&apos;APPLIQUERONT QUE SPINSHARE AIT ÉTÉ INFORMÉ OU NON DE LA POSSIBILITÉ DE TELS DOMMAGES ET QUE LES RECOURS LIMITÉS ÉCHOUENT OU NON À ATTEINDRE LEUR OBJET ESSENTIEL.
            </LegalSubsection>
          </LegalSection>
        """),
    16: (
        """\
<LegalSection id={16} title={titles[16] ?? ""}>
            <LegalSubsection title="16.1 Indemnisation de l&apos;utilisateur">
              Vous acceptez de défendre, d&apos;indemniser et de tenir SpinShare et ses affiliés, dirigeants, administrateurs, employés et agents indemnes de toute réclamation, dommage, perte, responsabilité, coût et dépense (y compris les honoraires d&apos;avocat raisonnables) découlant de ou liés à : (i) votre utilisation du Service ; (ii) votre violation du présent Accord ou de toute condition tierce ; (iii) tout litige entre vous et votre employeur ou un tiers concernant votre installation ou utilisation de l&apos;Extension ou du Wrapper CLI ; (iv) toute réclamation d&apos;Anthropic, Microsoft ou d&apos;un autre fournisseur de plateforme découlant de votre utilisation du Service ; et (v) votre violation de toute loi ou réglementation applicable.
            </LegalSubsection>
            <LegalSubsection title="16.2 Indemnisation de l&apos;annonceur">
              Les Annonceurs acceptent de défendre, d&apos;indemniser et de tenir SpinShare indemne de toute réclamation, dommage, perte et dépense découlant de ou liés à : (i) le Contenu publicitaire et les produits ou services promus ; (ii) les sites web de destination et pages d&apos;atterrissage ; (iii) la violation de droits de propriété intellectuelle ou d&apos;autres droits ; (iv) les allégations publicitaires fausses, trompeuses ou mensongères ; et (v) la violation de toute déclaration ou garantie des présentes.
            </LegalSubsection>
            <LegalSubsection title="16.3 Procédure d&apos;indemnisation">
              SpinShare fournira un avis rapide de toute réclamation soumise à indemnisation. La partie indemnisante aura le droit de contrôler la défense et le règlement d&apos;une telle réclamation, à condition que SpinShare puisse participer avec un avocat de son choix à ses propres frais. La partie indemnisante ne réglera aucune réclamation d&apos;une manière qui affecte défavorablement les droits de SpinShare sans consentement écrit préalable.
            </LegalSubsection>
          </LegalSection>
        """),
    17: (
        """\
<LegalSection id={17} title={titles[17] ?? ""}>
            <LegalSubsection title="17.1 Résolution informelle">
              Avant d&apos;initier toute procédure formelle de résolution de litige, vous acceptez de contacter SpinShare de manière informelle pour tenter de résoudre le litige. Les deux parties acceptent de négocier de bonne foi pendant une période d&apos;au moins trente (30) jours suivant la notification écrite du litige.
            </LegalSubsection>
            <LegalSubsection title="17.2 Arbitrage contraignant">
              SAUF POUR LES LITIGES RELATIFS AUX DROITS DE PROPRIÉTÉ INTELLECTUELLE OU LES DEMANDES DE MESURES INJONCTIVES, TOUT LITIGE DÉCOULANT DE OU EN RELATION AVEC LE PRÉSENT ACCORD SERA RÉSOLU PAR UN ARBITRAGE CONTRAIGNANT ADMINISTRÉ PAR L&apos;AMERICAN ARBITRATION ASSOCIATION (« AAA ») CONFORMÉMENT À SES RÈGLES D&apos;ARBITRAGE COMMERCIAL. L&apos;ARBITRAGE SERA CONDUIT PAR VISIOCONFÉRENCE OU, SI UNE AUDIENCE EST REQUISE, DANS UN LIEU CONVENU MUTUELLEMENT. LE JUGEMENT SUR LA SENTENCE ARBITRALE PEUT ÊTRE INSCRIT DEVANT TOUT TRIBUNAL COMPÉTENT.
            </LegalSubsection>
            <LegalSubsection title="17.3 Renonciation aux recours collectifs">
              VOUS ACCEPTEZ QUE TOUTE PROCÉDURE, QU&apos;ELLE SOIT EN ARBITRAGE OU DEVANT UN TRIBUNAL, SOIT CONDUITE UNIQUEMENT SUR UNE BASE INDIVIDUELLE ET NON DANS LE CADRE D&apos;UN RECOURS COLLECTIF, CONSOLIDÉ OU REPRÉSENTATIF. VOUS RENONCEZ À TOUT DROIT DE PARTICIPER À DES RECOURS COLLECTIFS, DES ACTIONS DE PROCUREUR GÉNÉRAL PRIVÉ OU À UN ARBITRAGE COLLECTIF.
            </LegalSubsection>
            <LegalSubsection title="17.4 Renonciation au procès devant jury">
              DANS LA MESURE PERMISE PAR LA LOI, LES DEUX PARTIES RENONCENT À TOUT DROIT À UN PROCÈS DEVANT JURY DANS TOUTE PROCÉDURE JUDICIAIRE DÉCOULANT DE OU EN RELATION AVEC LE PRÉSENT ACCORD.
            </LegalSubsection>
            <LegalSubsection title="17.5 Droit applicable">
              Le présent Accord sera régi et interprété conformément aux lois de l&apos;État de Californie, sans égard à ses principes de conflit de lois.
            </LegalSubsection>
            <LegalSubsection title="17.6 Mesures injonctives">
              Nonobstant les dispositions d&apos;arbitrage ci-dessus, chaque partie peut solliciter des mesures injonctives ou autres recours équitables devant tout tribunal compétent pour prévenir un préjudice irréparable en attendant l&apos;arbitrage.
            </LegalSubsection>
          </LegalSection>
        """),
    18: (
        """\
<LegalSection id={18} title={titles[18] ?? ""}>
            <LegalSubsection title="18.1 Portée">
              La présente Section complète les divulgations de confidentialité de la Politique de confidentialité et décrit les droits qui peuvent s&apos;appliquer à vous selon votre lieu de résidence. Les droits applicables dépendent de votre juridiction et de nos obligations en vertu de la loi pertinente.
            </LegalSubsection>
            <LegalSubsection title="18.2 Californie (CCPA / CPRA)">
              Si vous êtes résident de Californie, vous avez le droit de : (i) demander la divulgation des catégories et des éléments spécifiques d&apos;informations personnelles que nous avons collectées ; (ii) demander la suppression d&apos;informations personnelles ; (iii) demander la correction d&apos;informations personnelles inexactes ; (iv) vous opposer à la vente ou au partage d&apos;informations personnelles ; et (v) ne pas subir de traitement discriminatoire pour l&apos;exercice de ces droits. SpinShare ne vend ni ne partage d&apos;informations personnelles au sens défini par le CCPA. Pour exercer ces droits, contactez-nous à l&apos;adresse indiquée à la Section 22.
            </LegalSubsection>
            <LegalSubsection title="18.3 Union européenne et Royaume-Uni (GDPR / UK GDPR)">
              Si vous êtes dans l&apos;UE ou au Royaume-Uni, nos bases juridiques de traitement sont : l&apos;exécution d&apos;un contrat (fourniture du Service et crédit des revenus), nos intérêts légitimes (exploitation, sécurisation et amélioration du Service, prévention de la fraude) et l&apos;obligation légale (fiscalité, comptabilité et conformité). Vous avez le droit d&apos;accéder, de rectifier, d&apos;effacer, de restreindre ou de vous opposer au traitement de vos données personnelles, ainsi que le droit à la portabilité des données. Vous avez également le droit de déposer une plainte auprès d&apos;une autorité de contrôle dans votre juridiction.
            </LegalSubsection>
            <LegalSubsection title="18.4 Canada (PIPEDA)">
              Si vous êtes au Canada, vous pouvez demander l&apos;accès à vos informations personnelles et leur correction en vertu de la Loi sur la protection des renseignements personnels et les documents électroniques (« PIPEDA ») et des lois provinciales sur la confidentialité applicables. Pour exercer ces droits, contactez-nous à support@learnx.pro. Si vous n&apos;êtes pas satisfait de notre réponse, vous pouvez contacter le Commissariat à la protection de la vie privée du Canada.
            </LegalSubsection>
            <LegalSubsection title="18.5 Autres lois sur la confidentialité des États américains">
              Les résidents de Virginie (VCDPA), du Colorado (CPA), du Connecticut (CTDPA), de l&apos;Utah (UCPA) et d&apos;autres États américains disposant de lois comparables sur la confidentialité peuvent bénéficier de droits supplémentaires, y compris le droit de confirmer si nous traitons vos informations personnelles, d&apos;y accéder et de les corriger, d&apos;obtenir une copie portable, et de vous opposer à la publicité ciblée ou à la vente d&apos;informations personnelles (que nous ne pratiquons pas). Pour exercer vos droits en vertu de ces lois, contactez-nous à support@learnx.pro.
            </LegalSubsection>
          </LegalSection>
        """),
    19: (
        """\
<LegalSection id={19} title={titles[19] ?? ""}>
            <LegalSubsection title="19.1 Agent désigné">
              SpinShare respecte les droits de propriété intellectuelle et se conforme au DMCA. Si vous estimez qu&apos;un matériel disponible via le Service porte atteinte à votre droit d&apos;auteur, vous pouvez soumettre une notification à notre Agent des droits d&apos;auteur désigné :{" "}
              <a
                href="mailto:support@learnx.pro"
                className="font-bold text-emerald-700 underline-offset-2 hover:underline"
              >
                support@learnx.pro
              </a>
              .
            </LegalSubsection>
            <LegalSubsection title="19.2 Exigences de notification DMCA">
              Toutes les notifications DMCA doivent inclure : (i) une signature physique ou électronique du propriétaire du droit d&apos;auteur ou de son agent autorisé ; (ii) l&apos;identification de l&apos;œuvre protégée par le droit d&apos;auteur prétendument violée ; (iii) l&apos;identification du matériel contrefaisant et de son emplacement ; (iv) les coordonnées ; (v) une déclaration de conviction de bonne foi ; et (vi) une déclaration sous peine de parjure.
            </LegalSubsection>
            <LegalSubsection title="19.3 Contre-notification">
              Si vous estimez que votre contenu a été retiré par erreur, vous pouvez soumettre une contre-notification contenant : (i) votre signature ; (ii) l&apos;identification du matériel retiré ; (iii) une déclaration sous peine de parjure ; (iv) vos coordonnées ; et (v) le consentement à la juridiction.
            </LegalSubsection>
            <LegalSubsection title="19.4 Contrefacteurs récidivistes">
              SpinShare résiliera les comptes des contrefacteurs récidivistes dans les circonstances appropriées.
            </LegalSubsection>
          </LegalSection>
        """),
    20: (
        """\
<LegalSection id={20} title={titles[20] ?? ""}>
            <LegalSubsection title="20.1 Droit de modification">
              SpinShare se réserve le droit de modifier le présent Accord à tout moment. Sauf disposition contraire à la Section 20.2 pour les modifications substantielles, les modifications entrent en vigueur dès la publication de l&apos;Accord révisé sur notre site web ou via l&apos;Extension. La date « Dernière mise à jour » en haut du présent Accord indique la date des dernières modifications.
            </LegalSubsection>
            <LegalSubsection title="20.2 Notification des modifications substantielles">
              Pour les modifications substantielles concernant : (i) le Partage des revenus ou la méthodologie de calcul des revenus ; (ii) les pratiques de collecte de données ; (iii) les procédures de résolution des litiges ; ou (iv) les limitations de responsabilité, nous fournirons un préavis d&apos;au moins trente (30) jours avant l&apos;entrée en vigueur des modifications. L&apos;avis peut être fourni par courriel, notification via l&apos;Extension ou publication sur le site web.
            </LegalSubsection>
            <LegalSubsection title="20.3 Utilisation continue comme acceptation">
              Votre utilisation continue du Service après toute modification constitue l&apos;acceptation des conditions modifiées. Si vous n&apos;acceptez pas les conditions modifiées, vous devez cesser d&apos;utiliser le Service et désinstaller l&apos;Extension et le Wrapper CLI.
            </LegalSubsection>
          </LegalSection>
        """),
    21: (
        """\
<LegalSection id={21} title={titles[21] ?? ""}>
            <LegalSubsection title="21.1 Intégralité de l&apos;accord">
              Le présent Accord constitue l&apos;intégralité de l&apos;accord entre vous et SpinShare concernant le Service et remplace tous les accords, ententes et déclarations antérieurs.
            </LegalSubsection>
            <LegalSubsection title="21.2 Divisibilité">
              Si une disposition du présent Accord est jugée invalide ou inapplicable, les dispositions restantes continueront de produire leurs effets intégralement, et la disposition invalide sera modifiée dans la mesure minimale nécessaire pour la rendre applicable.
            </LegalSubsection>
            <LegalSubsection title="21.3 Renonciation">
              Aucune renonciation à une disposition ne sera effective sans être signée par écrit par la partie renonçante. Le défaut d&apos;exercer un droit ne constitue pas une renonciation à son exercice futur.
            </LegalSubsection>
            <LegalSubsection title="21.4 Cession">
              Vous ne pouvez pas céder le présent Accord sans consentement écrit préalable. SpinShare peut céder le présent Accord dans le cadre d&apos;une fusion, acquisition ou vente d&apos;actifs.
            </LegalSubsection>
            <LegalSubsection title="21.5 Force majeure">
              SpinShare ne sera pas responsable d&apos;un manquement ou d&apos;un retard d&apos;exécution dû à des causes indépendantes de sa volonté raisonnable, y compris les cas de force majeure, la guerre, le terrorisme, les émeutes, les embargos, les actes des autorités civiles ou militaires, les incendies, les inondations, les accidents, les grèves, ou les pénuries de transport, d&apos;installations, de carburant, d&apos;énergie, de main-d&apos;œuvre ou de matériaux.
            </LegalSubsection>
            <LegalSubsection title="21.6 Titres">
              Les titres de section sont fournis uniquement pour des raisons de commodité et n&apos;ont aucun effet juridique.
            </LegalSubsection>
            <LegalSubsection title="21.7 Notifications">
              Les notifications à SpinShare doivent être envoyées à l&apos;adresse courriel indiquée à la Section 22. Les notifications aux utilisateurs peuvent être envoyées à l&apos;adresse courriel associée au compte ou publiées sur le site web.
            </LegalSubsection>
            <LegalSubsection title="21.8 Conformité à l&apos;exportation">
              Vous déclarez ne pas être situé dans un pays soumis à un embargo américain ou autre embargo applicable, ou désigné comme pays « soutenant le terrorisme », et ne pas figurer sur une liste de parties interdites ou restreintes d&apos;un gouvernement américain ou autre gouvernement applicable.
            </LegalSubsection>
            <LegalSubsection title="21.9 Communications électroniques">
              En utilisant le Service, vous consentez à recevoir des communications électroniques de SpinShare. Vous acceptez que tous les accords, avis, divulgations et autres communications fournis électroniquement satisfont à toute exigence légale de communication écrite.
            </LegalSubsection>
            <LegalSubsection title="21.10 Absence de relation d&apos;agence">
              Aucune relation d&apos;agence, de partenariat, de coentreprise ou d&apos;emploi n&apos;est créée par le présent Accord.
            </LegalSubsection>
          </LegalSection>
        """),
    22: (
        """\
<LegalSection id={22} title={titles[22] ?? ""}>
            <p>
              Si vous avez des questions, des préoccupations ou des demandes concernant le présent Accord ou le Service, veuillez nous contacter :
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-slate-900">Courriel :</strong>{" "}
                <a
                  href="mailto:support@learnx.pro"
                  className="font-bold text-emerald-700 underline-offset-2 hover:underline"
                >
                  support@learnx.pro
                </a>
              </li>
              <li>
                <strong className="text-slate-900">Site web :</strong>{" "}
                spinshare-web-vert.vercel.app
              </li>
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              © 2026 spinshare-web-vert.vercel.app. Tous droits réservés.
            </p>
          </LegalSection>
        """),
}

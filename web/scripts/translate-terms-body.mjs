/**
 * Applies locale-specific string replacements to terms/zh.tsx and terms/fr.tsx.
 * Run after copying en.tsx: node scripts/translate-terms-body.mjs
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join("src", "lib", "i18n", "legal", "terms");

/** @type {Record<string, [string, string][]>} */
const REPLACEMENTS = {
  zh: [
    [
      "These Terms of Service (&ldquo;Agreement&rdquo;) constitute a legally binding",
      "本服务条款（「协议」）构成您（「您」或「用户」）与 spinshare.dev（「SpinShare」、「我们」）之间具有法律约束力的协议，规范您对 SpinShare 平台、Visual Studio Code（VS Code）插件、IDE 插件、命令行（CLI）包装器及相关服务（统称「服务」）的访问与使用。",
    ],
    [
      "BY INSTALLING SPINSHARE, CREATING AN ACCOUNT, ACCESSING OUR WEBSITE, OR",
      "安装 SPINSHARE、创建账户、访问我们的网站或以任何方式使用服务，即表示您已阅读、理解并同意受本协议约束。若您不同意全部条款，请立即停止使用服务并卸载插件与 CLI 包装器。",
    ],
    [
      "The following terms shall have the meanings set forth below:",
      "下列术语具有如下含义：",
    ],
    ["General Requirements", "一般要求"],
    ["Employer Authorization", "雇主授权"],
    ["Geographic Restrictions", "地域限制"],
    ["Account Limitations", "账户限制"],
    ["Overview", "概述"],
    ["For Earning Users", "面向收益用户"],
    ["For Advertisers", "面向广告主"],
    ["No Guarantee of Availability", "不保证可用性"],
    ["Account Creation", "账户创建"],
    ["Account Security", "账户安全"],
    ["Account Ownership", "账户归属"],
    ["Know Your Business (Advertisers)", "了解您的业务（广告主）"],
    ["Earnings Accrual", "收益累计"],
    ["Qualifying Impressions", "合格展示"],
    ["Usage Caps", "使用上限"],
    ["Revenue Split Adjustments", "分成比例调整"],
    ["Payout Mechanics", "提现机制"],
    ["Payout Holds and Corrections", "提现冻结与更正"],
    ["Forfeiture", "没收"],
    ["Contact Information", "联系信息"],
    ["All rights reserved.", "保留所有权利。"],
  ],
  fr: [
    [
      "These Terms of Service (&ldquo;Agreement&rdquo;) constitute a legally binding",
      "Les présentes conditions d&apos;utilisation (« Accord ») constituent un contrat juridiquement contraignant entre vous (« vous » ou « Utilisateur ») et spinshare.dev (« SpinShare », « nous »), régissant votre accès et votre utilisation de la plateforme SpinShare, de l&apos;extension VS Code, du plugin IDE, du wrapper CLI et des services associés (collectivement, le « Service »).",
    ],
    [
      "BY INSTALLING SPINSHARE, CREATING AN ACCOUNT, ACCESSING OUR WEBSITE, OR",
      "EN INSTALLANT SPINSHARE, EN CRÉANT UN COMPTE, EN ACCÉDANT À NOTRE SITE OU EN UTILISANT LE SERVICE DE QUELQUE MANIÈRE QUE CE SOIT, VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ D&apos;ÊTRE LIÉ PAR LE PRÉSENT ACCORD. SI VOUS N&apos;ACCEPTEZ PAS TOUTES LES CONDITIONS, CESSER IMMÉDIATEMENT D&apos;UTILISER LE SERVICE ET DÉSINSTALLEZ L&apos;EXTENSION ET LE WRAPPER CLI.",
    ],
    [
      "The following terms shall have the meanings set forth below:",
      "Les termes suivants ont la signification indiquée ci-dessous :",
    ],
    ["General Requirements", "Exigences générales"],
    ["Employer Authorization", "Autorisation de l&apos;employeur"],
    ["Geographic Restrictions", "Restrictions géographiques"],
    ["Account Limitations", "Limitations de compte"],
    ["Overview", "Aperçu"],
    ["For Earning Users", "Pour les utilisateurs rémunérés"],
    ["For Advertisers", "Pour les annonceurs"],
    ["No Guarantee of Availability", "Aucune garantie de disponibilité"],
    ["Account Creation", "Création de compte"],
    ["Account Security", "Sécurité du compte"],
    ["Account Ownership", "Propriété du compte"],
    ["Know Your Business (Advertisers)", "Connaissance de votre entreprise (annonceurs)"],
    ["Earnings Accrual", "Accumulation des gains"],
    ["Qualifying Impressions", "Impressions éligibles"],
    ["Usage Caps", "Plafonds d&apos;utilisation"],
    ["Revenue Split Adjustments", "Ajustements du partage des revenus"],
    ["Payout Mechanics", "Mécanismes de paiement"],
    ["Payout Holds and Corrections", "Retenues et corrections de paiement"],
    ["Forfeiture", "Déchéance"],
    ["Contact Information", "Coordonnées"],
    ["All rights reserved.", "Tous droits réservés."],
  ],
};

for (const locale of ["zh", "fr"]) {
  const file = path.join(dir, `${locale}.tsx`);
  let text = fs.readFileSync(file, "utf8");
  for (const [from, to] of REPLACEMENTS[locale]) {
    text = text.split(from).join(to);
  }
  fs.writeFileSync(file, text);
  console.log(`Patched ${locale}.tsx`);
}

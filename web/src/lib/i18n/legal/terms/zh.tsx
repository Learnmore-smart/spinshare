import type { Dictionary } from "@/lib/i18n/types";
import { LegalSection, LegalSubsection, codeClass } from "../shared";

export function TermsBodyZh({ titles }: { titles: Dictionary["terms"]["sectionTitles"] }) {
  return (
    <>
          <LegalSection id={1} title={titles[1] ?? ""}>
            <p>
              本服务条款（「协议」）构成您（「您」「您的」或「用户」）与 spinshare-web-vert.vercel.app（「SpinShare」「我们」或「我方」）之间具有法律约束力的协议，规范您对 SpinShare 平台、Visual Studio Code（VS Code）插件、IDE 插件、命令行（CLI）包装器及相关服务（统称「服务」）的访问与使用。
            </p>
            <p>
              通过安装 SPINSHARE、创建账户、访问我们的网站或以任何方式使用服务，您确认已阅读、理解并同意受本协议约束。若您不同意全部条款与条件，必须立即停止使用服务并卸载插件与 CLI 包装器。
            </p>
            <p>
              本协议适用于服务的所有用户，包括：（i）使用 SpinShare 在 AI 等待期间展示广告以获取报酬的终端用户（「收益用户」）；（ii）通过我们平台购买广告库存的广告主（「广告主」）；以及（iii）访问我们网站或使用我们服务的所有其他访客。
            </p>
            <p>
              若您代表组织、实体或雇主使用服务，您声明并保证您有权使该组织受本协议约束，且对「您」的提及应同时包括个人与组织。
            </p>
          </LegalSection>
        

          <LegalSection id={2} title={titles[2] ?? ""}>
            <p>下列术语具有如下含义：</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-slate-900">「广告内容」</strong>或{" "}
                <strong className="text-slate-900">「广告素材」</strong>指广告主为通过服务展示而提交的任何文本、图像、图形、链接、代码或其他材料。
              </li>
              <li>
                <strong className="text-slate-900">「AI 等待状态」</strong>或{" "}
                <strong className="text-slate-900">「等待状态」</strong>指 AI 编程助手（如 Anthropic 的 Claude Code 或类似产品）正在处理、推理或生成回复的期间，在此期间 SpinShare 客户端以赞助内容替代加载 spinner 或进度指示器。
              </li>
              <li>
                <strong className="text-slate-900">「竞价」</strong>指广告主为在展示队列中获得投放优先权而竞争的实时出价系统。
              </li>
              <li>
                <strong className="text-slate-900">「出价」</strong>指广告主为其活动愿意支付的最高千次展示成本（CPM）。
              </li>
              <li>
                <strong className="text-slate-900">「活动」</strong>指广告主创建的记录，包含广告文案、最高 CPM 出价及剩余预算。
              </li>
              <li>
                <strong className="text-slate-900">「CPM」</strong>指千次展示成本（Cost Per Mille）&mdash; 广告主同意每 1,000 次展示支付的价格，以美元计价。
              </li>
              <li>
                <strong className="text-slate-900">「点击」</strong>指用户与广告进行肯定性交互并触发导航至广告主指定目标 URL 的事件。
              </li>
              <li>
                <strong className="text-slate-900">「Claude Code」</strong>指 Anthropic, PBC 开发并运营的 AI 编程助手产品，无论通过 Visual Studio Code 插件、终端 CLI 或其他界面访问。
              </li>
              <li>
                <strong className="text-slate-900">「收益」</strong>或{" "}
                <strong className="text-slate-900">「用户收益」</strong>指收益用户基于合格展示与点击累计的报酬，按用户在其 AI 等待期间展示广告所产生收入中应得份额计算。
              </li>
              <li>
                <strong className="text-slate-900">「插件」</strong>指用户安装的 SpinShare Visual Studio Code（VS Code）插件、IDE 插件或其他编辑器插件，以启用服务。
              </li>
              <li>
                <strong className="text-slate-900">「CLI 包装器」</strong>指{" "}
                <code className={codeClass}>spinshare</code>（或其后续版本）NPM 包，将目标 CLI 作为子进程启动、拦截 spinner 输出，并在单行更新中注入广告。
              </li>
              <li>
                <strong className="text-slate-900">「展示」</strong>指在 AI 等待状态内展示广告的一次实例。
              </li>
              <li>
                <strong className="text-slate-900">「账本」</strong>指 SpinShare 维护的内部会计记录，跟踪各用户或广告主账户的展示、点击、收益与付款。
              </li>
              <li>
                <strong className="text-slate-900">「付款门槛」</strong>指用户账户在发起付款前所需的最低余额，由 SpinShare 自行决定。
              </li>
              <li>
                <strong className="text-slate-900">「平台」</strong>指插件或 CLI 包装器运行的底层 IDE、代码编辑器或终端环境（如 Visual Studio Code）。
              </li>
              <li>
                <strong className="text-slate-900">「收入分成」</strong>指 SpinShare 与收益用户之间净广告收入的分成比例，目前为收益用户获得百分之六十（60%）、SpinShare 保留百分之四十（40%），但可按第 6.4 节所述调整。
              </li>
              <li>
                <strong className="text-slate-900">「速率限制」</strong>指用于反欺诈执行的每位开发者每分钟三十（30）次展示的上限。
              </li>
            </ul>
          </LegalSection>
        

          <LegalSection id={3} title={titles[3] ?? ""}>
            <LegalSubsection title="3.1 一般要求">
              您须年满十八（18）周岁且具备订立有约束力合同的能力方可使用服务。使用服务即表示您声明并保证符合上述要求，且您提供的所有信息准确、完整且为最新。
            </LegalSubsection>
            <LegalSubsection title="3.2 雇主授权">
              若您在雇主、组织或其他第三方拥有或控制的设备上安装或使用服务，您声明并保证：（i）您已获得该实体的一切必要授权，以安装会修改 IDE 或终端行为并展示第三方广告的软件；且（ii）您使用服务不违反任何雇佣协议、公司政策、行为准则或适用法律。
            </LegalSubsection>
            <LegalSubsection title="3.3 地域限制">
              服务仅向位于服务及其运营合法之司法管辖区的用户提供。我们保留随时限制任何司法管辖区访问服务的权利。您须自行负责遵守所有适用的当地法律、规则与法规。
            </LegalSubsection>
            <LegalSubsection title="3.4 账户限制">
              每位自然人仅可维护一个（1）收益用户账户。单人创建多个账户、使用自动化系统创建账户，或与他人串通规避账户限制，均构成对本协议的重大违约。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={4} title={titles[4] ?? ""}>
            <LegalSubsection title="4.1 概述">
              SpinShare 运营广告交易市场，在受支持开发环境中 AI 等待状态期间出现的加载 spinner、状态行文本与进度指示器位置展示赞助内容。服务在受支持 AI 编程代理与 CLI 的处理间隔内，以赞助信息替代、修补或覆盖其默认进度 UI。
            </LegalSubsection>
            <LegalSubsection title="4.2 收益用户">
              安装插件或 CLI 包装器并完成账户注册后，收益用户将在 Claude Code、Codex 及其他受支持 AI 助手等待状态期间，看到赞助内容替代或补充默认 spinner 或进度文本。收益用户基于合格展示与点击累计积分，默认将可归因净广告收入的约百分之六十（60%）计入其账户，但须受速率限制、收入分成及本文其他条件约束。收益按月支付，须满足付款门槛及本文其他条件。
            </LegalSubsection>
            <LegalSubsection title="4.3 广告主">
              广告主创建活动，在实时竞价中相互竞争投放优先权。具有最高有效最高 CPM 出价的活动赢得广告位；平局时按创建时间最早、活动标识符最小依次决胜。所有金额一经对应展示或点击投放即不可退款且视为已消耗。当前费率与参数在出价时于广告主控制台显示，SpinShare 可随时调整该机制。
            </LegalSubsection>
            <LegalSubsection title="4.4 不保证可用性">
              我们不保证服务始终可用、展示持续投放或达到任何最低收益水平。服务依赖第三方平台（包括 Visual Studio Code、Claude Code 及 Anthropic 服务）的使用与正常运行时间，这些均不在我们控制范围内。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={5} title={titles[5] ?? ""}>
            <LegalSubsection title="5.1 账户创建">
              参与收益计划或广告计划，您须通过受支持的身份提供商（目前为 Google 或 GitHub）登录创建账户。您同意保持所提供资料信息的准确性，并在变更时及时更新。您须对账户凭证保密及账户下发生的一切活动负责。
            </LegalSubsection>
            <LegalSubsection title="5.2 账户安全">
              您同意：（i）保持身份提供商账户安全，使用强且唯一的密码，并在可用时启用多因素认证；（ii）不与任何第三方共享账户凭证；及（iii）在发现账户未经授权使用或任何其他安全漏洞时立即通知我们。因您未遵守上述义务所致的任何损失或损害，我们概不负责。
            </LegalSubsection>
            <LegalSubsection title="5.3 账户所有权">
              账户属于注册用户个人，未经我们事先书面同意不得转让、出售或让与任何第三方。未经授权试图转让账户将导致立即终止并没收全部未付收益。
            </LegalSubsection>
            <LegalSubsection title="5.4 了解您的业务（广告主）">
              广告主可能被要求提供额外验证信息，包括但不限于：商业登记文件（如适用）、税务识别号、支付方式验证及代表身份证明。未能提供所要求文件可能导致账户暂停或广告活动被拒。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={6} title={titles[6] ?? ""}>
            <LegalSubsection title="6.1 收益累计">
              收益用户基于以下情况累计积分：（i）在其已认证设备上 AI 等待状态期间展示的合格广告展示；及（ii）对此类广告的合格点击。当前收入分成为用户展示与点击可归因的每次展示收入（即活动 CPM 除以 1,000）的百分之六十（60%），但须受速率限制、收入分成及本文其他条款约束。
            </LegalSubsection>
            <LegalSubsection title="6.2 合格展示">
              展示仅在以下情况下计入收益：（i）广告在已认证设备上的活跃 AI 等待状态期间展示；（ii）插件或 CLI 包装器已正确安装、认证并连接至我们的服务器；（iii）展示由真实、人工发起的 AI 编程请求产生（非自动化、脚本化或人为生成）；（iv）用户未超过速率限制或任何其他适用上限；及（v）展示未被我们的欺诈检测系统排除。对合格主张的拒绝可按本协议第 17 节要求申诉或争议。
            </LegalSubsection>
            <LegalSubsection title="6.3 使用上限">
              SpinShare 保留自行决定且无需事先通知而设立、修改或执行每日、每周、每月、每分钟或其他周期上限的权利，包括：（a）每用户合格展示次数；（b）每用户合格点击次数；（c）给定期间可累计的收益金额；及（d）产生可计费展示的 AI 等待状态次数。当前每分钟上限为第 2 节定义的速率限制。超过任何适用上限的活动不可计费且不产生收益。我们可全球、按地区、按账户层级或对个人施加上限。
            </LegalSubsection>
            <LegalSubsection title="6.4 收入分成调整">
              SpinShare 保留在合理通知后（可包括在网站或通过插件发布通知）随时调整收入分成、每次展示费率、每次点击费率、竞价底价及付款时间表的权利。收入条款变更仅向前适用，不影响变更时已累计的收益。
            </LegalSubsection>
            <LegalSubsection title="6.5 付款机制">
              累计收益保留在账户余额中直至拨付。账户启用付款后，收益按月拨付（约每月首日），但须账户余额超过当时付款门槛（目前为 10.00 美元，可变更）。付款通过 Stripe Connect 或 SpinShare 选定的其他支付方式完成。用户须提供准确的付款信息，并承担收款相关的全部税费、费用及监管义务。收益用户须完成 Stripe Connect 入驻，并按处理器要求提供税务文件（如 IRS Form W-9 或 W-8）方可收款。
            </LegalSubsection>
            <LegalSubsection title="6.6 付款暂扣与更正">
              所有收益余额均为估计值，可能更正、对账与审计。SpinShare 保留以下权利：（i）在欺诈审查或调查期间暂扣付款；（ii）扣除与欺诈、无效或撤销交易相关的金额；（iii）从未来收益中追回多付金额，必要时通过直接付款要求追回；及（iv）在账户因疑似违反本协议正在接受调查、向该账户付款将造成制裁、监管或其他合规风险，或向该账户付款在其他方面违法时拒绝付款。
            </LegalSubsection>
            <LegalSubsection title="6.7 没收">
              因任何原因终止账户（无论由用户还是 SpinShare 发起），低于付款门槛的未付收益将被没收。若因违反本协议而终止，无论余额多少，全部未付收益均被没收。收益用户对待付或已累计收益在实际拨付前不享有财产权益。
            </LegalSubsection>
            <LegalSubsection title="6.8 税务分类与申报义务">
              <LegalSubsection title="6.8.1 付款性质">
                向收益用户支付的款项代表通过用户经许可使用 SpinShare 插件或 CLI 包装器展示第三方广告所产生的收入分成分配。SpinShare 不将此类付款定性为工资、薪金或服务报酬。用户确认其并非 SpinShare 的雇员、独立承包商或代理人。此类付款的税务分类（例如版税收入、其他收入或自雇收入）取决于用户个人情形及适用法律。
              </LegalSubsection>
              <LegalSubsection title="6.8.2 美国税务申报 — Form 1099-MISC">
                对于美国人士（按 IRS 定义）且在一个日历年内收到合计六百美元（$600）或以上付款的收益用户，我们的第三方支付处理器 Stripe Connect 将申报 IRS Form 1099-MISC（或适用的其他信息申报表），在 Box 3（其他收入）中报告该等金额。支付处理器将在法律要求的截止日前（通常为次年 1 月 31 日）向每位受影响收益用户提供相应表格。税务文件可通过支付处理器以电子方式送达，但须用户在付款账户设置时同意电子送达。若适用法律或 IRS 指引要求，支付处理器可调整适用的申报类别或表格。
              </LegalSubsection>
              <LegalSubsection title="6.8.3 不签发 1099-NEC 或预扣">
                SpinShare 不签发 Form 1099-NEC（非雇员报酬），除第 6.8.6 节规定外，不会将付款视为须备用预扣的对象。用户确认 SpinShare 为申报目的所作分类不决定付款的最终税务处理，用户须自行对其纳税申报中的正确归类负责。
              </LegalSubsection>
              <LegalSubsection title="6.8.4 税务信息收集 — Form W-9">
                作为 Stripe Connect 入驻的一部分，且在任何付款处理之前，美国人士收益用户须向支付处理器完成并提交 IRS Form W-9（纳税人识别号与认证申请表）。在处理器提出请求后三十（30）日内未提供有效 W-9，将导致付款暂时暂停直至收到表格。
              </LegalSubsection>
              <LegalSubsection title="6.8.5 国际用户 — Form W-8BEN / W-8ECI">
                作为 Stripe Connect 入驻的一部分，非美国人士收益用户须完成 IRS Form W-8BEN（受益所有人外国身份证明）或 Form W-8ECI（与在美国境内贸易或业务实质相关所得预扣豁免的外国人士证明），视情况而定。从美国来源收款的外国人士，除非适用美国与其居住国之间的所得税条约规定的减免税率，否则其总付款可能须按最高百分之三十（30%）的税率预扣。除非处理器存档有声称条约利益的有效 W-8BEN，否则支付处理器将按适用法定税率预扣。用户须负责提供准确的条约主张信息并了解其本国的税务义务。
              </LegalSubsection>
              <LegalSubsection title="6.8.6 备用预扣">
                根据 IRC 第 3406 节，我们的第三方支付处理器须对以下收款人可申报付款按百分之二十四（24%）的税率实施备用预扣：（i）未提供有效纳税人识别号（TIN）者；（ii）已被 IRS 通知未报告全部利息或股息者；或（iii）提供了错误 TIN 者。若支付处理器收到 IRS 要求对某用户账户实施备用预扣的通知，该用户此后所有付款均须受备用预扣，直至 IRS 发出停止通知或用户提供更正后的 W-9。
              </LegalSubsection>
              <LegalSubsection title="6.8.7 用户税务义务">
                无论 SpinShare 是否签发信息申报表，通过服务收到的所有分配在《国内税收法典》（及外国同等法律）下均构成收款人的总收入，用户须自行负责：（i）在适用纳税申报表上报告全部付款；（ii）缴纳所有适用的联邦、州、地方及外国所得税；（iii）若用户活动构成贸易或业务，缴纳自雇税；（iv）在需要时缴纳预估税；及（v）保存足以佐证收入及任何所主张扣除的记录。
              </LegalSubsection>
              <LegalSubsection title="6.8.8 不提供税务建议">
                本协议或 SpinShare 网站上的任何内容均不构成税务、法律或会计建议。强烈建议用户就通过服务收到付款的定性及申报咨询其税务顾问。SpinShare 对用户采取（或未采取）的任何税务立场概不负责。
              </LegalSubsection>
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={7} title={titles[7] ?? ""}>
            <LegalSubsection title="7.1 活动创建与出价">
              广告主可通过我们平台提交广告内容及最高 CPM 出价创建活动。具有最高有效最高 CPM 出价的活动赢得每个广告位；平局按创建时间最早、活动标识符最小依次决胜。广告主可随时提高出价以改善投放优先权。
            </LegalSubsection>
            <LegalSubsection title="7.2 出价不可退款">
              展示一旦投放，所有出价均为最终且不可退款。广告主确认出价代表对已投放展示的具有约束力的付款承诺。尽管如此，SpinShare 可自行决定对系统认定未按活动参数投放的展示发放积分。
            </LegalSubsection>
            <LegalSubsection title="7.3 广告内容要求">
              广告主保证并声明所有广告内容：（i）遵守所有适用法律、法规及行业标准；（ii）不侵犯任何知识产权；（iii）不虚假、误导、欺骗或诽谤；（iv）不推广非法产品、服务或活动；（v）不含恶意软件、钓鱼链接或其他有害代码；及（vi）遵守本协议内容要求，包括第 7.4 节。
            </LegalSubsection>
            <LegalSubsection title="7.4 内容禁止">
              不限于下列情形，广告内容不得：在禁止地区推广赌博；违反法律推广酒精、烟草或管制物质；包含成人内容、仇恨言论或歧视性材料；作出未经证实的健康或财务主张；冒充 SpinShare 或任何第三方；或侵犯任何个人或实体的知识产权、隐私或公开权。
            </LegalSubsection>
            <LegalSubsection title="7.5 拒绝或移除的权利">
              SpinShare 保留自行决定且不承担责任的权利，以任何理由或无理由拒绝、移除或暂停任何广告内容或活动，包括但不限于违反本协议、用户投诉或品牌安全顾虑。除非 SpinShare 自行认定移除有误，否则不对已移除活动退款或积分。广告主可在三十（30）日内联系 support@learnx.pro 对移除或暂停提出申诉。SpinShare 将审查申诉，若认定行为有误，将恢复活动及/或发放积分。所有申诉决定均为最终。
            </LegalSubsection>
            <LegalSubsection title="7.6 广告主就内容之赔偿">
              广告主明确向 SpinShare 赔偿并使其免受因以下事项产生或与之相关的任何及全部索赔、损害、损失与费用（包括合理律师费）：（i）广告内容的内容、准确性或合法性；（ii）所推广的产品或服务；（iii）广告所链接的目标网站或落地页；及（iv）广告主的任何虚假陈述或违反保证。
            </LegalSubsection>
            <LegalSubsection title="7.7 点击计费">
              若活动对点击单独计费，每次点击价格为活动有效每次展示价格的倍数。该倍数不固定，SpinShare 可随时调整；当前费率在广告主控制台显示。「点击」在用户以启动导航至广告主指定 URL 的方式与广告进行肯定性交互时记录。SpinShare 对转化率、投资回报或广告活动的业务结果不作任何陈述或保证。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={8} title={titles[8] ?? ""}>
            <LegalSubsection title="8.1 广告主付款义务">
              广告主同意支付与其账户相关的全部费用，包括所有已投放展示与已记录点击。付款须按活动设置时选择的计费条款支付（通常为通过 Stripe Checkout 预付活动预算，展示投放时扣除）。未能支付未结余额可能导致账户暂停、活动终止及转交催收。
            </LegalSubsection>
            <LegalSubsection title="8.2 支付方式">
              SpinShare 通过我们的第三方支付处理器 Stripe, Inc. 运营的 Stripe Checkout 接受付款。提供付款信息即表示您声明并保证您有权使用指定支付方式。您授权我们就产生的全部费用向您的支付方式扣款。
            </LegalSubsection>
            <LegalSubsection title="8.3 逾期付款">
              到期日未收到的付款，未结余额须按月支付 2.5% 的滞纳金（或法律允许的较低上限）。SpinShare 保留对持续未付款暂停全部活动并终止账户的权利。
            </LegalSubsection>
            <LegalSubsection title="8.4 退单与争议">
              广告主须在扣款日起三十（30）日内书面通知 SpinShare 任何计费争议。无争议部分须及时支付。在未先尝试与 SpinShare 解决问题的情况下发起退单或付款争议，构成对本协议的重大违约，可能导致账户立即冻结或终止。
            </LegalSubsection>
            <LegalSubsection title="8.5 用户付款条款">
              收益用户可通过联系 support@learnx.pro，或在可用时通过账户设置界面，请求删除账户并拨付累计收益（须满足付款门槛）。付款请求在三十（30）个工作日内处理。我们保留在欺诈审查或付款信息验证完成前延迟付款的权利。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={9} title={titles[9] ?? ""}>
            <LegalSubsection title="9.1 严禁欺诈">
              <p>
                SpinShare 对欺诈、滥用与操纵采取零容忍政策。下列活动严格禁止并构成对本协议的重大违约：
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-slate-900">点击欺诈。</strong>任何试图产生人工点击的行为，包括但不限于：自动点击脚本、点击农场、付费点击计划、协调点击网络，或任何旨在人为抬高点击次数的机制。
                </li>
                <li>
                  <strong className="text-slate-900">展示操纵。</strong>{" "}
                  任何试图产生人工展示的行为，包括：使用自动化工具触发 AI 等待状态、仅为产生广告浏览而运行无意义或重复提示、对 IDE 或终端交互进行机器人或脚本操作，或与他人串通抬高展示次数。
                </li>
                <li>
                  <strong className="text-slate-900">规避速率限制。</strong>{" "}
                  任何试图绕过速率限制或其他速率上限的行为，包括通过共享凭证、多账户使用或协调活动。
                </li>
                <li>
                  <strong className="text-slate-900">多账户滥用。</strong>{" "}
                  单人创建或使用多个账户、与他人协调运营账户网络，或跨多用户共享凭证以汇总收益。
                </li>
                <li>
                  <strong className="text-slate-900">指标操纵。</strong>{" "}
                  任何试图干扰、篡改或伪造遥测数据、展示次数、点击事件或用于计算收益或广告费用的任何其他指标的行为。
                </li>
                <li>
                  <strong className="text-slate-900">逆向工程。</strong>{" "}
                  任何试图反编译、反汇编、逆向工程或以其他方式从插件或 CLI 包装器推导源代码的行为；或拦截、修改或伪造客户端与 SpinShare 服务器之间的通信，但适用开源许可证允许的情形除外。
                </li>
                <li>
                  <strong className="text-slate-900">规避控制。</strong>{" "}
                  任何试图规避 SpinShare 实施的使用上限、地域限制、账户限制或其他技术或政策控制的行为。
                </li>
              </ul>
            </LegalSubsection>
            <LegalSubsection title="9.2 检测与调查">
              SpinShare 可采用自动化系统与人工审查流程检测欺诈或滥用活动。这些系统分析包括但不限于：提示频率、会话时长、点击时间、账户关系及行为异常等模式。用户确认并同意其服务使用将出于防欺诈目的受到监控。
            </LegalSubsection>
            <LegalSubsection title="9.3 执法措施">
              在检测到或合理怀疑欺诈或滥用时，SpinShare 可自行决定且无需事先通知：（i）暂停或终止受影响账户；（ii）作废与欺诈活动相关的全部或部分账本记录；（iii）暂扣或撤销待付付款；（iv）追回此前为欺诈活动已支付的款项，包括从未来收益中抵扣或启动直接催收程序；（v）永久禁止用户使用服务；及（vi）将事项转交执法或监管机构。
            </LegalSubsection>
            <LegalSubsection title="9.4 举证责任">
              在有关展示、点击或收益合法性的任何争议中，SpinShare 基于其内部记录与检测系统作出的认定应被推定为有效。用户须以明确且有说服力的证据证明争议活动合法。
            </LegalSubsection>
            <LegalSubsection title="9.5 追回权利">
              若在付款发生后检测到欺诈活动，SpinShare 保留追回已付款项的权利。追回方式包括：从未来收益中扣除；向用户登记的支付方式（如有存档）发起退单；直接付款要求；及转交催收。用户接受本协议即同意此类追回方式。
            </LegalSubsection>
            <LegalSubsection title="9.6 善意多付">
              若 SpinShare 认定因技术错误、系统故障或计算失误（与用户不当行为无关）导致收益被高估，我们保留更正账本并追回多付金额的权利，但此类更正须在多付后九十（90）日内完成。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={10} title={titles[10] ?? ""}>
            <LegalSubsection title="10.1 数据收集范围">
              SpinShare 仅收集和处理计入收益、向广告主计费、防止欺诈以及运营和改进服务所必需的数据。每次投放广告时，我们记录事件遥测，包括：事件类型（例如展示渲染、展示可见、观看时长 tick 及点击）；相关广告、活动与创意标识符；广告展示界面（例如 spinner、状态行、进度通知或 overlay）；屏幕可见性指标（如可见百分比与可见时长）；每次安装的客户端标识符；用于去重与对账的每次事件标识符（UUID）；时间戳；客户端版本与宿主应用版本（例如 SpinShare、Claude Code 或 Visual Studio Code 版本）；以及对于已登录收益用户，用于归属积分的账户标识符。我们还在短暂基础上处理您的互联网协议（IP）地址，用于限流、滥用检测与防欺诈。
            </LegalSubsection>
            <LegalSubsection title="10.2 我们不收集的内容">
              SpinShare 不会且将来也不会收集、访问、处理或存储：（i）您提交给 AI 编程助手的代码、提示词或查询内容；（ii）AI 回复、生成代码或模型输出；（iii）您的上下文窗口、对话历史、文件或项目内容；（iv）超出账户创建、付款处理、税务合规与防欺诈所必需的个人信息的其他个人信息；或（v）任何可能泄露您商业秘密、专有源代码或机密商业信息的数据。
            </LegalSubsection>
            <LegalSubsection title="10.3 可计费遥测">
              参与收益计划须同意可计费遥测收集。该遥测严格限于第 10.1 节所述的假名化指标，且为计入收益与检测欺诈所必需。撤回遥测同意将导致收益累计立即停止，但此前已累计的收益（如符合付款条件）仍将拨付。
            </LegalSubsection>
            <LegalSubsection title="10.4 数据保留">
              个人账户数据在账户终止后保留 7 年，或自最后账户活动起保留 7 年，以较长者为准，用于防欺诈、财务对账与法律合规。聚合数据可无限期保留用于分析与服务改进，并在可行或法律要求范围内进行匿名化。
            </LegalSubsection>
            <LegalSubsection title="10.5 数据删除请求">
              用户可通过联系 support@learnx.pro 请求删除其账户及相关个人数据。删除后：（i）个人标识符将在 30 日内移除或匿名化；（ii）源自该账户的聚合匿名数据可予保留；（iii）法律要求的财务记录将按强制规定保留；及（iv）广告主计费对账所需匿名化的展示与点击数据将以不可识别形式保留。
            </LegalSubsection>
            <LegalSubsection title="10.6 第三方处理方">
              SpinShare 使用第三方服务提供商处理付款、分析、托管与客户支持。目前包括 Stripe（付款处理与拨付）、Google Cloud / Firebase（托管、认证与数据存储）、Twilio SendGrid（事务性邮件）及网站使用分析提供商，但提供商可能变更。使用服务即表示您同意在适当数据保护协议下聘用这些子处理方。
            </LegalSubsection>
            <LegalSubsection title="10.7 安全措施">
              SpinShare 采取技术与组织措施，旨在保护所收集数据免遭未经授权的访问、披露、篡改与破坏 &mdash; 包括传输中（TLS）与静态加密、基于最小权限原则的角色访问控制、专用密钥管理（而非明文配置）、日志记录、监控与限流以检测欺诈与滥用，以及定期安全评估。SpinShare 还通过设计限制其暴露范围：如第 10.2 节所述，不收集您的代码、提示词或 AI 交互内容。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={11} title={titles[11] ?? ""}>
            <LegalSubsection title="11.1 插件与 CLI 包装器修改确认">
              用户明确确认并理解，SPINSHARE 插件与 CLI 包装器通过修改、修补或与第三方软件（包括但不限于 ANTHROPIC 的 CLAUDE CODE 插件、VISUAL STUDIO CODE 及目标 CLI 工具）的内部渲染机制集成而运行。此类修改可能涉及：（i）拦截或覆盖 UI 渲染调用；（ii）在等待状态期间替代状态行或 spinner 内容；及（iii）将远程提供的内容注入编辑器或终端界面。
            </LegalSubsection>
            <LegalSubsection title="11.2 第三方服务条款">
              用户安装与使用 SpinShare 插件与 CLI 包装器不应违反 Anthropic、Microsoft（Visual Studio Code）、OpenAI、GitHub 或其他第三方平台的服务条款、最终用户许可协议或可接受使用政策。用户须自行确保使用 SPINSHARE 符合所有适用的第三方条款。SpinShare 不陈述或保证任何第三方平台允许使用插件或 CLI 包装器。
            </LegalSubsection>
            <LegalSubsection title="11.3 平台变更与服务中断">
              第三方平台（包括 Anthropic 与 Microsoft）可随时：（i）修改其软件、API 或插件架构；（ii）实施阻止、禁用或干扰 SpinShare 插件或 CLI 包装器的技术措施；（iii）更新其服务条款以禁止 SpinShare 的运营模式；或（iv）对已安装插件或 CLI 包装器的用户采取执法行动，包括暂停或终止其在第三方平台的账户。
            </LegalSubsection>
            <LegalSubsection title="11.4 无关联关系">
              SpinShare 与 Anthropic、Microsoft、OpenAI、GitHub 或任何其他第三方平台提供商无关联、未获其认可、赞助或与之存在其他关系。对 Claude Code、Visual Studio Code 或其他产品的提及仅为描述目的，不暗示与相应商标所有人存在任何关系。
            </LegalSubsection>
            <LegalSubsection title="11.5 用户自担风险">
              安装并使用插件或 CLI 包装器，即表示您明确承担与第三方平台交互相关的全部风险，包括：（i）您的 Anthropic、Microsoft 或其他平台账户可能被暂停或终止的风险；（ii）数据丢失或服务中断的风险；（iii）插件或 CLI 包装器可能与其他插件、扩展或 IDE 功能冲突的风险；及（iv）客户端与第三方软件交互产生安全漏洞的风险。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={12} title={titles[12] ?? ""}>
            <LegalSubsection title="12.1 用户终止">
              您可随时联系 support@learnx.pro 请求删除以终止账户。终止不免除您在终止前已产生的义务，也不影响依其性质应在终止后继续有效的条款。
            </LegalSubsection>
            <LegalSubsection title="12.2 SpinShare 终止">
              SpinShare 保留自行决定且无需事先通知而暂停或终止任何账户、限制服务访问或向任何用户或广告主停止提供服务的权利，理由包括但不限于：违反本协议；疑似欺诈或滥用；执法或监管机构要求；长期不活跃；或业务终止。
            </LegalSubsection>
            <LegalSubsection title="12.3 有因终止">
              在不限制第 12.2 节的前提下，SpinShare 可在以下情况下立即终止任何账户：（i）重大违反本协议；（ii）检测到欺诈、滥用或操纵；（iii）将服务用于非法目的；（iv）使 SpinShare 承担法律责任的行为；或（v）反复违反可接受使用政策。有因终止导致立即没收全部未付收益并可能承担损害赔偿责任。
            </LegalSubsection>
            <LegalSubsection title="12.4 终止效力">
              终止后：（i）本文授予的一切许可立即终止；（ii）您须停止使用服务并卸载插件与 CLI 包装器；（iii）低于付款门槛的累计收益被没收；（iv）我们可按第 10.5 节删除您的账户数据；及（v）依其性质应在终止后继续有效的任何条款继续有效。
            </LegalSubsection>
            <LegalSubsection title="12.5 无恢复权利">
              被终止用户无权恢复账户。SpinShare 可自行决定允许此前被终止的用户在履行全部未结义务后创建新账户。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={13} title={titles[13] ?? ""}>
            <LegalSubsection title="13.1 SpinShare 所有权">
              服务的一切权利、所有权与利益，包括插件、CLI 包装器、网站、软件、算法、竞价系统、分析、商标、商业外观及所有相关知识产权，均为且将继续为 SpinShare 及其许可方的专有财产。本协议不向用户转让服务或其组成部分的任何所有权权益。
            </LegalSubsection>
            <LegalSubsection title="13.2 用户有限许可">
              在您遵守本协议的前提下，SpinShare 授予您有限、非独占、不可转让、可撤销的许可，以：（i）仅为预期目的安装并使用插件与 CLI 包装器；及（ii）访问并使用网站与平台功能。本许可不允许：修改、分发、衍生作品、逆向工程、反编译或移除专有声明，但覆盖插件或 CLI 包装器的适用开源许可证允许的情形除外。
            </LegalSubsection>
            <LegalSubsection title="13.3 广告主内容许可">
              提交广告内容即表示广告主授予 SpinShare 全球性、非独占、免版税许可，以：（i）通过服务复制、展示与传输广告内容；（ii）仅为技术格式需要而修改广告内容；及（iii）仅在展示广告相关范围内使用广告主的名称与商标。该许可在相关活动结束或账户终止时终止。
            </LegalSubsection>
            <LegalSubsection title="13.4 反馈">
              您就服务提供的任何反馈、建议或想法，SpinShare 可无限制、无补偿或无署名地使用。您特此将此类反馈的一切权利、所有权与利益转让给 SpinShare。
            </LegalSubsection>
            <LegalSubsection title="13.5 开源">
              插件与 CLI 包装器的部分可能以开源许可证发布。本协议任何内容均不限制此类许可证授予您的权利。若本协议与适用开源许可证冲突，就所涵盖代码而言以开源许可证为准。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={14} title={titles[14] ?? ""}>
            <LegalSubsection title="14.1 按「现状」提供服务">
              服务按「现状」及「可用」基础提供，不作任何明示或默示保证。在法律允许的最大范围内，SPINSHARE 否认一切保证，包括但不限于：适销性、特定用途适用性、不侵权、所有权之默示保证，以及因交易过程、履行过程或贸易惯例产生的任何保证。
            </LegalSubsection>
            <LegalSubsection title="14.2 不保证结果">
              SPINSHARE 不保证：（i）服务将满足您的要求或期望；（ii）收益将达到任何特定水平；（iii）广告活动将取得任何业务结果；（iv）服务将不间断、及时、安全或无错误；（v）缺陷将被纠正；或（vi）服务不含病毒或其他有害组件。
            </LegalSubsection>
            <LegalSubsection title="14.3 第三方内容">
              SpinShare 不认可、核实或承担通过服务展示的任何广告内容、目标网站或第三方产品或服务的责任。用户与广告主之间的所有交易仅在该等双方之间进行。
            </LegalSubsection>
            <LegalSubsection title="14.4 插件与 CLI 包装器风险">
              SPINSHARE 不保证插件或 CLI 包装器不会与其他软件、插件、扩展、文件或系统冲突、干扰或造成损害。您承担因安装或使用插件或 CLI 包装器所致数据丢失或系统损害的全部风险。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={15} title={titles[15] ?? ""}>
            <LegalSubsection title="15.1 排除间接损害">
              在法律允许的最大范围内，SPINSHARE、其关联方、高级职员、董事、雇员、代理人、供应商或许可方对任何间接、附带、特殊、后果性、惩罚性或示范性损害概不负责，包括但不限于：利润损失、收入损失、数据丢失、商誉损失、业务中断、计算机损害、系统故障或替代服务成本，无论因本协议或服务使用产生或与之相关，亦无论责任理论为何。
            </LegalSubsection>
            <LegalSubsection title="15.2 责任上限">
              SPINSHARE 因本协议产生或与之相关的总累计责任不得超过以下较高者：（i）您在引发责任的事件发生前十二（12）个月内向 SPINSHARE 支付的金额；或（ii）一百美元（$100.00）。
            </LegalSubsection>
            <LegalSubsection title="15.3 根本目的">
              本节第 15 条规定的责任限制，无论 SPINSHARE 是否已被告知此类损害的可能性，也无论有限救济是否未能达到其根本目的，均适用。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={16} title={titles[16] ?? ""}>
            <LegalSubsection title="16.1 用户赔偿">
              您同意为 SpinShare 及其关联方、高级职员、董事、雇员与代理人辩护、赔偿并使其免受因以下事项产生或与之相关的任何及全部索赔、损害、损失、责任、成本与费用（包括合理律师费）：（i）您使用服务；（ii）您违反本协议或任何第三方条款；（iii）您与雇主或任何第三方就您安装或使用插件或 CLI 包装器产生的争议；（iv）Anthropic、Microsoft 或其他平台提供商因您使用服务提出的任何索赔；及（v）您违反任何适用法律或法规。
            </LegalSubsection>
            <LegalSubsection title="16.2 广告主赔偿">
              广告主同意为 SpinShare 辩护、赔偿并使其免受因以下事项产生或与之相关的任何及全部索赔、损害、损失与费用：（i）广告内容及所推广的产品或服务；（ii）目标网站与落地页；（iii）侵犯知识产权或其他权利；（iv）虚假、误导或欺骗性广告主张；及（v）违反本文任何陈述或保证。
            </LegalSubsection>
            <LegalSubsection title="16.3 赔偿程序">
              SpinShare 将及时通知任何须赔偿的索赔。赔偿方有权控制该索赔的辩护与和解，但 SpinShare 可自行承担费用聘请律师参与。赔偿方不得在未获 SpinShare 事先书面同意的情况下以损害 SpinShare 权利的方式和解任何索赔。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={17} title={titles[17] ?? ""}>
            <LegalSubsection title="17.1 非正式解决">
              在启动任何正式争议解决程序之前，您同意先与 SpinShare 非正式联系以尝试解决争议。双方在收到争议书面通知后至少三十（30）日内应诚意协商。
            </LegalSubsection>
            <LegalSubsection title="17.2 有约束力的仲裁">
              除与知识产权或禁令救济相关的争议外，因本协议产生或与之相关的任何争议应通过由美国仲裁协会（「AAA」）按其商业仲裁规则管理的具有约束力的仲裁解决。仲裁应通过视频会议进行，或如需听证则在双方同意的地点进行。裁决可在有管辖权的任何法院登记执行。
            </LegalSubsection>
            <LegalSubsection title="17.3 集体诉讼弃权">
              您同意任何程序，无论仲裁或诉讼，均仅以个人为基础进行，不得作为集体、合并或代表诉讼进行。您放弃参与集体诉讼、私人检察总长诉讼或集体仲裁的任何权利。
            </LegalSubsection>
            <LegalSubsection title="17.4 陪审团审判弃权">
              在法律允许范围内，双方放弃因本协议产生或与之相关的任何法律程序中进行陪审团审判的任何权利。
            </LegalSubsection>
            <LegalSubsection title="17.5 适用法律">
              本协议应受加利福尼亚州法律管辖并依其解释，不适用其法律冲突原则。
            </LegalSubsection>
            <LegalSubsection title="17.6 禁令救济">
              尽管有上述仲裁规定，任何一方均可在有管辖权的法院寻求禁令或其他衡平救济，以防止在仲裁待决期间发生不可挽回的损害。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={18} title={titles[18] ?? ""}>
            <LegalSubsection title="18.1 范围">
              本节补充隐私政策中的隐私披露，并说明根据您居住地可能适用于您的权利。适用权利取决于您的司法管辖区及我们在相关法律下的义务。
            </LegalSubsection>
            <LegalSubsection title="18.2 加利福尼亚州（CCPA / CPRA）">
              若您为加利福尼亚州居民，您有权：（i）要求披露我们已收集的个人信息类别与具体片段；（ii）要求删除个人信息；（iii）要求更正不准确的个人信息；（iv）选择退出出售或共享个人信息；及（v）不因行使这些权利而受到歧视性待遇。SpinShare 不出售或共享个人信息（按 CCPA 定义）。要行使这些权利，请按第 22 节所列地址联系我们。
            </LegalSubsection>
            <LegalSubsection title="18.3 欧盟与英国（GDPR / UK GDPR）">
              若您在欧盟或英国，我们处理的法律依据包括：履行合同（提供服务并计入收益）、我们的合法利益（运营、保障与改进服务、防止欺诈）及法律义务（税务、会计与合规）。您有权访问、更正、删除、限制或反对处理您的个人数据，以及数据可携带权。您还有权向您所在司法管辖区的监管机构投诉。
            </LegalSubsection>
            <LegalSubsection title="18.4 加拿大（PIPEDA）">
              若您在加拿大，您可根据《个人信息保护与电子文件法》（「PIPEDA」）及适用的省级隐私法要求访问并更正您的个人信息。要行使这些权利，请通过 support@learnx.pro 联系我们。若您对我们的答复不满意，可联系加拿大隐私专员办公室。
            </LegalSubsection>
            <LegalSubsection title="18.5 美国其他州隐私法">
              弗吉尼亚州（VCDPA）、科罗拉多州（CPA）、康涅狄格州（CTDPA）、犹他州（UCPA）及其他具有可比隐私法的美国州居民可能享有额外权利，包括确认我们是否正在处理您的个人信息、访问并更正该信息、获取可携带副本，以及选择退出定向广告或出售个人信息（我们均不进行）。要行使这些法律下的权利，请通过 support@learnx.pro 联系我们。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={19} title={titles[19] ?? ""}>
            <LegalSubsection title="19.1 指定代理人">
              SpinShare 尊重知识产权并遵守 DMCA。若您认为通过服务提供的材料侵犯您的版权，可向我们的指定版权代理人提交通知：{" "}
              <a
                href="mailto:support@learnx.pro"
                className="font-bold text-emerald-700 underline-offset-2 hover:underline"
              >
                support@learnx.pro
              </a>
              。
            </LegalSubsection>
            <LegalSubsection title="19.2 DMCA 通知要求">
              所有 DMCA 通知须包括：（i）版权所有人或授权代理人的物理或电子签名；（ii）声称被侵权的受版权保护作品的标识；（iii）侵权材料及其位置的标识；（iv）联系信息；（v）善意信念声明；及（vi）作伪证处罚下的声明。
            </LegalSubsection>
            <LegalSubsection title="19.3 反通知">
              若您认为您的内容被错误移除，可提交反通知，包括：（i）您的签名；（ii）被移除材料的标识；（iii）作伪证处罚下的声明；（iv）您的联系信息；及（v）同意管辖。
            </LegalSubsection>
            <LegalSubsection title="19.4 重复侵权者">
              SpinShare 将在适当情况下终止重复版权侵权者的账户。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={20} title={titles[20] ?? ""}>
            <LegalSubsection title="20.1 修改权利">
              SpinShare 保留随时修改本协议的权利。除第 20.2 节对重大变更的规定外，变更自修订协议在我们网站或通过插件发布时生效。本协议顶部的「最后更新」日期表明最近一次变更时间。
            </LegalSubsection>
            <LegalSubsection title="20.2 重大变更通知">
              对于以下重大变更：（i）收入分成或收益计算方法；（ii）数据收集做法；（iii）争议解决程序；或（iv）责任限制，我们将在变更生效前至少三十（30）日发出通知。通知可通过电子邮件、插件通知或网站发布提供。
            </LegalSubsection>
            <LegalSubsection title="20.3 继续使用视为接受">
              您在变更后继续使用服务即构成接受修改后的条款。若您不同意修改后的条款，须停止使用并卸载插件与 CLI 包装器。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={21} title={titles[21] ?? ""}>
            <LegalSubsection title="21.1 完整协议">
              本协议构成您与 SpinShare 就服务达成的完整协议，并取代所有先前协议、谅解与陈述。
            </LegalSubsection>
            <LegalSubsection title="21.2 可分割性">
              若本协议任何条款被认定无效或不可执行，其余条款应继续完全有效，无效条款应修改至使其可执行所需的最小程度。
            </LegalSubsection>
            <LegalSubsection title="21.3 弃权">
              任何条款的弃权须以放弃方书面签署方为有效。未能执行任何权利不构成对未来执行的弃权。
            </LegalSubsection>
            <LegalSubsection title="21.4 转让">
              未经事先书面同意，您不得转让本协议。SpinShare 可在合并、收购或资产出售时转让本协议。
            </LegalSubsection>
            <LegalSubsection title="21.5 不可抗力">
              SpinShare 对因超出其合理控制范围的原因导致的履行失败或延迟不承担责任，包括天灾、战争、恐怖主义、骚乱、禁运、民事或军事当局行为、火灾、洪水、事故、罢工，或运输、设施、燃料、能源、劳动力或材料短缺。
            </LegalSubsection>
            <LegalSubsection title="21.6 标题">
              章节标题仅为方便起见，无法律效力。
            </LegalSubsection>
            <LegalSubsection title="21.7 通知">
              给 SpinShare 的通知须发送至第 22 节的电子邮件。给用户的通知可发送至账户关联的电子邮件地址或在网站上发布。
            </LegalSubsection>
            <LegalSubsection title="21.8 出口合规">
              您声明您不位于受美国或其他适用禁运约束的国家，或未被指定为「支持恐怖主义」国家，且未列入任何美国或其他适用政府的禁止或受限方名单。
            </LegalSubsection>
            <LegalSubsection title="21.9 电子通信">
              使用服务即表示您同意接收 SpinShare 的电子通信。您同意以电子方式提供的所有协议、通知、披露及其他通信满足任何书面通信的法律要求。
            </LegalSubsection>
            <LegalSubsection title="21.10 非代理关系">
              本协议不创设代理、合伙、合资或雇佣关系。
            </LegalSubsection>
          </LegalSection>
        

          <LegalSection id={22} title={titles[22] ?? ""}>
            <p>
              若您对本协议或服务有任何问题、顾虑或请求，请联系我们：
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-slate-900">电子邮件：</strong>{" "}
                <a
                  href="mailto:support@learnx.pro"
                  className="font-bold text-emerald-700 underline-offset-2 hover:underline"
                >
                  support@learnx.pro
                </a>
              </li>
              <li>
                <strong className="text-slate-900">网站：</strong>{" "}
                spinshare-web-vert.vercel.app
              </li>
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              © 2026 spinshare-web-vert.vercel.app. 保留所有权利。
            </p>
          </LegalSection>
        
    </>
  );
}

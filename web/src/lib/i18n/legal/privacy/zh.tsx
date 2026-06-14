import { LegalSection, codeClass } from "../shared";

export function PrivacyBodyZh() {
  return (
    <>
      <LegalSection title="概述">
        <p>
          spinshare.dev（「我们」）运营 SpinShare VS Code 插件、<code className={codeClass}>spinshare</code>{" "}
          CLI 包装器以及 spinshare.dev 网站。SpinShare 是一个面向开发者的广告交易平台，在 AI
          编程助手生成输出时，用短文本广告替换加载 spinner 和进度指示器。本政策说明我们收集哪些信息、如何使用以及您有哪些选择。
        </p>
      </LegalSection>

      <LegalSection title="我们收集的信息">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">账户信息。</strong>
            当您使用 Google 或 GitHub 登录时，我们会收到您的电子邮箱、显示名称（如有）以及稳定的提供商侧标识符（例如
            OAuth <code className={codeClass}>sub</code>
            声明），用于识别账户、计入收益并防止重复注册。
          </li>
          <li>
            <strong className="text-slate-900">设备标识符。</strong>
            本地会为每次安装生成客户端标识符，用于将展示事件与您的账户关联。该标识符为假名化数据：本身无法识别您，但对于已登录用户会关联到您的账户以便计入收益。
          </li>
          <li>
            <strong className="text-slate-900">广告交互事件。</strong>
            每次投放广告时，我们记录事件遥测：事件类型（展示渲染、可见、观看时长 tick、点击）、广告/活动/创意标识符、展示界面（spinner、状态行、进度通知或 overlay）、屏幕可见性指标、用于去重的事件
            ID、时间戳，以及客户端与宿主应用版本（例如 SpinShare 插件版本及 VS Code 或 Claude Code
            版本）。在未登录预览（「演示」）模式下，此类遥测不会归属到任何用户账户。
          </li>
          <li>
            <strong className="text-slate-900">IP 地址。</strong>
            我们仅在限流、滥用检测和反欺诈目的下短暂处理您的 IP 地址。
          </li>
          <li>
            <strong className="text-slate-900">支付信息。</strong>
            若您购买广告库存，支付由 Stripe 处理。我们不存储完整银行卡信息。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="我们不收集的信息">
        <ul className="list-disc space-y-2 pl-6">
          <li>您的源代码、文件内容、文件名或项目结构。</li>
          <li>您的提示词、AI 回复、聊天记录或工具调用。</li>
          <li>在我们插件、CLI 包装器和网站之外的浏览活动。</li>
          <li>
            插件与 CLI 包装器的遥测在结构上仅限于上述广告事件指标 &mdash;
            传输的数据不包含可承载代码、提示词或 AI 交互的字段。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="本地处理（永不传输）">
        <p>
          为检测 AI 编程助手是否正在运行以及当前会话，SpinShare 插件会在您的机器上读取 Claude Code
          的本地会话转录文件（
          <code className={codeClass}>~/.claude/projects/**/*.jsonl</code>
          ）。我们仅从中解析少量信号 &mdash; 例如会话入口标签（区分 VS Code 面板会话与终端会话）、最近一次工具调用名称，以及当前轮次是否结束。这些仅用于控制广告展示时机，并在活动结束时停止计费计时。
        </p>
        <p>
          上述处理完全在您的设备上进行。转录内容 &mdash; 包括提示词、回复、代码或工具名称 &mdash;
          绝不会传输至我们的服务器，遥测 schema 也不包含可承载此类数据的字段。插件源码开源并公开镜像，您可自行验证。
        </p>
      </LegalSection>

      <LegalSection title="网站分析与 Cookie">
        <p>
          spinshare.dev 网站（不含插件或 CLI 包装器）可能使用访问分析服务，记录访客如何与页面交互（点击、滚动、导航）并设置
          Cookie 以区分访客。我们据此了解并改进网站。详见第三方提供商的隐私声明。页面还可能从第三方字体服务加载字体，获取字体文件时该服务会收到您的
          IP 地址。
        </p>
      </LegalSection>

      <LegalSection title="我们如何使用信息">
        <ul className="list-disc space-y-2 pl-6">
          <li>根据广告展示与点击向您的账户计入收益。</li>
          <li>在插件 spinner 位展示相关广告。</li>
          <li>改进服务并检测欺诈或滥用。</li>
          <li>传达重要的账户或服务更新。</li>
        </ul>
      </LegalSection>

      <LegalSection title="Google 与 GitHub 用户数据">
        <p>
          我们对 Google API 所收到信息的使用遵循 Google API 服务用户数据政策，包括有限使用要求。对 GitHub
          所收到信息的使用遵循 GitHub 开发者条款与 GitHub 隐私声明。具体而言，我们：
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>仅使用提供商邮箱、显示名称和稳定标识符来识别账户并计入收益。</li>
          <li>不将提供商用户数据用于广告、再营销或用户画像。</li>
          <li>不出售、出租或与数据经纪商共享提供商用户数据。</li>
          <li>不使用提供商用户数据训练 AI 或机器学习模型。</li>
        </ul>
      </LegalSection>

      <LegalSection title="数据共享">
        <p>我们不出售您的个人信息。我们可能向以下方共享数据：</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Stripe。</strong>
            用于支付处理；提现功能开放后，还用于提现及相关税务信息收集。
          </li>
          <li>
            <strong className="text-slate-900">Google Cloud / Firebase。</strong>
            用于基础设施托管、身份验证与数据存储。
          </li>
          <li>
            <strong className="text-slate-900">Twilio SendGrid</strong>
            （或同类事务邮件服务商）。用于事务邮件（登录链接与账户通知）。
          </li>
          <li>
            <strong className="text-slate-900">分析服务商。</strong>
            用于上述网站访问分析。
          </li>
          <li>
            <strong className="text-slate-900">广告主。</strong>
            仅共享汇总的匿名展示与点击计数。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="数据保留与删除">
        <p>
          账户数据在账户活跃期间保留；终止或最后活动后，为反欺诈、财务对账及法律合规所需，最长可保留
          7 年。您可联系 support@spinshare.dev
          请求删除；删除后，个人标识符将在 30
          天内移除或匿名化，依法需保留的汇总/匿名数据及财务记录仍可保留。
        </p>
      </LegalSection>

      <LegalSection title="您的隐私权利">
        <p>
          根据您所在地区（包括美国加州、弗吉尼亚、科罗拉多、康涅狄格、犹他等拥有隐私法的州，以及欧盟/英国 GDPR、加拿大
          PIPEDA），您可能有权请求访问、更正或删除个人信息，并选择退出个人信息的出售或共享（我们不出售）。行使上述权利请发送邮件至
          support@spinshare.dev。
        </p>
      </LegalSection>

      <LegalSection title="安全">
        <p>
          我们采用行业标准措施，包括加密连接（TLS）、安全身份验证令牌和访问控制来保护您的数据。然而，任何传输或电子存储方式都无法做到绝对安全，我们无法也不保证绝对安全。
        </p>
      </LegalSection>

      <LegalSection title="变更">
        <p>我们可能不时更新本政策。重大变更将通过插件或邮件通知您。</p>
      </LegalSection>

      <LegalSection title="联系我们">
        <p>
          对本政策有疑问？请发送邮件至{" "}
          <a
            href="mailto:support@spinshare.dev"
            className="font-bold text-emerald-700 underline-offset-2 hover:underline"
          >
            support@spinshare.dev
          </a>
          。
        </p>
      </LegalSection>
    </>
  );
}

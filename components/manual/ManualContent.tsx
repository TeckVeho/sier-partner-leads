import Link from "next/link";
import {
  DailyWorkflow,
  IntroWorkflow,
  OverallWorkflow,
  PathDiagram,
  PipelineWorkflow,
  PriorityMatrix,
  SetupWorkflow,
} from "@/components/manual/ManualDiagrams";

const TOC = [
  { id: "overview", label: "このシステムで何をするか" },
  { id: "first-run", label: "初めて使うときの流れ" },
  { id: "screens", label: "画面の見方" },
  { id: "scoring", label: "スコアと優先度" },
  { id: "nodes", label: "ノードと紹介経路" },
  { id: "ai", label: "AI調査と依頼文" },
  { id: "daily", label: "日常の使い方" },
  { id: "faq", label: "よくある質問" },
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="border-b border-border pb-2 text-[16px] font-semibold text-text">{title}</h2>
      <div className="mt-4 space-y-3 text-[13px] leading-6 text-text">{children}</div>
    </section>
  );
}

function ScreenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

export function ManualContent() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="sticky top-0 z-10 -mx-5 bg-bg px-5 py-3 lg:top-6 lg:mx-0 lg:self-start lg:bg-transparent lg:px-0 lg:py-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">目次</p>
        <ul className="max-h-[calc(100vh-8rem)] space-y-1 overflow-y-auto rounded-lg border border-border bg-white px-3 py-3">
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="block rounded-md px-2 py-1 text-[13px] text-muted hover:bg-bg hover:text-text">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        <Section id="overview" title="このシステムで何をするか">
          <p>
            ARO は、既存パートナーの対象エリアを中心に地方 SIer を
            <strong>紹介できる順</strong>に開拓するための台帳です。
            新しい会社を毎日探すことが目的ではありません。
          </p>
          <p>やることは次の3つです。</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>名簿から候補企業を台帳に載せる</li>
            <li>「協業相手として合うか」と「紹介経路があるか」の2軸で優先度を付ける</li>
            <li>紹介依頼 → 商談 → 提携 / 見送りまで進捗を残す</li>
          </ol>
          <OverallWorkflow />
          <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3">
            <p className="font-medium">覚えておくこと</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>紹介依頼のメールは自動送信しません。AI 下書きも人が確認・承認してから送ります。</li>
              <li>名簿の再取得は自動では走りません。ダッシュボード右下の実行から手動で開始します。</li>
              <li>優先度 A でも経路が弱い会社は C（後回し）になります。良い会社＝すぐ動く、ではありません。</li>
              <li>
                対象エリアは既存パートナーが持ちます。名簿にエリア外の会社がいても台帳には載せ、優先度は C です。
              </li>
            </ul>
          </div>
        </Section>

        <Section id="first-run" title="初めて使うときの流れ">
          <p>初回は、台帳を作るところまでをこの順で進めてください。</p>
          <SetupWorkflow />
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <span className="font-medium">ログイン</span>
              <p className="text-muted">
                開発環境は <code className="rounded bg-bg px-1">admin@example.com</code> /{" "}
                <code className="rounded bg-bg px-1">admin</code> です。
              </p>
            </li>
            <li>
              <span className="font-medium">
                <ScreenLink href="/partners">既存パートナー</ScreenLink> の対象エリアを確認する
              </span>
              <p className="text-muted">
                所在地とは別に、紹介を見る都道府県を付けます。名簿の他県企業は載せて優先度 C になります。
              </p>
            </li>
            <li>
              <span className="font-medium">
                <ScreenLink href="/nodes">名簿ノード</ScreenLink> で紹介ノードを確認する
              </span>
              <p className="text-muted">
                県協会の会員名簿やベンダー販売店一覧など、「候補を見つける場所」です。
                既存パートナーの「ノードを探す」で Gemini が提案し、人が採用してからノードになります。
                アクセスが public で、クロール有効になっているノードだけが名簿取得の対象です。
              </p>
            </li>
            <li>
              <span className="font-medium">
                <ScreenLink href="/dashboard">ダッシュボード</ScreenLink> 右下の「台帳を更新」
              </span>
              <p className="text-muted">
                名簿クロール → 再調査 → スコア再計算まで一気に回り、結果レポートが出ます。
                Gemini のキーが無いと始まりません。全社を回すと数分かかることがあります。
              </p>
            </li>
            <li>
              <span className="font-medium">
                <ScreenLink href="/companies">候補一覧</ScreenLink> で優先度 A / B から着手する
              </span>
            </li>
          </ol>
        </Section>

        <Section id="screens" title="画面の見方">
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
              <thead className="border-b border-border bg-surface-subtle">
                <tr>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">画面</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">誰が使うか</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">ここでやること</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["ダッシュボード", "全員", "承認待ち件数と、台帳づくりの実行モニタを見る"],
                  ["候補一覧 / 詳細", "全員", "優先度で並び、経路を確認し、依頼下書きを作る"],
                  ["依頼キュー", "全員（承認は管理者）", "紹介文案を直し、承認し、送信済みにする"],
                  ["パイプライン", "全員", "未接触〜提携 / 見送りまでステージを進める"],
                  ["分析", "全員", "転換ファネル・優先度×結果・見送り理由を見て、スコア設定を見直す"],
                  ["既存パートナー", "管理者", "紹介先と対象エリア。ここからノード提案を実行する"],
                  ["名簿ノード", "管理者", "提案の採用 / 却下と、名簿の取得元・経路基礎点"],
                  ["スコア設定", "管理者", "何点加算するか、何を除外するかを変える"],
                  ["スキル管理", "管理者", "Gemini キーの登録と、判定手順（Markdown）の編集"],
                  ["システム管理", "管理者", "ジョブ・クロール・監査の履歴を見る"],
                ].map(([screen, who, what]) => (
                  <tr key={screen} className="border-b border-border/80">
                    <td className="px-3 py-2.5 font-medium">{screen}</td>
                    <td className="px-3 py-2.5 text-muted">{who}</td>
                    <td className="px-3 py-2.5">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="pt-2 text-[14px] font-semibold">候補一覧</h3>
          <p>
            企業名・所在地・優先度・ICP/経路スコア・所属ノードで絞り込めます。行をクリックすると詳細に入ります。
            優先度が「—」または「未採点」の会社は、まだ再調査またはスコア再計算が済んでいません。
          </p>

          <h3 className="text-[14px] font-semibold">候補詳細</h3>
          <p>
            上段に優先度・スコア・一言要約を出し、下は <strong>調査 / 紹介 / 活動</strong> のタブです。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>再調査</strong> … 企業サイトを取得し、スキルでシグナルと調査メモを抽出します。根拠が無い判定は採用しません
            </li>
            <li>
              <strong>調査メモ</strong> … 再調査で作る要約。採点には使いません。根拠不足のときは前回のメモを残します
            </li>
            <li>
              <strong>再採点</strong> … いまのルールでスコアだけやり直します
            </li>
            <li>
              <strong>依頼下書き</strong> … 紹介経路があるときだけ出せます。既存パートナーと共通ノードが必要です
            </li>
          </ul>

          <h3 className="text-[14px] font-semibold">依頼キュー</h3>
          <p>
            初稿は Gemini です。キーが無いと作れません。下書きを編集 → <strong>承認</strong>（管理者）→ 実際のメール等は人が送る → 画面上で
            <strong>送信済みにする</strong>、の順です。承認しただけでは相手に届きません。
          </p>
          <IntroWorkflow />

          <h3 className="text-[14px] font-semibold">パイプライン</h3>
          <p>
            カードを列へドラッグしてステージを進めます。
            <strong>見送り</strong>へ移すときは理由を聞かれます。理由がないと移動できません。
          </p>
          <PipelineWorkflow />
        </Section>

        <Section id="scoring" title="スコアと優先度">
          <p>
            各社は <strong>ICP（この会社は協業相手として合うか）</strong> と
            <strong>経路（紹介できるルートがあるか）</strong> の2つの点数で評価します。
            <ScreenLink href="/scoring-rules">スコア設定</ScreenLink> はその配点表です。
            AI は点数を付けません。見方（シグナル）と配点は別です。
          </p>

          <h3 className="text-[14px] font-semibold">ICP（協業適合）</h3>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead className="border-b border-border bg-surface-subtle">
                <tr>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">表示名</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">内部キー</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">初期配点</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">意味</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["レガシー保守基盤", "legacy_asset", "+20（必須）", "COBOL / オフコン / 保守など。無いと保留"],
                  ["ストック収益", "stock_revenue", "+20", "保守・運用契約がある"],
                  ["危機意識・変革", "crisis_awareness", "+25", "DX・脱下請けなど。無いと −10"],
                  ["自社生成AI・内製", "ai_inhouse", "除外", "該当すると候補から外す"],
                  ["大手子会社", "subsidiary", "除外", "該当すると候補から外す"],
                ].map((row) => (
                  <tr key={row[1]} className="border-b border-border/80">
                    <td className="px-3 py-2.5 font-medium">{row[0]}</td>
                    <td className="px-3 py-2.5 text-muted">{row[1]}</td>
                    <td className="px-3 py-2.5">{row[2]}</td>
                    <td className="px-3 py-2.5">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-[14px] font-semibold">経路（紹介のしやすさ）</h3>
          <p>
            土台は、その会社が所属するノードの<strong>経路基礎点</strong>（例: 県協会 50、奉行販売店 80）です。
            同じベンダー網・同じ県協会などに既存パートナーがいると、さらに加点します。
          </p>

          <h3 className="text-[14px] font-semibold">優先度の決まり方</h3>
          <PriorityMatrix />
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[400px] border-collapse text-left text-[13px]">
              <thead className="border-b border-border bg-surface-subtle">
                <tr>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">ICP</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">経路</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">優先度</th>
                  <th className="px-3 py-2 text-[12px] font-medium text-muted">現場での意味</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["高（70以上）", "高（70以上）", "A 最優先", "今すぐ紹介を依頼する"],
                  ["高", "中（40以上）", "B", "準備ができ次第依頼する"],
                  ["中（40以上）", "高", "B", "経路は強いが適合は中程度"],
                  ["高", "低 / なし", "C 後回し", "良い会社だが紹介しづらい"],
                  ["それ以外", "—", "保留", "条件未達。後でルールを見直す"],
                ].map((row, index) => (
                  <tr key={`${row[0]}-${row[1]}-${index}`} className="border-b border-border/80">
                    <td className="px-3 py-2.5">{row[0]}</td>
                    <td className="px-3 py-2.5">{row[1]}</td>
                    <td className="px-3 py-2.5 font-medium">{row[2]}</td>
                    <td className="px-3 py-2.5">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted">
            スコア設定で重みを変えたあとは、ダッシュボード右下の「スコア再計算」を実行してください。
            既存の点数は自動では更新されません。
          </p>
        </Section>

        <Section id="nodes" title="ノードと紹介経路">
          <p>
            ノードは「紹介の経由点」です。候補企業の発見元であり、既存パートナーとの共通点でもあります。
          </p>
          <PathDiagram />
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>名簿URL / クロール有効 / アクセス</strong> … 名簿を取りに行ってよいかの設定。
              public かつクロール有効だけが自動取得対象です
            </li>
            <li>
              <strong>経路基礎点</strong> … そのノード経由の紹介しやすさ。スコアの土台になります
            </li>
            <li>
              <strong>members_only / prohibited</strong> … 利用規約上取れない名簿。人手で所属だけ登録する想定です
            </li>
          </ul>
        </Section>

        <Section id="ai" title="AI調査と依頼文">
          <p>
            サイトの読み取りと依頼文の初稿は、スキル（判定手順の Markdown）を正本にして LLM が実行します。
            採点の加減点は AI ではなく <ScreenLink href="/scoring-rules">スコア設定</ScreenLink> が正です。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>再調査 / 一括再調査</strong> … サイト取得 → スキル判定 → 根拠付きシグナルと調査メモ → 既存の採点エンジン
            </li>
            <li>
              <strong>ノード提案</strong> … 既存パートナーのサイトから名簿ノードを推定。採用するまでノードは作らない
            </li>
            <li>
              <strong>依頼下書き</strong> … 会社・経路・優先度を渡して本文だけ作る。送信はしない
            </li>
            <li>
              <strong>API キー未設定</strong> … 名簿クロール・再調査・依頼下書き・ノード提案はエラーになります
            </li>
            <li>
              <strong>根拠が取れない</strong> … その判定は採用せず、既存シグナルと調査メモは残します
            </li>
          </ul>
          <p className="text-muted">
            判定の見方を変えたいときは <ScreenLink href="/skills">スキル管理</ScreenLink>、点数を変えたいときはスコア設定、です。混同しないでください。
            一括抽出は時間がかかり、キー設定時は API 利用料が発生します。毎日回す必要はありません。
          </p>
        </Section>

        <Section id="daily" title="日常の使い方">
          <DailyWorkflow />
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              ダッシュボードで承認待ちと優先度 A の件数を見る
            </li>
            <li>
              候補一覧で A / B を開き、経路があれば依頼下書きを作る
            </li>
            <li>
              依頼キューで文面を直し、管理者が承認する。人が送ったあと「送信済み」にする
            </li>
            <li>
              パイプラインで紹介獲得・初回接触・商談・提携 / 見送りを進める
            </li>
            <li>
              見送りが溜まったら分析を見て、スコア設定の重みを直す
            </li>
          </ol>
          <p className="text-muted">
            名簿の見直しは四半期に一度、ダッシュボードからの名簿クロールで足りることが多い想定です。
            毎日回す必要はありません。
          </p>
        </Section>

        <Section id="faq" title="よくある質問">
          <dl className="space-y-4">
            <div>
              <dt className="font-medium">埼玉など、パートナー対象外の県の会社が名簿にいた</dt>
              <dd className="mt-1 text-muted">
                台帳には載せます。優先度は C（後回し）です。本格的に見るなら、既存パートナーの対象エリアにその県を足すか、その県のパートナーを追加してください。
              </dd>
            </div>
            <div>
              <dt className="font-medium">ノードが自動で増えません</dt>
              <dd className="mt-1 text-muted">
                仕様です。既存パートナーから「ノードを探す」を実行し、名簿ノードで提案を採用してください。
                採用直後はクロールオフです。公開名簿なら人が有効にします。
              </dd>
            </div>
            <div>
              <dt className="font-medium">紹介経路が空です</dt>
              <dd className="mt-1 text-muted">
                候補企業がどのノードにも所属していないか、既存パートナーがそのノードに紐付いていません。
                名簿ノードと既存パートナーを確認してください。
              </dd>
            </div>
            <div>
              <dt className="font-medium">優先度が出ません</dt>
              <dd className="mt-1 text-muted">
                ダッシュボード右下から一括再調査とスコア再計算を実行してください。
                レガシー保守基盤のシグナルが無い会社は保留になります。
              </dd>
            </div>
            <div>
              <dt className="font-medium">承認したのに先方に届きません</dt>
              <dd className="mt-1 text-muted">
                仕様です。自動送信はしません。文面をコピーして人が送り、「送信済みにする」で記録します。
              </dd>
            </div>
            <div>
              <dt className="font-medium">見送りに動かせません</dt>
              <dd className="mt-1 text-muted">
                見送り列へカードをドロップすると理由を聞かれます。理由は分析に使います。
              </dd>
            </div>
            <div>
              <dt className="font-medium">電話や商談のメモはどこに残しますか</dt>
              <dd className="mt-1 text-muted">
                候補詳細のコンタクトログに、電話 / メール / 訪問 / その他を時系列で残せます。
                見送りにするときはパイプラインで理由も必須です。
              </dd>
            </div>
            <div>
              <dt className="font-medium">再調査や依頼下書きがエラーになります</dt>
              <dd className="mt-1 text-muted">
                Gemini キーが未設定です。<ScreenLink href="/skills">スキル管理</ScreenLink> から登録するか、
                <code className="rounded bg-bg px-1">GEMINI_API_KEY</code> を置いてください。
                キーワード判定や定型文への切り替えはありません。
              </dd>
            </div>
            <div>
              <dt className="font-medium">シグナルが更新されませんでした</dt>
              <dd className="mt-1 text-muted">
                本文が短い、または根拠不足と判定されると、誤って空にしないよう前回のシグナルを残します。
                サイトが取れる状態でもう一度「再調査」してください。
              </dd>
            </div>
            <div>
              <dt className="font-medium">AI の判定が間違っています</dt>
              <dd className="mt-1 text-muted">
                点数はスコア設定で直せます。見方そのものを直すときは{" "}
                <ScreenLink href="/skills">スキル管理</ScreenLink> で Markdown を直してから再調査してください。
                依頼文は依頼キューで自由に編集できます。
              </dd>
            </div>
            <div>
              <dt className="font-medium">ログインできない / 画面が赤い</dt>
              <dd className="mt-1 text-muted">
                PostgreSQL が起動していないか、初期化が未完了です。開発環境では{" "}
                <code className="rounded bg-bg px-1">npm run dev:setup</code> のあと{" "}
                <code className="rounded bg-bg px-1">npm run dev</code> を実行してください。
              </dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}

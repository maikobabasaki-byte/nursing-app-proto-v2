import type { StaffProfile } from '../types/personalDashboard';

// --- モックデータ定義（師長1名 admin01, 一般看護師2名 nurse05 / nurse03） ---

export const STAFF_PROFILES: Record<string, StaffProfile> = {
  N001: {
    user: {
      id: 'admin01',
      name: '山田 師長',
      role: 'admin',
      rank: '師長・看護管理者',
      ward: '3階西病棟（循環器・一般）',
      avatarEmoji: '👩‍⚕️',
    },
    timeline: [
      { id: 't1', time: '08:30', room: '301号室', patientName: '山田 太郎様', taskTitle: '朝のバイタル測定 & 全体アセスメント', status: 'completed', priority: 'high', estimatedMinutes: 15, taskType: 'patient' },
      { id: 't2', time: '09:15', room: '305号室', patientName: '佐々木 健様', taskTitle: '点滴更新 & 創傷処置ダブルチェック', status: 'completed', priority: 'high', estimatedMinutes: 20, taskType: 'patient' },
      { id: 't-ward-1', time: '10:00', room: '調剤室', patientName: '病棟全体', taskTitle: '10時病棟定時配薬セット & 経管栄養準備', status: 'completed', priority: 'high', estimatedMinutes: 20, taskType: 'ward' },
      { id: 't3', time: '10:30', room: 'ナースステーション', patientName: '病棟全体', taskTitle: 'リーダーカンファレンス & タスク平準化調整', status: 'completed', priority: 'medium', estimatedMinutes: 25, taskType: 'ward' },
      { id: 't-ward-2', time: '11:30', room: '配膳室・病棟全体', patientName: '病棟全体', taskTitle: '昼食配膳・食事車運搬 & 下膳カート回収', status: 'completed', priority: 'medium', estimatedMinutes: 30, taskType: 'ward' },
      { id: 't4', time: '13:00', room: '302号室', patientName: '高橋 悦子様', taskTitle: '全身清拭 & 体位変換サポート', status: 'in_progress', priority: 'high', estimatedMinutes: 30, taskType: 'patient' },
      { id: 't5', time: '14:15', room: '308号室', patientName: '伊藤 一郎様', taskTitle: '重症者ケア & 血糖測定・インスリン投与', status: 'scheduled', priority: 'high', estimatedMinutes: 25, taskType: 'patient' },
      { id: 't6', time: '16:30', room: 'ナースステーション', patientName: '病棟全体', taskTitle: '看護記録最終チェック & 夕礼申し送り準備', status: 'scheduled', priority: 'medium', estimatedMinutes: 30, taskType: 'ward' },
    ],
    skillData: [
      { subject: 'スケジュール遵守率', score: 95, rationale: '予定時刻との平均ズレが2分以内です。卓越したタイムマネジメントを維持しています。' },
      { subject: '処置スピード', score: 92, rationale: '重症度を考慮した基準時間より平均12%早く安全に処置を完了しています。' },
      { subject: '重症度対応力', score: 96, rationale: '全介助・高リスク患者のタスクを本日6件、安全かつ完璧に完了しました。' },
      { subject: '記録の迅速性', score: 88, rationale: 'タスク完了からSOAP看護記録の入力まで平均4分以内で処理されています。' },
      { subject: 'イレギュラー対応', score: 94, rationale: '急患・検査変更等、予定外の割り込みタスクを4件カバーしました。' },
    ],
    paceData: [
      { time: '08:00', planned: 2, actual: 2 },
      { time: '10:00', planned: 5, actual: 5 },
      { time: '12:00', planned: 9, actual: 8 },
      { time: '14:00', planned: 12, actual: 11 },
      { time: '16:00', planned: 15, actual: 14 },
    ],
    feedback: {
      evalSummary: '師長・管理者として極めて高いアセスメント力と病棟全体への目配りができています。',
      strengths: [
        '高リスク処置の判断スピードとアセスメント精度が非常に安定しています。',
        '自タスクだけでなく、病棟全体のボトルネックを察知して即座にサポート介入できています。',
      ],
      improvements: [
        '自身の直接介助と新人指導の重複により、11時台の清拭で若干のペース押しが発生しています。',
      ],
      recommendation: '14:00台の重症ケア時、新人 (田中結衣ナース) を同行させてOJT指導を行うことで、指導効率とタスク消化の双方を高められます。',
    },
    reflection: {
      format: 'modular',
      nurseSelfReflection: '病棟全体の進行状況をリアルタイムに把握しながら、高リスク処置とアセスメントを安全に完了できました。新人のペア介助指導において事前打合せの時間をもう少し確保できるようタイムマネジメントを改善します。',
      kpt: {
        keep: 'リーダー業務における病棟全体のタスク平準化と優先順位の指示出し。',
        problem: '直接介護介助とOJT指導が同時発生した際の個別タイムマネジメント。',
        try: '14時台の処置開始5分前に新人へポイントを要約伝達する事前レクチャーを定着させる。',
      },
      kolb: {
        experience: '病棟全体のタスク平準化指示と新人指導の並行実施。',
        reflection: '指示出しは的確だったが、新人の事前準備時間への配慮に改善の余地があった。',
        conceptual: '指導は「実施直前の指示」ではなく「事前準備段階での構造化」が決め手となる。',
        experiment: '明日の朝礼時に各ナースの準備チェック項目を1分間確認する。',
      },
      reflections: [
        {
          id: 'ref-n1-1',
          type: '課題',
          title: 'OJT指導と直接介助の並行タイムマネジメント',
          content: '病棟全体のタスク平準化指示と新人のペア介助指導が同時発生した際、事前レクチャーに充てる時間が若干短くなってしまいました。',
          comments: [
            {
              id: 'c-n1-1',
              senderId: 'admin01',
              senderName: '統括看護部長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '【統括アドバイス】朝の申し送り直後に1分間のプレカンファレンスを設定すると指導がよりスムーズになります。',
              createdAt: '17:00',
            },
          ],
          createdAt: '17:00',
        },
      ],
      preceptorComment: '【管理者・統括フィードバック】病棟リーダーとしてのアセスメント判断・危険予知・指示出しが極めて的確です。',
      preceptorName: '統括看護部長',
    },
  },
  N002: {
    user: {
      id: 'nurse05',
      name: '田中 結衣 (新人A)',
      role: 'nurse',
      rank: '新人ナース（1年目）',
      ward: '3階西病棟（循環器・一般）',
      avatarEmoji: '🌱',
    },
    timeline: [
      { id: 't1', time: '08:30', room: '302号室', patientName: '高橋 悦子様', taskTitle: 'バイタル測定 & 朝食配薬', status: 'completed', priority: 'high', estimatedMinutes: 20, taskType: 'patient' },
      { id: 't2', time: '09:30', room: '303号室', patientName: '鈴木 正雄様', taskTitle: '服薬確認 & 体温測定', status: 'completed', priority: 'medium', estimatedMinutes: 15, taskType: 'patient' },
      { id: 't-ward-2', time: '10:15', room: '調剤室', patientName: '病棟全体', taskTitle: '10時病棟定時配薬セット & 経管栄養準備', status: 'completed', priority: 'high', estimatedMinutes: 25, taskType: 'ward' },
      { id: 't3', time: '11:00', room: '302号室', patientName: '高橋 悦子様', taskTitle: 'おむつ交換 & 体位変換', status: 'in_progress', priority: 'high', estimatedMinutes: 25, taskType: 'patient' },
      { id: 't-ward-3', time: '11:45', room: '配膳室・病棟全体', patientName: '病棟全体', taskTitle: '昼食配膳・下膳回収 & 食事量チェック', status: 'in_progress', priority: 'medium', estimatedMinutes: 30, taskType: 'ward' },
      { id: 't4', time: '13:30', room: '304号室', patientName: '中村 幸子様', taskTitle: '清拭介助 & 保湿ケア', status: 'scheduled', priority: 'medium', estimatedMinutes: 30, taskType: 'patient' },
      { id: 't5', time: '15:30', room: 'ナースステーション', patientName: '担当患者全般', taskTitle: 'SOAP看護記録の作成・入力', status: 'scheduled', priority: 'medium', estimatedMinutes: 40, taskType: 'patient' },
    ],
    skillData: [
      { subject: 'スケジュール遵守率', score: 68, rationale: '体位変換・清拭の事前準備不足により、予定時刻との平均ズレが12分生じています。' },
      { subject: '処置スピード', score: 62, rationale: '基本バイタル手順は正確ですが、複数介護タスクの基準時間より平均15%時間を要しています。' },
      { subject: '重症度対応力', score: 60, rationale: '先輩ナースの同行フォローを受けながら高リスク処置1件を安全に実施しました。' },
      { subject: '記録の迅速性', score: 65, rationale: 'SOAPテンプレート参照に時間を要し、タスク完了から記録まで平均16分かかっています。' },
      { subject: 'イレギュラー対応', score: 85, rationale: '患者様からのナースコールや予期せぬ相談に対し、親身に応答・カバーできました。' },
    ],
    paceData: [
      { time: '08:00', planned: 2, actual: 2 },
      { time: '10:00', planned: 4, actual: 3 },
      { time: '12:00', planned: 7, actual: 5 },
      { time: '14:00', planned: 10, actual: 7 },
      { time: '16:00', planned: 12, actual: 9 },
    ],
    feedback: {
      evalSummary: '患者様への親身なコミュニケーションが魅力です。複数介護タスクの時間配分に改善の伸びしろがあります。',
      strengths: [
        '患者様への丁寧な声かけと傾聴姿勢が素晴らしく、安心感を与えられています。',
        '基本バイタルの測定手順が忠実で正確性が高く維持されています。',
      ],
      improvements: [
        '11時台の体位変換・清拭などの全介助タスクで、事前準備不足による時間の押しが見られます。',
        '看護記録入力時のテンプレート参照にやや時間を要しています。',
      ],
      recommendation: '体位変換や清拭に入る前に先輩ナース (山田師長) へ声かけを行い、ダブルチェック・ペア介助を依頼すると消化スピードが35%改善します。',
    },
    reflection: {
      format: 'modular',
      nurseSelfReflection: '11時台のおむつ交換・体位変換で準備が遅れてしまい、予定より12分押してしまいました。次回からは前もって必要物品をチェックシートで準備し、先輩ナースに早めのペア介助フォローを依頼するようにします！',
      kpt: {
        keep: 'バイタル測定と患者様への親身な声かけ・傾聴は正確に実施できました。',
        problem: '11時台の体位変換・清拭で事前物品準備が足りず、12分遅延が発生しました。',
        try: '朝礼後に体位変換用クッションと保湿剤をワゴンへ事前セットし、10:50にペア介助の依頼を出します。',
      },
      kolb: {
        experience: '高橋様の清拭・体位変換で、必要物品の取りに戻る往復が発生し時間が押した。',
        reflection: '準備物品のチェックリスト化と作業順序のイメージトレーニングが不足していた。',
        conceptual: '全介助ケアは「介助に入る前の物品ワゴン集約」が処置時間の20%を左右する。',
        experiment: '明日の体位変換では準備チェック表をナースカートに貼り付けて実践する。',
      },
      reflections: [
        {
          id: 'ref-n2-1',
          type: '課題',
          title: '11時台のおむつ交換・体位変換での時間遅延',
          content: '体位変換用クッションと保湿剤の準備を忘れ、処置中に何度もナースステーションへ取りに戻る往復ロスが発生し、12分遅延してしまいました。',
          comments: [
            {
              id: 'c1',
              senderId: 'admin01',
              senderName: '山田 師長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '【アドバイス】業務開始前の15分間で物品セットをワゴンに入れておくだけで、この12分の往復ロスはゼロになりますよ！明日一緒にワゴンセッティングをやってみましょう👍',
              createdAt: '16:30',
            },
            {
              id: 'c2',
              senderId: 'nurse05',
              senderName: '田中 結衣',
              senderRole: 'nurse',
              senderAvatarEmoji: '🌱',
              text: 'アドバイスありがとうございます！明日朝一番でワゴンに物品を準備して臨みます！',
              createdAt: '16:45',
            },
            {
              id: 'c3',
              senderId: 'admin01',
              senderName: '山田 師長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '頼もしいですね！朝礼後に声をかけてくださいね、一緒に最終チェックしましょう😊',
              createdAt: '16:50',
            },
          ],
          createdAt: '16:30',
        },
        {
          id: 'ref-n2-2',
          type: '学び',
          title: '高橋様への親身な傾聴とバイタル測定の丁寧さ',
          content: '患者様への事前の丁寧な声かけと傾聴を行うことで、不安な気持ちをやわらげながらスムーズに体温・血圧測定を終えることができました。',
          comments: [
            {
              id: 'c4',
              senderId: 'admin01',
              senderName: '山田 師長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '【Good!】患者様への素晴らしい配慮です！安心感を与える声かけ技術は田中さんの大きな強みですよ😊',
              createdAt: '16:35',
            },
            {
              id: 'c5',
              senderId: 'nurse05',
              senderName: '田中 結衣',
              senderRole: 'nurse',
              senderAvatarEmoji: '🌱',
              text: 'ありがとうございます！今後も笑顔で親身に対応します！',
              createdAt: '16:48',
            },
          ],
          createdAt: '16:35',
        },
        {
          id: 'ref-n2-3',
          type: '改善点',
          title: '先輩ナースへの早めのペア介助依頼',
          content: '全介助タスクに入る直前ではなく、10:45頃の段階で先輩ナースに一声かけてペア介助の予定をすり合わせるようにします。',
          comments: [
            {
              id: 'c6',
              senderId: 'admin01',
              senderName: '山田 師長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '【指導】素晴らしい気づきです！10:45頃に声をかけてくれればいつでもペア介助に入れますので遠慮なく頼んでくださいね。',
              createdAt: '16:40',
            },
          ],
          createdAt: '16:40',
        },
      ],
      preceptorComment: '田中さん、本日もお疲れ様でした！患者様への声かけがとても丁寧で安心感を与えられていますよ。',
      preceptorName: '指導プリセプター：山田 師長',
    },
  },
  N003: {
    user: {
      id: 'nurse03',
      name: '鈴木 看護師 (中堅B)',
      role: 'nurse',
      rank: '中堅ナース（4年目）',
      ward: '3階西病棟（循環器・一般）',
      avatarEmoji: '👨‍⚕️',
    },
    timeline: [
      { id: 't1', time: '08:30', room: '306号室', patientName: '加藤 勇様', taskTitle: 'バイタル測定 & 血糖測定', status: 'completed', priority: 'high', estimatedMinutes: 15, taskType: 'patient' },
      { id: 't2', time: '09:10', room: '307号室', patientName: '渡辺 節子様', taskTitle: 'インスリン投与 & 朝食介助', status: 'completed', priority: 'high', estimatedMinutes: 20, taskType: 'patient' },
      { id: 't3', time: '10:45', room: '306号室', patientName: '加藤 勇様', taskTitle: '点滴交換 & 刺入部観察', status: 'completed', priority: 'medium', estimatedMinutes: 15, taskType: 'patient' },
      { id: 't-ward-4', time: '11:30', room: '配膳室・病棟全体', patientName: '病棟全体', taskTitle: '昼食配膳サポート & 経管栄養注入確認', status: 'completed', priority: 'high', estimatedMinutes: 30, taskType: 'ward' },
      { id: 't4', time: '13:00', room: '309号室', patientName: '小林 健一様', taskTitle: '入浴介助 & 看護記録', status: 'in_progress', priority: 'high', estimatedMinutes: 45, taskType: 'patient' },
      { id: 't-ward-5', time: '14:30', room: 'ナースステーション', patientName: '病棟全体', taskTitle: '夕方処方薬の受け取り & リネン・備品補給', status: 'scheduled', priority: 'medium', estimatedMinutes: 20, taskType: 'ward' },
      { id: 't5', time: '15:15', room: '307号室', patientName: '渡辺 節子様', taskTitle: '創傷処置 & 経過観察', status: 'scheduled', priority: 'medium', estimatedMinutes: 20, taskType: 'patient' },
      { id: 't6', time: '16:30', room: 'ナースステーション', patientName: '担当患者全般', taskTitle: '終業前記録入力 & 申し送り', status: 'scheduled', priority: 'medium', estimatedMinutes: 25, taskType: 'patient' },
    ],
    skillData: [
      { subject: 'スケジュール遵守率', score: 90, rationale: '予定時刻との平均ズレが3分以内です。計画通り安定してタスクを消化しています。' },
      { subject: '処置スピード', score: 88, rationale: '重症度を考慮した基準時間より平均10%早く完了しています。' },
      { subject: '重症度対応力', score: 85, rationale: '全介助・高リスク患者のタスクを本日5件スムーズに完了しました。' },
      { subject: '記録の迅速性', score: 92, rationale: 'タスク完了から記録まで平均3分以内の高い記録即時性を誇ります。' },
      { subject: 'イレギュラー対応', score: 82, rationale: '他ナースからの相談受託や予定外の割り込みタスクを3件カバーしました。' },
    ],
    paceData: [
      { time: '08:00', planned: 2, actual: 2 },
      { time: '10:00', planned: 5, actual: 5 },
      { time: '12:00', planned: 9, actual: 8 },
      { time: '14:00', planned: 12, actual: 11 },
      { time: '16:00', planned: 15, actual: 14 },
    ],
    feedback: {
      evalSummary: '自己の計画通りに正確かつスピーディーにタスクを処理できており、安定したパフォーマンスを発揮しています。',
      strengths: [
        '記録入力スピードが速く、時間内完了率100%を維持できています。',
        '処置と観察の並行作業がスムーズで手際が良いです。',
      ],
      improvements: [
        '午後の比較的余裕のある時間帯に、新人ナースのフォローへ意識を向けるとチーム全体の残業減に貢献できます。',
      ],
      recommendation: '15:00の処置完了後、新人 (田中結衣ナース) の記録入力ダブルチェックをアドバイスサポートすることを推奨します。',
    },
    reflection: {
      format: 'modular',
      nurseSelfReflection: '本日の処置・血糖測定・SOAP記録入力は全て予定時間内にスムーズに完了できました。午後は新人A (田中結衣ナース) の体位変換フォローに回り、安全なペア介助を実施できました。',
      kpt: {
        keep: 'SOAP看護記録の即時入力と処置並行アセスメント。',
        problem: '新人の困りごと察知タイミングがタスク終了後になってしまった。',
        try: '13:00前後に田中ナースの進行状況をナースステーションモニターで確認する。',
      },
      kolb: {
        experience: '午後に新人田中ナースの体位変換をペア介助フォローした。',
        reflection: '事前に必要な物品と手順のダブルチェックを行うことで作業速度が大幅向上した。',
        conceptual: 'OJT指導は「事後の指導」より「事前の物品と流れの共有」が最も効果的。',
        experiment: '明日は作業に入る5分前に1分間の手順事前アラインメントを試みる。',
      },
      reflections: [
        {
          id: 'ref-n3-1',
          type: '学び',
          title: '新人田中ナースへのペア介助と事前アラインメント',
          content: '午後に新人田中ナースの体位変換をペア介助フォローした際、実施前に必要物品と役割分担を確認したことで安全かつ短時間で作業が完了しました。',
          comments: [
            {
              id: 'c-n3-1',
              senderId: 'admin01',
              senderName: '山田 師長',
              senderRole: 'admin',
              senderAvatarEmoji: '👩‍⚕️',
              text: '【評価】自タスク消化にとどまらず、チーム全体の安全向上に寄与しています。素晴らしく頼もしい存在です！',
              createdAt: '16:40',
            },
          ],
          createdAt: '16:40',
        },
      ],
      preceptorComment: '鈴木さん、自身のタスクを完璧に完了した上で、新人田中さんへの的確なペアフォローありがとうございました。',
      preceptorName: 'プリセプターリーダー：山田 師長',
    },
  },
};

// IDエイリアス設定
STAFF_PROFILES['admin01'] = STAFF_PROFILES['N001'];
STAFF_PROFILES['ono'] = STAFF_PROFILES['N001'];
STAFF_PROFILES['leader_ono'] = STAFF_PROFILES['N001'];
STAFF_PROFILES['leader'] = STAFF_PROFILES['N001'];
STAFF_PROFILES['nurse01'] = STAFF_PROFILES['N001'];
STAFF_PROFILES['n001'] = STAFF_PROFILES['N001'];

STAFF_PROFILES['nurse05'] = STAFF_PROFILES['N002'];
STAFF_PROFILES['nurse02'] = STAFF_PROFILES['N002'];
STAFF_PROFILES['n002'] = STAFF_PROFILES['N002'];
STAFF_PROFILES['sato'] = STAFF_PROFILES['N002'];

STAFF_PROFILES['nurse03'] = STAFF_PROFILES['N003'];
STAFF_PROFILES['n003'] = STAFF_PROFILES['N003'];

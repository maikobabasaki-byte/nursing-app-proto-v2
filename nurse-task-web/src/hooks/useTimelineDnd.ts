import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { groupTasks, ungroupTask } from '../utils/taskLogic';
import { useDndCollision } from './useDndCollision';
import type { ExtendedTask, TaskStatus } from '../types/types';

interface UseTimelineDndProps {
    selectedPatients: string[];
}

export function useTimelineDnd({ selectedPatients }: UseTimelineDndProps) {
    /**
   * @description
   * dnd-kit用のカスタム衝突検知ロジック。
   * 狭い時間枠（30分枠など）でもポインターの先端を基準に、狙った場所にスッと吸い込まれる操作感を実現します。
   */
    const { customCollisionDetection } = useDndCollision();

  // カードをクリックしたあと、「5ピクセル以上、的確に動かさないとドラッグが始まらない」
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    // 「基本は文字列（string）が入るけど、何も掴んでいない時は完全に空っぽ（null）の可能性もあるよ」という意味を込めて、
    //  string | null（ストリング または ヌル） という2つの型を許してあげる必要がある
    const [activeId, setActiveId] = useState<string | null>(null);

    // タスク一覧は「これから1件、2件…とデータ（配列）が入る箱」であり、最初が0件なだけなので、
    // 安全のために空の箱 [] を用意しておくのが最適
    const [allTasks, setAllTasks] = useState<ExtendedTask[]>([]); 
    const [memos, setMemos] = useState<any[]>([]);

        // 初期値が true（準備中からスタート）なので、データが読み込まれたら false に切り替える
    const [loading, setLoading] = useState(true);
    const [groupingMode, setGroupingMode] = useState<string | null>(null);
    const draggedTaskRef = useRef<ExtendedTask | null>(null);

    useEffect(() => {
        async function loadTimelineData() {
        try {
            const [tasksRes, patientsRes] = await Promise.all([
            fetch('/data/tasks.json'),
            fetch('/data/patients.json')
            ]);

            if (!tasksRes.ok || !patientsRes.ok) throw new Error('データ取得に失敗');

            const tasksData = await tasksRes.json();
            const patientsData = await patientsRes.json();

            const mergedTasks = tasksData.map((task: any) => {
            const targetPatient = patientsData.find((p: any) => p.patient_id === task.patient_id);
            return {
                ...task,
                patient_name: targetPatient ? targetPatient.name : '不明な患者',
                initial_period: task.display_period
            };
            });

            setAllTasks(mergedTasks);
        } catch (err) {
            console.error('タイムラインデータ読み込みエラー:', err);
        } finally {
            setLoading(false);
        }
        }

        loadTimelineData();
    }, []);

    /**
   * 指定されたタスクの配置時間（period）を新しい時間に書き換える（引っ越しさせる）関数。
   * @param taskId - 時間を変更したい対象のタスクID
   * @param newPeriod - 移動先の新しい時間（例: "10:00", "午後" など）
   */
    const handleUpdateTaskPeriod = (taskId: string, newPeriod: string) => {
        setAllTasks((prevTasks) =>
        prevTasks.map((task) =>
            // 🆔 動かしたタスクIDと一致するものだけ、表示時間（display_period）を新しい時間に書き換える
            task.task_id === taskId ? { ...task, display_period: newPeriod } : task
        )
        );// 外部のStateに依存していないため、 useCallback の中身は空の配列でOK！
    };

    /**
     * 2つのタスクを1つに統合（グループ化）するハンドラー関数。
     * * @description
     * タイムライン上でタスクカード同士が重ね合わされた際に起動します。
     * ドラッグした「主役のタスク」と、重ねられた先の「相手のタスク」の2つのデータを
     * それぞれ最適な方法（Ref と 全体リスト）で特定し、合体処理の準備を整えます。
     * * @param draggedId - ドラッグして動かした側のタスクID
     * @param targetId  - 重ねられたターゲット（相手）側のタスクID
     */
    const handleGroupTasks = useCallback((draggedId: string, targetId: string) => {
        // 【重ねられた相手】現在画面にある全タスクリストから、IDが一致するものを検索して特定
        const targetTask = allTasks.find(t => String(t.task_id) === String(targetId));
        // 【動かした主役】ドラッグ開始時に秘密の引き出し（Ref）に退避させておいた、元のタスクデータを直接取得
        const originalDraggedTask = draggedTaskRef.current;

            // 最新のデータ（prev）を使って、グループ化の結果を全体リストに反映させる
        setAllTasks((prev) => {
        // どちらのタスクも存在し、かつ午前・午後が違う場合はここで厳密に弾く！
        if (originalDraggedTask && targetTask) {
            const getCat = (p: string) => (p === '午前' ? 'AM' : p === '午後' ? 'PM' : 'ANY');
            // 手元で動かしたタスクの勤務帯（AM または PM）
            const draggedCat = getCat(originalDraggedTask.display_period);
            // 重ねられた相手のタスクの勤務帯（AM または PM）
            const targetCat = getCat(targetTask.display_period);

            // AM と PM で、分類（Cat）が一致していない場合
            if (draggedCat !== 'ANY' && targetCat !== 'ANY' && draggedCat !== targetCat) {
            alert(`エラー：${originalDraggedTask.display_period}のタスクを${targetTask.display_period}のグループに入れることはできません。`);
            return prev; // 今やったドラッグ操作をなかったことにする（巻き戻す）
            }
        }

        // チェックを通過、または通常のドラッグなら、元の groupTasks（ID渡し）を実行
        return groupTasks(prev, draggedId, targetId);
        });
    }, [allTasks]);//【重要】1行目の `allTasks.find` で常に「最新のタスク一覧」を参照するため、依存配列(allTasksの時に動く)への追加が必須！

    /**
     * ドラッグが開始された瞬間に実行されるハンドラー関数。
     * * @description
     * ユーザーがタスクカードを掴んだまさにその一瞬に起動します。
     * 掴んだタスクの全データを特定して安全な保管庫（Ref）に退避させ、
     * 同時に画面全体へ「現在ドラッグ中である」という状態を通知します。
     * * @param event - dnd-kitから渡されるドラッグ開始のイベントデータ
     */
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        // 1. 現在の全タスクリストから、今掴んだタスクの詳しいデータ（型）を検索して特定
        const task = allTasks.find(t => String(t.task_id) === String(active.id));
            // 2. 【超重要】合体時のエラーチェック等で後から使うため、
            //     ドラッグ中の衝撃でデータを見失わないよう秘密の引き出し（Ref）に丸ごとキープしておく
            if (task) {
            // useRef が作った箱の、.current の中身だけは、画面が何回書き換わっても絶対に消さずに守り抜く」という特別ルールを持っています。
            draggedTaskRef.current = task;
            }
            // 3. ステートを更新し、画面全体に「現在このタスクをドラッグ中だよ」と通知する
            setActiveId(String(active.id));
    };

    /**
   * ドラッグが終了し、ユーザーがアイテムをドロップした瞬間に起動する総括ハンドラー。
   * * @description
   * ドロップされたアイテム（タスク or メモ）と、落とされた先のターゲットに応じて
   * 以下の4つのルート（メモ処理、グループ内ソート、時間移動、タスク合体）へ適切にトリアージします。
   * 各ルートでは、データの混入や時間帯の誤りを防ぐ安全ガードが作動します。
   * * @param event - dnd-kitから渡されるドラッグ終了（ドロップ）のイベントデータ
   */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        // ドロップされたので、画面全体の「ドラッグ中サイン」を空床（null）に戻す
        setActiveId(null);
        // 何もない場所に落としたか、自分自身の上に落とした場合は、何もしないで終了
        if (!over || active.id === over.id) return;

        const draggedId = String(active.id);
        const overId = String(over.id);

        // ==========================================
        //  ルート ①：【メモ】のドロップ処理
        // ==========================================
        if (draggedId.startsWith('memo-')) {
            // 比較用に、頭の 'memo-' を削った純粋な元のメモIDを抽出
        const pureMemoId = draggedId.replace('memo-', '');
        if (overId.startsWith('memo-drop-')) {
            // メモ専用エリア（未配置スペースなど）に落とされた場合、そこに対応する時間をセット
            const targetTime = overId.replace('memo-drop-', '');
            // 配列のループ処理（.map() や .find() など）を書くときに、「そのデータの頭文字」を1文字だけ使って変数名にするという、プログラマーの間での定番の省略ルールがあります。
            //   「m」は、memos（メモたち）の中から取り出した「1件分のメモ」のこと
            setMemos(prev => prev.map(m => String(m.id) === pureMemoId ? { ...m, time: targetTime } : m));
        } else if (overId.includes(':')) {
            // タイムラインの時間セル（例: "09:30"）に直接落とされた場合、その時間をセット
            setMemos(prev => prev.map(m => String(m.id) === pureMemoId ? { ...m, time: overId } : m));
        }
        return;// メモの処理はここで完結。下のタスク用ロジックには絶対に侵入させない（return）
        }

        // ==========================================
        //  ルート ②：【グループ内部】の子要素の並び替え処理
        // ==========================================
        if (active.id !== over.id) {
            let isInternalSort = false;// 「グループ内部での並び替えだったか」を記録するフラグ
            
            setAllTasks((prevTasks: any[]) => {
                return prevTasks.map((task: any) => {
                // グループではない単体タスク、または中身（子要素）がないものはスキップ
                if (!task.isGroup || !task.children) return task;

                // 今チェック中のグループ内に、動かした子（active）が含まれているか検査
                const hasActive = task.children.some((c: any) => String(c.task_id) === String(active.id));
                // 同じグループ内に、重ねられた相手の子（over）も含まれているか検査
                const hasOver = task.children.some((c: any) => String(c.task_id) === String(over.id));
                
                //【判定】両方とも「同じグループ内の住人」であれば、グループ内部の並び替えと確定！
                if (hasActive && hasOver) {
                    isInternalSort = true;
                    //【元の位置】動かした子タスクが、配列の何番目（0スタート）にいたか特定
                    const oldIndex = task.children.findIndex((c: any) => String(c.task_id) === String(active.id));
                    //【移動先の位置】重ねられた相手のタスクが、現在何番目にいるか特定
                    const newIndex = task.children.findIndex((c: any) => String(c.task_id) === String(over.id));
                    return {
                    ...task,
                    // 割り出した「元々の背番号」から「新しい背番号」へ中身を安全に並び替える
                    children: arrayMove(task.children, oldIndex, newIndex)
                    };
                }
                return task;
                });
            });

            if (isInternalSort) return;
        }

        // 時間移動 or グループ化の分岐
        if (overId.includes(':')) {
            handleUpdateTaskPeriod(draggedId, overId);
            return;
        }

        const targetTask = allTasks.find(t => String(t.task_id) === overId);
        const originalDraggedTask = draggedTaskRef.current;

        if (originalDraggedTask && targetTask) {
            if (targetTask.groupType === 'patient') {
                if (originalDraggedTask.patient_id !== targetTask.patient_id) {
                alert(`【エラー】患者名グループ化の時は、異なる患者のタスクをまとめることはできません。`);
                draggedTaskRef.current = null;
                return;
                }
            }

            const draggedRoot = originalDraggedTask.initial_period;
            const targetRoot = targetTask.initial_period;
            const isAny隨時 = draggedRoot?.includes('随時') || targetRoot?.includes('随時');

            if (!isAny隨時 && draggedRoot && targetRoot && draggedRoot !== targetRoot) {
                alert(`【エラー】元の区分が異なるタスク（元の時間：${draggedRoot} と ${targetRoot}）をグループ化することはできません。`);
                draggedTaskRef.current = null;
                return;
            }
        }

            handleGroupTasks(draggedId, overId);
            draggedTaskRef.current = null;
    };

    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setAllTasks(prev => 
        prev.map(task => {
        // 1. 通常の単体タスクのステータス変更の場合
        if (task.task_id === taskId) {
            return { ...task, status: newStatus };
        }
        
        // 2. 【ここが重要】グループの中の「特定の1つの子タスク」が更新された場合
        if (task.isGroup && task.children) {
            // children の中に、今回更新された taskId を持つ子がいるか探す
            const hasTargetChild = task.children.some(child => String(child.task_id) === String(taskId));
            
            if (hasTargetChild) {
                // 対象の子タスクだけを newStatus に更新する
                const updatedChildren = task.children.map(child => 
                    String(child.task_id) === String(taskId) ? { ...child, status: newStatus } : child
                );

                // 1. 【処置完了チェック】全員が「処置終了（completed以降）」のステージにいるか？
                const isAllTreatmentDone = updatedChildren.every(child => 
                    ['completed', 'record_start', 'record_pending', 'record_complete'].includes(child.status)
                );

                // 2. 【完全完了チェック】全員が「記録まで100%終了」しているか？
                const isAllRecordDone = updatedChildren.every(child => child.status === 'record_complete');

                //  親グループに設定すべき最終的なステータスを決定
                let finalParentStatus = task.status;
                if (isAllRecordDone) {
                    finalParentStatus = 'record_complete'; //  全員記録まで終わったら親も完全終了（グレーアウトへ）
                } else if (isAllTreatmentDone) {
                    finalParentStatus = 'completed';       //  処置は全員終わった状態（カードは明るい紺を維持）
                }

                return {
                    ...task,
                    status: finalParentStatus,
                    children: updatedChildren
                };
            }
        }

        return task;
        })
    );
    };

    const handleStartGrouping = useCallback((taskId: string) => {
        console.log("🔥 親の handleStartGrouping が発火！ 押されたタスクID:", taskId);
        
        setGroupingMode(prev => {
            // もしすでに「今押されたタスク」が選択中なら、通常モードに戻す（解除）
            if (prev === taskId) {
            return null;
            }
            // 選ばれていなければ、そのタスクを選択中にする
            return taskId;
        });
        }, []);

    const handleUngroupTask = (groupId: string, childTaskId: string, currentPeriod: string) => {
        setAllTasks((prev) => ungroupTask(prev, groupId, childTaskId, currentPeriod));
    };

    // 【ここを追加】React側でメモを保存・更新する関数
    const handleSaveMemo = (updatedMemo: any) => {
        setMemos((prevMemos) => {
            const exists = prevMemos.some((m) => m.id === updatedMemo.id);
            if (exists) {
            // 既存メモの更新
            return prevMemos.map((m) => (m.id === updatedMemo.id ? updatedMemo : m));
            } else {
            // 新規メモの追加
            return [...prevMemos, updatedMemo];
            }
        });
    };

    // 💡 【ここを追加】React側でメモを削除する関数
    const handleDeleteMemo = (memoId: string) => {
        if (confirm("このメモを削除してもよろしいですか？")) {
        setMemos((prevMemos) => prevMemos.filter((m) => m.id !== memoId));
        }
    };

    const { poolTasks, timedTasks } = useMemo(() => {
        const patientTasks = allTasks.filter(task => selectedPatients.includes(task.patient_id));
        return {
            poolTasks: patientTasks.filter(task => !task.display_period.includes(':')),
            timedTasks: patientTasks.filter(task => task.display_period.includes(':'))
            };
        }, [allTasks, selectedPatients]);
        
        const hasPendingTasks = timedTasks.some(task => task.status === 'pending');
        
        return {
        allTasks,
        memos,
        loading,
        groupingMode,
        setGroupingMode,
        activeId,
        sensors,
        customCollisionDetection,
        handleDragStart,
        handleDragEnd,
        handleGroupTasks,
        handleUpdateTaskPeriod,
        handleUpdateStatus,
        handleStartGrouping,
        handleUngroupTask,
        handleSaveMemo,
        handleDeleteMemo,
        poolTasks,
        timedTasks,
        hasPendingTasks
    };
}
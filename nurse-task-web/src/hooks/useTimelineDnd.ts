import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { groupTasks, ungroupTask, reconstructGroups } from '../utils/taskLogic';
import { useDndCollision } from './useDndCollision';
import type { ExtendedTask, TaskStatus } from '../types/types';
import { useTimelineStore } from '../stores/useTimelineStore'; // ★Zustandをインポート
import { updateTask } from '../hooks/useTaskUpdate';

interface UseTimelineDndProps {
    selectedPatients: string[];
}

export function useTimelineDnd({ selectedPatients }: UseTimelineDndProps) {
    const { customCollisionDetection } = useDndCollision();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const groupingMode = useTimelineStore((state) => state.groupingMode);
    const setGroupingMode = useTimelineStore((state) => state.setGroupingMode); // ※ストアに未定義なら追加
    const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);

    const [activeId, setActiveId] = useState<string | null>(null);
    const draggedTaskRef = useRef<ExtendedTask | null>(null);

    // 1. 状態の宣言部分から、ローカルの loading を一旦無くすか、以下のように変更します
// 🎯 allTasks の中身があるかどうかを直接 loading の判断基準にしてしまうのが一番確実です！

const allTasks = useTimelineStore((state) => state.allTasks);
const memos = useTimelineStore((state) => state.memos);
const setTasks = useTimelineStore((state) => state.setTasks);
const setMemos = useTimelineStore((state) => state.setMemos);

// 💡 ローカルStateとしての loading ではなく、「データが空ならloading」という絶対ルールにする
const loading = allTasks.length === 0; 


    // const handleStartGroupingLocal = useCallback((taskId: string) => {
    //     handleStartGrouping(taskId); // ストアのロジックを実行
    // }, [handleStartGrouping]);

    // 🎯 3. 各ハンドラーも Zustand ストアの内容を直接更新するように変更
    const handleUpdateTaskPeriod = (taskId: string, newPeriod: string) => {
        setTasks(
            allTasks.map((task) =>
                task.task_id === taskId ? { ...task, display_period: newPeriod } : task
            )
        );
    };

    const handleGroupTasks = useCallback(async (draggedId: string, targetId: string) => {
        const targetTask = allTasks.find(t => String(t.task_id) === String(targetId));
        const originalDraggedTask = draggedTaskRef.current;

        if (originalDraggedTask && targetTask) {
            const getCat = (p: string) => (p === '午前' ? 'AM' : p === '午後' ? 'PM' : 'ANY');
            const draggedCat = getCat(originalDraggedTask.display_period);
            const targetCat = getCat(targetTask.display_period);

            if (draggedCat !== 'ANY' && targetCat !== 'ANY' && draggedCat !== targetCat) {
                alert(`エラー：${originalDraggedTask.display_period}のタスクを${targetTask.display_period}のグループに入れることはできません。`);
                return;
            }

            // ⚡ Firestore の更新
            // 1. ドラッグされたタスクの親IDと表示期間を設定
            await updateTask(draggedId, {
                parent_id: targetId,
                display_period: targetTask.display_period
            });
            // 2. ターゲットタスクの親ID自身をセットして親ノードと識別できるようにする
            await updateTask(targetId, {
                parent_id: targetId
            });
        }
    }, [allTasks]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = allTasks.find(t => String(t.task_id) === String(active.id));
        if (task) {
            draggedTaskRef.current = task;
        }
        setActiveId(String(active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => { // async を追加
        const { active, over } = event;
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const draggedId = String(active.id);
        const overId = String(over.id);
        // メモのドロップ処理
        if (draggedId.startsWith('memo-')) {
            const pureMemoId = draggedId.replace('memo-', '');
            if (overId.startsWith('memo-drop-')) {
                const targetTime = overId.replace('memo-drop-', '');
                setMemos(memos.map(m => String(m.id) === pureMemoId ? { ...m, time: targetTime } : m));
            } else if (overId.includes(':')) {
                setMemos(memos.map(m => String(m.id) === pureMemoId ? { ...m, time: overId } : m));
            }
            return;
        }

        // グループ内部の並び替え
        if (active.id !== over.id) {
            let isInternalSort = false;
            const updatedTasks = allTasks.map((task: any) => {
                if (!task.isGroup || !task.children) return task;

                const hasActive = task.children.some((c: any) => String(c.task_id) === String(active.id));
                const hasOver = task.children.some((c: any) => String(c.task_id) === String(over.id));
                
                if (hasActive && hasOver) {
                    isInternalSort = true;
                    const oldIndex = task.children.findIndex((c: any) => String(c.task_id) === String(active.id));
                    const newIndex = task.children.findIndex((c: any) => String(c.task_id) === String(over.id));
                    return {
                        ...task,
                        children: arrayMove(task.children, oldIndex, newIndex)
                    };
                }
                return task;
            });

            if (isInternalSort) {
                setTasks(updatedTasks);
                return;
            }
        }

        // 時間移動
        if (overId.includes(':')) {
        handleUpdateTaskPeriod(draggedId, overId);
        // ★ここに保存処理を追加
        await updateTask(draggedId, { time: overId }); 
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

        if (groupingMode !== null) {
        if (overId === groupingMode) {
            handleGroupTasks(draggedId, overId);
            // ★ここに保存処理を追加（グループ化＝状態変更とみなす場合）
            await updateTask(draggedId, { /* 必要なら新しいステータスなど */ });
        } else {
            alert("そのグループには追加できません");
        }
    }

    draggedTaskRef.current = null;
    };

    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
        setTasks(
            allTasks.map(task => {
                if (task.task_id === taskId) {
                    return { ...task, status: newStatus };
                }
                if (task.isGroup && task.children) {
                    const hasTargetChild = task.children.some(child => String(child.task_id) === String(taskId));
                    if (hasTargetChild) {
                        const updatedChildren = task.children.map(child => 
                            String(child.task_id) === String(taskId) ? { ...child, status: newStatus } : child
                        );
                        const isAllTreatmentDone = updatedChildren.every(child => 
                            ['completed', 'record_start', 'record_pending', 'record_complete'].includes(child.status)
                        );
                        const isAllRecordDone = updatedChildren.every(child => child.status === 'record_complete');

                        let finalParentStatus = task.status;
                        if (isAllRecordDone) {
                            finalParentStatus = 'record_complete';
                        } else if (isAllTreatmentDone) {
                            finalParentStatus = 'completed';
                        }
                        return { ...task, status: finalParentStatus, children: updatedChildren };
                    }
                }
                return task;
            })
        );
    };

    // const handleStartGrouping = useCallback((taskId: string) => {
    //     setGroupingMode(prev => (prev === taskId ? null : taskId));
    // }, []);

    const handleUngroupTask = async (groupId: string, childTaskId: string, currentPeriod: string) => {
        // 1. 解除された子タスクの親IDをnullにし、新しい表示期間を設定してFirestoreに保存
        await updateTask(childTaskId, {
            parent_id: null,
            display_period: currentPeriod
        });

        // 2. 残ったグループの子タスクが1つだけになる場合、その最後のタスクもグループから解除する
        const targetGroup = allTasks.find(t => t.task_id === groupId);
        if (targetGroup && targetGroup.children) {
            const remainingChildren = targetGroup.children.filter(c => c.task_id !== childTaskId);
            if (remainingChildren.length === 1) {
                const lastChild = remainingChildren[0];
                await updateTask(lastChild.task_id, {
                    parent_id: null
                });
            }
        }
    };

    const handleSaveMemo = (updatedMemo: any) => {
        const exists = memos.some((m) => m.id === updatedMemo.id);
        if (exists) {
            setMemos(memos.map((m) => (m.id === updatedMemo.id ? updatedMemo : m)));
        } else {
            setMemos([...memos, updatedMemo]);
        }
    };

    const handleDeleteMemo = (memoId: string) => {
        if (confirm("このメモを削除してもよろしいですか？")) {
            setMemos(memos.filter((m) => m.id !== memoId));
        }
    };

    const { poolTasks, timedTasks } = useMemo(() => {
        const patientTasks = allTasks.filter(task => selectedPatients.includes(task.patient_id));
        
        // デバッグログ：全タスクの情報を詳細に出力
        patientTasks.forEach(task => {
            const hasColon = task.display_period?.includes(':');
            console.log(`Debug Task: ${task.title}, Period: "${task.display_period}", HasColon: ${hasColon}`);
        });

        return {
            poolTasks: patientTasks.filter(task => !task.display_period || !task.display_period.includes(':')),
            timedTasks: patientTasks.filter(task => task.display_period && task.display_period.includes(':'))
        };
    }, [allTasks, selectedPatients]);
    const hasPendingTasks = timedTasks.some(task => task.status === 'pending');

    console.log("🔍 現在の groupingMode の値:", groupingMode);
    
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
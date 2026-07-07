import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { groupTasks, ungroupTask } from '../utils/taskLogic';
import { useDndCollision } from './useDndCollision';
import type { ExtendedTask, TaskStatus } from '../types/types';
import { useTimelineStore } from '../stores/useTimelineStore'; // ★Zustandをインポート

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

    const [activeId, setActiveId] = useState<string | null>(null);
    const [groupingMode, setGroupingMode] = useState<string | null>(null);
    const draggedTaskRef = useRef<ExtendedTask | null>(null);

    // 1. 状態の宣言部分から、ローカルの loading を一旦無くすか、以下のように変更します
// 🎯 allTasks の中身があるかどうかを直接 loading の判断基準にしてしまうのが一番確実です！

const allTasks = useTimelineStore((state) => state.allTasks);
const memos = useTimelineStore((state) => state.memos);
const setTasks = useTimelineStore((state) => state.setTasks);
const setMemos = useTimelineStore((state) => state.setMemos);

// 💡 ローカルStateとしての loading ではなく、「データが空ならloading」という絶対ルールにする
const loading = allTasks.length === 0; 

useEffect(() => {
    // 💡 すでにデータが存在するなら、二度とフェッチに走らせないガード
    if (allTasks.length > 0) return;

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

            // ⚡ ここでZustandの配列にデータがドカンと入る
            setTasks(mergedTasks);
            
        } catch (err) {
            console.error('タイムラインデータ読み込みエラー:', err);
            // 💡 万が一失敗した時だけ、ダミーでも空配列を入れて loading を強制解除する
            setTasks([]); 
        }
    }

    loadTimelineData();
// ⚠️ 依存配列に allTasks.length を入れることで、「データが入った瞬間」にuseEffectが安全に終了します
}, [setTasks, allTasks.length]);

    // 🎯 3. 各ハンドラーも Zustand ストアの内容を直接更新するように変更
    const handleUpdateTaskPeriod = (taskId: string, newPeriod: string) => {
        setTasks(
            allTasks.map((task) =>
                task.task_id === taskId ? { ...task, display_period: newPeriod } : task
            )
        );
    };

    const handleGroupTasks = useCallback((draggedId: string, targetId: string) => {
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
        }

        // ⚡ Zustandにグループ化後のデータをセット
        setTasks(groupTasks(allTasks, draggedId, targetId));
    }, [allTasks, setTasks]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = allTasks.find(t => String(t.task_id) === String(active.id));
        if (task) {
            draggedTaskRef.current = task;
        }
        setActiveId(String(active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
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

    const handleStartGrouping = useCallback((taskId: string) => {
        setGroupingMode(prev => (prev === taskId ? null : taskId));
    }, []);

    const handleUngroupTask = (groupId: string, childTaskId: string, currentPeriod: string) => {
        setTasks(ungroupTask(allTasks, groupId, childTaskId, currentPeriod));
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
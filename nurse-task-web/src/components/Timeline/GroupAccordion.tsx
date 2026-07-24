import type { ExtendedTask } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';
// 🔥 dnd-kit の並び替え用コンポーネントをインポート
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// 💡 スタイル計算関数をインポート
import { getTaskStyles } from '../../utils/taskStyles';

interface GroupAccordionProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onChildClick: (taskId: string) => void;
}

export const GroupAccordion = ({ task, isExpanded, onChildClick }: GroupAccordionProps) => {
  const groupingMode = useTimelineStore((state) => state.groupingMode);
  if (!isExpanded) return null;

  const childIds = task.children?.map(c => c.task_id) || [];

  return (
    <div className="absolute top-[90%] left-2 w-60 bg-[#1e3a6a] rounded-xl p-2 z-30 shadow-xl border border-blue-900 animate-fade-in max-h-[320px] overflow-y-auto scrollbar-thin">
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        {task.children?.map((child) => (
          <SortableChildItem 
            key={child.task_id} 
            child={child} 
            parentTaskId={task.task_id}
            onChildClick={onChildClick}
          />
        ))}
      </SortableContext>
    </div>
  );
};

const SortableChildItem = ({ child, parentTaskId, onChildClick }: { 
  child: any, parentTaskId: string, onChildClick: any 
}) => {
  const handleUngroupTask = useTimelineStore((state) => state.handleUngroupTask);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: child.task_id });
  const groupingMode = useTimelineStore((state) => state.groupingMode);

  // 🎨 【完璧な同期】
  // 新しくなった getTaskStyles に子フラグを渡して、完璧にトリアージされたスタイルを受け取る
  const { cardColorClass, borderStyle } = getTaskStyles(
    { ...child, isChild: true }, 
    () => false
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // ⏳ 中断中（pending）のときは、ご希望通りの「白い点線の仮カード」と入れ替える
  if (child.status === 'pending') {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-2 rounded-lg border-2 border-dashed border-gray-200 bg-white/90 text-gray-600 text-xs mb-2 text-center font-bold"
        onClick={(e) => { 
          e.stopPropagation(); 
          onChildClick(child.task_id); 
        }}
      >
        <span>【中断・保留中】{child.room_id}号室 {child.patient_name}様</span>
      </div>
    );
  }

  // 💡 【修正完了】
  // getTaskStyles が返してくれた、コントラストのハッキリした色（cardColorClass）をそのまま注入！
  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 rounded-lg text-xs mb-2 cursor-grab active:cursor-grabbing hover:opacity-90 transition-all ${cardColorClass} ${borderStyle}`}
      onClick={(e) => { 
        e.stopPropagation(); 
        // 🎯 モード中ならグループ化操作、そうでなければ詳細ポップアップという分岐
        if (groupingMode !== null) {
          console.log("グループ化対象として選択されました:", child.task_id);
        } else {
          onChildClick?.(child.task_id); // ★ ?. を追加！
        }
      }}
    >
      <div className="font-bold flex justify-between items-center mb-0.5">
        <span className="opacity-75">{child.room_id}号室</span>
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => { 
              e.stopPropagation(); 
              
              // 💡 ストアに子タスクのIDを渡すだけ！あとはストアが勝手に同じ行に戻してくれます
              handleUngroupTask(child.task_id);
            }}
            className="!bg-black/10 hover:!bg-black/20 !text-current !px-1.5 !py-0.5 !rounded !font-bold transition-colors cursor-pointer"
          >
            外す
          </button>
      </div>
      
      {/* 📝 タイトルの前に、記録状態が一瞬でわかる絵文字（🔵 🟢 🟠 ✅）を自動で添える */}
      <div className="font-black text-sm flex items-center gap-1">
        {child.status === 'completed' && <span className="text-xs select-none">🔵</span>}
        {child.status === 'record_start' && <span className="text-xs select-none">🟢</span>}
        {child.status === 'record_pending' && <span className="text-xs select-none">🟠</span>}
        {child.status === 'record_complete' && <span className="text-xs select-none">✅</span>}
        <span>{child.patient_name}様</span>
      </div>
      
      <div className="opacity-90 mt-0.5">{child.title}</div>
    </div>
  );
};
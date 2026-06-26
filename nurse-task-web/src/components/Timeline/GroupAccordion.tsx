import type { ExtendedTask } from '../../types/types';
// 🔥 dnd-kit の並び替え用コンポーネントをインポート
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// 💡 スタイル計算関数をインポート（※ パスは環境に合わせて適宜調整してください）
import { getTaskStyles } from '../../utils/taskStyles';

interface GroupAccordionProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onChildClick: (taskId: string) => void;
  onUngroup: (groupId: string, childId: string, period: string) => void;
}

export const GroupAccordion = ({ task, isExpanded, onChildClick, onUngroup }: GroupAccordionProps) => {
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
            onUngroup={onUngroup}
          />
        ))}
      </SortableContext>
    </div>
  );
};

const SortableChildItem = ({ child, parentTaskId, onChildClick, onUngroup }: { 
  child: any, parentTaskId: string, onChildClick: any, onUngroup: any 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.task_id,
  });

  // 💡 【復活！】子タスクのステータスや重要度に応じた色と枠線をここで計算する
  const { cardColorClass, borderStyle } = getTaskStyles(
    { ...child, isChild: true }, // 子フラグを立てて計算に回す
    () => false
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // ⏳ 中断中（pending）のときは、ご希望通りの「白い点線の仮カード」と入れ替える（ここはこのままでOK！）
  if (child.status === 'pending') {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-2 rounded-lg border-2 border-dashed border-gray-200 bg-white/90 text-gray-400 text-xs mb-2 text-center font-bold"
        onClick={(e) => { 
          e.stopPropagation(); 
          onChildClick(child.task_id); 
        }}
      >
        <span>【中断・保留中】{child.room_id}号室 {child.patient_name}様</span>
      </div>
    );
  }

  // 💡 通常時（実施中や未着手など）は、真っ白（bg-white）に戻さず、計算した色が当たるように修正！
  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // 👇 ここを修正：固定の bg-white border を排除し、計算された cardColorClass と borderStyle を注入
      className={`p-2 rounded-lg text-xs mb-2 cursor-grab active:cursor-grabbing hover:opacity-90 transition-all ${cardColorClass} ${borderStyle}`}
      onClick={(e) => { 
        e.stopPropagation(); 
        onChildClick(child.task_id); 
      }}
    >
      <div className="font-bold flex justify-between items-center mb-0.5">
        <span className="opacity-75">{child.room_id}号室</span>
        <button 
          type="button"
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onUngroup(parentTaskId, child.task_id, child.display_period); 
          }}
          // 👇 文字が白抜きになったときも見やすいように、少し透過するボタン配色に
          className="bg-black/10 hover:bg-black/20 text-current px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer"
        >
          外す
        </button>
      </div>
      <div className="font-black text-sm">{child.patient_name}様</div>
      <div className="opacity-80">{child.title}</div>
    </div>
  );
};
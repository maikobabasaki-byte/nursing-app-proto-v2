import type { ExtendedTask } from '../../types/types';
// 🔥 dnd-kit の並び替え用コンポーネントをインポート
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GroupAccordionProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onChildClick: (taskId: string) => void;
  onUngroup: (groupId: string, childId: string, period: string) => void;
}

export const GroupAccordion = ({ task, isExpanded, onChildClick, onUngroup }: GroupAccordionProps) => {
  if (!isExpanded) return null;

  // dnd-kit用に、子要素のIDだけの配列を作ります
  const childIds = task.children?.map(c => c.task_id) || [];

  return (
    <div className="absolute top-[90%] left-2 w-60 bg-[#1e3a6a] rounded-xl p-2 z-30 shadow-xl border border-blue-900 animate-fade-in max-h-[320px] overflow-y-auto scrollbar-thin">
      {/* 🔥 子要素のループ全体を SortableContext で囲む */}
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

// 🔥 ドラッグ可能にするための子要素専用のミニコンポーネント
const SortableChildItem = ({ child, parentTaskId, onChildClick, onUngroup }: { 
  child: any, parentTaskId: string, onChildClick: any, onUngroup: any 
}) => {
  // useSortable フックを使って、このカードをドラッグ可能にする
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.task_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // ドラッグ中は少し透明にする
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners} // これでカード全体が掴み手（ハンドル）になります
      className="p-2 rounded-lg border shadow-sm text-xs bg-white text-gray-800 mb-2 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors"
      onClick={(e) => { 
        e.stopPropagation(); 
        onChildClick(child.task_id); 
      }}
    >
      <div className="font-bold flex justify-between items-center mb-0.5">
        <span className="opacity-75">{child.room_id}号室</span>
        <button 
          type="button"
          // ⚠️ ボタンを押したときにドラッグが暴発しないように listeners をブロック
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onUngroup(parentTaskId, child.task_id, child.display_period); 
          }}
          className="bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer"
        >
          外す
        </button>
      </div>
      <div className="font-black text-sm">{child.patient_name}様</div>
      <div className="opacity-80">{child.title}</div>
    </div>
  );
};
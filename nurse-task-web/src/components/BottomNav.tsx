import { useTimelineStore } from '../stores/useTimelineStore';

interface BottomNavProps {
  currentScreen: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings';
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings') => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const currentUser = useTimelineStore((state) => state.currentUser);
  const isLeader = currentUser?.is_leader === true;

  const isMasterActive = currentScreen === 'patientMaster' || currentScreen === 'patientSelect';

  const navItems = [
    {
      id: 'patientMaster' as const,
      label: '患者マスター',
      icon: 'account_circle',
      active: isMasterActive,
    },
    {
      id: 'timeline' as const,
      label: 'タイムライン',
      icon: 'event_note',
      active: currentScreen === 'timeline',
    },
    {
      id: 'map' as const,
      label: 'マップ',
      icon: 'pin_drop',
      active: currentScreen === 'map',
    },
    ...(isLeader ? [{
      id: 'leaderTodo' as const,
      label: 'リーダーTODO',
      icon: 'add_task',
      active: currentScreen === 'leaderTodo',
    }] : []),
    {
      id: 'settings' as const,
      label: '設定',
      icon: 'settings',
      active: currentScreen === 'settings',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-sky-200 backdrop-blur-md border-t border-slate-200 flex md:hidden items-center justify-around px-1 shadow-lg">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer select-none ${
            item.active 
              ? 'text-sky-600 font-extrabold' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <span className={`material-symbols-outlined text-xl transition-transform ${item.active ? 'scale-110' : ''}`}>
            {item.icon}
          </span>
          <span className="text-[10px] tracking-tighter mt-0.5 whitespace-nowrap">
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

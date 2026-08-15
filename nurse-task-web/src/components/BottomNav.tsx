import { useTimelineStore } from '../stores/useTimelineStore';
import { useTheme, type AppTheme } from '../hooks/useTheme';

interface BottomNavProps {
  currentScreen: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings';
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings') => void;
}

// 🖼️ 全カラーテーマ共通：アクティブ時（選択中）アイコン画像パス（/icon_active/ フォルダ）
const ACTIVE_NAV_ICONS: Record<string, string> = {
  account_circle: '/icon_active/account_circle_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  event_note: '/icon_active/event_note_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  pin_drop: '/icon_active/pin_drop_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  add_task: '/icon_active/add_task_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  settings: '/icon_active/settings_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
};

// 🎨 各テーマ別：非アクティブ（通常時）アイコン画像パス
const INACTIVE_NAV_ICONS: Record<AppTheme, Record<string, string>> = {
  vital: {
    account_circle: '/icon_b/account_circle_48dp.png',
    event_note: '/icon_b/event_note_48dp.png',
    pin_drop: '/icon_b/pin_drop_48dp.png',
    add_task: '/icon_b/add_task_48dp_1A365D.png',
    settings: '/icon_b/settings_48dp.png',
  },
  serene: {
    account_circle: '/icon_s/account_circle_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/icon_s/event_note_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/icon_s/pin_drop_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/icon_s/add_task_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    settings: '/icon_s/settings_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  },
  dark: {
    account_circle: '/icon_g/account_circle_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/icon_g/event_note_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/icon_g/pin_drop_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/icon_g/add_task_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    settings: '/icon_g/settings_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
  },
};

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const { theme, currentConfig } = useTheme();
  const currentUser = useTimelineStore((state) => state.currentUser);
  const isLeader = currentUser?.is_leader === true;

  const isMasterActive = currentScreen === 'patientMaster' || currentScreen === 'patientSelect';
  const inactiveIcons = INACTIVE_NAV_ICONS[theme] || INACTIVE_NAV_ICONS.vital;

  const navItems = [
    {
      id: 'patientMaster' as const,
      label: '患者マスター',
      iconKey: 'account_circle',
      active: isMasterActive,
    },
    {
      id: 'timeline' as const,
      label: 'タイムライン',
      iconKey: 'event_note',
      active: currentScreen === 'timeline',
    },
    {
      id: 'map' as const,
      label: 'マップ',
      iconKey: 'pin_drop',
      active: currentScreen === 'map',
    },
    ...(isLeader ? [{
      id: 'leaderTodo' as const,
      label: 'リーダーTODO',
      iconKey: 'add_task',
      active: currentScreen === 'leaderTodo',
    }] : []),
    {
      id: 'settings' as const,
      label: '設定',
      iconKey: 'settings',
      active: currentScreen === 'settings',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-white/10 flex md:hidden items-center justify-around px-1 shadow-2xl transition-colors duration-300"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      {navItems.map((item) => {
        const iconSrc = item.active
          ? ACTIVE_NAV_ICONS[item.iconKey]
          : inactiveIcons[item.iconKey];

        return (
          <button
            key={item.id}
            id={item.id === 'settings' ? 'bottom-nav-settings' : `bottom-nav-${item.id}`}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-300 cursor-pointer select-none"
          >
            <img
              src={iconSrc}
              alt={item.label}
              className={`w-6 h-6 object-contain transition-all duration-300 ${item.active ? 'scale-110 drop-shadow-md' : 'opacity-85 hover:opacity-100'}`}
            />
            <span
              className={`text-[10px] tracking-tighter mt-0.5 whitespace-nowrap transition-all duration-300 ${
                item.active ? 'font-black' : 'font-bold'
              }`}
              style={{ color: item.active ? '#155DFC' : currentConfig.accentColor }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

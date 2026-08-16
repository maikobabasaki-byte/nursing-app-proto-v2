import { useTimer } from "../hooks/useTimer";
import { useUserName } from "../hooks/useUserName";
import { useLogout } from '../hooks/useLogout';
import { useTheme, type AppTheme } from '../hooks/useTheme';

interface HeaderProps {
  currentPage: "login" | "patientSelect";
}

// 🎨 各テーマ別ログアウトSVG画像
const LOGOUT_ICONS: Record<AppTheme, string> = {
  vital: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231A365D"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
  serene: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FAF3E0"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
  dark: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232DD4BF"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
};

export default function Header({ currentPage }: HeaderProps) {
  const { time } = useTimer();
  const isLoggedIn = currentPage !== "login";
  const logout = useLogout();
  const userName = useUserName();
  const { theme, currentConfig } = useTheme();
  const logoutIconSrc = LOGOUT_ICONS[theme] || LOGOUT_ICONS.vital;

  return (
    <header
      className="h-18 flex items-center px-4 shadow-md shrink-0 transition-colors duration-300"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      <h1 className="flex items-center gap-2">
        <img
          src="/app/icon_b/local_hospital_48dp.png"
          alt="NurseFlowApp"
          className="size-12"
        />
        <span
          className="text-xl font-bold tracking-tight transition-colors duration-300"
          style={{ color: currentConfig.accentColor }}
        >
          NurseFlowApp
        </span>
      </h1>

      {isLoggedIn && (
        <div
          className="ml-auto text-sm flex items-center gap-4 transition-colors duration-300"
          style={{ color: currentConfig.accentColor }}
        >
          <div>
            <p className="font-medium">現在時刻：<span id="header-time" className="font-bold">{time}</span></p>
            <p className="font-medium">ログイン者：<span className="font-bold">{userName}</span></p>
          </div>

          <div
            className="cursor-pointer text-center text-xs hover:opacity-80 transition-opacity"
            onClick={logout}
          >
            <img
              src={logoutIconSrc}
              alt="ログアウト"
              className="mx-auto w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/app/icon_b/logout_48dp.png";
              }}
            />
            <p className="font-bold mt-0.5">ログアウト</p>
          </div>
        </div>
      )}
    </header>
  );
}
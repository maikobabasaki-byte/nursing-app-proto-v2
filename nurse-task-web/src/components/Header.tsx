import { useTimer } from "../hooks/useTimer";

interface HeaderProps {
  currentPage: "login" | "patientSelect";
}

export default function Header({ currentPage }: HeaderProps) {
  const { time } = useTimer();
  const isLoggedIn = currentPage !== "login";

  return (
    <header className="h-18 bg-sky-200 text-slate-900 flex items-center px-4 shadow-md shrink-0">
      <h1 className="flex items-center gap-2">
        <img
          src="/icon_b/local_hospital_48dp.png"
          alt="NurseFlowApp"
          className="size-12"
        />
        <span className="text-xl font-medium tracking-tight">
          NurseFlowApp
        </span>
      </h1>

      {isLoggedIn && (
        <div className="ml-auto text-sm flex items-center gap-4 text-gray-700">
          <div>
          <p>現在時刻：<span id="header-time">{time}</span></p>
          <p>ログイン者：<span id="header-user-name">---</span></p>
        </div>

          <div className="cursor-pointer text-center text-xs">
            <img
              src="/icon_b/logout_48dp.png"
              alt="ログアウト"
              className="mx-auto w-6 h-6"
            />
            <p>ログアウト</p>
          </div>
        </div>
      )}
    </header>
  );
}
export default function Header() {
  return (
    <header className="h-18 bg-sky-200 text-slate-900 flex items-center px-4 shadow-md shrink-0">
      <h1 className="flex items-center gap-2">
        <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlowApp" className="size-12"/>
        <span className="text-xl font-medium tracking-tight">NurseFlowApp</span>
      </h1>
    </header>
  );
}
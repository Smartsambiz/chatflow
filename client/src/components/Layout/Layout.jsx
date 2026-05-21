import { Outlet, NavLink, useNavigate } from "react-router-dom";

function Layout(){
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    const handleLogout = ()=>{
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    }

    const navItems = [
        { to: '/', label: 'Dashboard', icon: 'D', end: true },
        { to: '/inbox', label: 'Inbox', icon: 'I' },
        { to: '/settings', label: 'Settings', icon: 'S' },
    ]

    return (
        <div className="flex min-h-screen bg-[#f4f7f2] text-slate-900">
            <aside className="hidden w-72 shrink-0 border-r border-emerald-950/10 bg-white/85 shadow-[14px_0_40px_rgba(15,23,42,0.05)] backdrop-blur lg:flex lg:flex-col">
                <div className="border-b border-emerald-950/10 p-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-600/25">
                            C
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-950">ChatFlow</h1>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">WhatsApp growth</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 p-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({isActive})=>`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                                isActive
                                    ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/10'
                                    : 'text-slate-600 hover:bg-emerald-50 hover:text-slate-950'
                            }`}
                        >
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-xs font-black ring-1 ring-black/5 group-hover:bg-white">
                                {item.icon}
                            </span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="m-4 rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 to-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workspace</p>
                    <p className="mt-2 truncate text-sm font-bold text-slate-900">{user.businessName || 'Your business'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{user.ownerName || 'Account owner'}</p>
                </div>

                <div className="border-t border-emerald-950/10 p-4">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50">
                        Logout
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center justify-between border-b border-emerald-950/10 bg-white/85 px-4 py-4 backdrop-blur lg:hidden">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 font-black text-white">C</div>
                        <div>
                            <p className="font-black text-slate-950">ChatFlow</p>
                            <p className="text-xs text-slate-500">{user.businessName || 'WhatsApp growth'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                        Logout
                    </button>
                </header>
                <Outlet/>
                <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 gap-2 rounded-3xl border border-emerald-950/10 bg-white/95 p-2 shadow-2xl shadow-slate-950/15 backdrop-blur lg:hidden">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({isActive})=>`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                                isActive
                                    ? 'bg-slate-950 text-white'
                                    : 'text-slate-500 hover:bg-emerald-50 hover:text-slate-950'
                            }`}
                        >
                            <span className="text-sm">{item.icon}</span>
                            <span className="mt-1">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    )
}


export default Layout

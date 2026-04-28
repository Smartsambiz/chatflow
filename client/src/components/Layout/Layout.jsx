import { Outlet, NavLink, useNavigate } from "react-router-dom";

function Layout(){
    const navigate = useNavigate();

    const handleLogout = ()=>{
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">

                {/* Logo */}
                <div className="p-6 border-b border-gray-200">
                    <h1 className="p-6 border-b border-gray-200">ChatFlow</h1>
                    <p className="text-xs text-gray-500 mt-1">WhatsApp Growth Tool</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    <NavLink 
                        to="/" 
                        end
                        className={({isActive})=>`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors  
                        ${isActive 
                            ? 'bg-green-500 text-green-700' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            Dashboard
                    </NavLink>

                    <NavLink
                        to="/inbox"
                        className={({isActive})=>`
                            flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colours 
                            ${isActive ? 'bg-green-500 text-green-700' : 'text-gray-600 hover:bg-gray-200'}
                        `} 
                    >
                        Inbox
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({isActive})=>`
                            flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colours 
                            ${isActive ? 'bg-green-500 text-green-700' : 'text-gray-600 hover:bg-gray-200'}
                        `} 
                    >
                        Settings
                    </NavLink>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            Logout
                        </button>

                </div>

            </div>

            {/* Main content. Outlet renders the current page */}
            <div className="flex-1 overflow-hidden">
                <Outlet/>
            </div>
        </div>
    )
}


export default Layout

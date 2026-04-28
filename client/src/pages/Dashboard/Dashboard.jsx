function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800">
        Welcome back, {user.ownerName} 👋
      </h1>
      <p className="text-gray-500 mt-1">{user.businessName}</p>

      <div className="grid grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Messages Today</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Active Leads</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
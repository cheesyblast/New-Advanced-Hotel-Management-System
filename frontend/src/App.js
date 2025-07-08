import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR', currency_symbol: 'Rs.', hotel_name: 'Hotel Management System' });

  // Authentication
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('hotel_token');
    if (token) {
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsRes = await axios.get(`${API}/dashboard/stats`);
      setDashboardStats(statsRes.data);
      
      const roomsRes = await axios.get(`${API}/rooms`);
      setRooms(roomsRes.data);
      
      const settingsRes = await axios.get(`${API}/settings`);
      setSettings(settingsRes.data);
      
      const roomStatusRes = await axios.get(`${API}/dashboard/room-status`);
      setRoomStatuses(roomStatusRes.data);
      
      const guestsRes = await axios.get(`${API}/guests`);
      setGuests(guestsRes.data);
      
      const bookingsRes = await axios.get(`${API}/bookings`);
      setBookings(bookingsRes.data);
      
      const expensesRes = await axios.get(`${API}/expenses`);
      setExpenses(expensesRes.data);
      
      const salesRes = await axios.get(`${API}/sales`);
      setSales(salesRes.data);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/admin/login`, loginData);
      
      localStorage.setItem('hotel_token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setAdminData(response.data);
      setIsAuthenticated(true);
      
      loadDashboardData();
      
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hotel_token');
    setIsAuthenticated(false);
    setAdminData(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="https://images.unsplash.com/photo-1498503403619-e39e4ff390fe" 
              alt="Hotel" 
              className="w-20 h-20 mx-auto rounded-full mb-4 object-cover"
            />
            <h1 className="text-3xl font-bold text-gray-800">Hotel Management</h1>
            <p className="text-gray-600">Admin Login</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            >
              Login
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo Admin: admin / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="https://images.unsplash.com/photo-1498503403619-e39e4ff390fe" 
                alt="Hotel" 
                className="w-8 h-8 rounded-full mr-3 object-cover"
              />
              <h1 className="text-xl font-semibold text-gray-900">{settings.hotel_name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, Admin</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-8">
            {['dashboard', 'rooms', 'guests', 'bookings', 'expenses', 'sales', 'reports', 'settings'].map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`capitalize px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === view
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </nav>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">R</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Rooms</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats?.total_rooms || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Available Rooms</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats?.available_rooms || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">B</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats?.total_bookings || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">₹</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                        <dd className="text-lg font-medium text-gray-900">{settings.currency_symbol}{dashboardStats?.total_revenue || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Status Grid */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Room Status - Quick View</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {roomStatuses.map((room) => (
                    <div
                      key={room.room_id}
                      className={`relative p-4 rounded-lg border-2 text-center ${
                        room.status === 'available' ? 'border-green-300 bg-green-50' :
                        room.status === 'occupied' ? 'border-red-300 bg-red-50' :
                        'border-yellow-300 bg-yellow-50'
                      }`}
                    >
                      <div className="text-lg font-semibold text-gray-900">{room.room_number}</div>
                      <div className="text-xs text-gray-600 capitalize">{room.room_type}</div>
                      <div className={`mt-2 text-xs font-medium ${
                        room.status === 'available' ? 'text-green-700' :
                        room.status === 'occupied' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {room.status === 'available' ? 'Available' :
                         room.status === 'occupied' ? 'Occupied' : 'Reserved'}
                      </div>
                      {room.guest_name && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{room.guest_name}</div>
                      )}
                      {room.check_out_date && (
                        <div className="text-xs text-gray-500">Out: {room.check_out_date}</div>
                      )}
                      <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                        room.status === 'available' ? 'bg-green-400' :
                        room.status === 'occupied' ? 'bg-red-400' :
                        'bg-yellow-400'
                      }`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rooms View */}
        {currentView === 'rooms' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div key={room.room_id} className="bg-white overflow-hidden shadow rounded-lg">
                  <img 
                    src="https://images.unsplash.com/photo-1544097935-909a55214c81" 
                    alt="Room" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Room {room.room_number}</h3>
                        <p className="text-sm text-gray-500 capitalize">{room.room_type}</p>
                        <p className="text-lg font-semibold text-gray-900">{settings.currency_symbol}{room.price_per_night}/night</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        room.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Max Occupancy: {room.max_occupancy}</p>
                      <p className="text-sm text-gray-600">Amenities: {room.amenities.join(', ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Views Placeholder */}
        {currentView !== 'dashboard' && currentView !== 'rooms' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">{currentView}</h2>
            <p className="text-gray-600 mt-4">This section is under development.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
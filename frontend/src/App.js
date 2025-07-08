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
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availabilityDates, setAvailabilityDates] = useState({
    check_in: '',
    check_out: '',
    room_type: ''
  });

  // Authentication
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  // Form data
  const [roomData, setRoomData] = useState({
    room_number: '',
    room_type: 'single',
    price_per_night: '',
    amenities: '',
    max_occupancy: '',
    description: ''
  });

  const [guestData, setGuestData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    id_proof: ''
  });

  const [bookingData, setBookingData] = useState({
    room_id: '',
    guest_id: '',
    check_in: '',
    check_out: '',
    guests_count: '',
    special_requests: ''
  });

  const [expenseData, setExpenseData] = useState({
    category: '',
    amount: '',
    description: '',
    date: ''
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
      const [statsRes, roomsRes, guestsRes, bookingsRes, expensesRes, salesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/rooms`),
        axios.get(`${API}/guests`),
        axios.get(`${API}/bookings`),
        axios.get(`${API}/expenses`),
        axios.get(`${API}/sales`)
      ]);

      setDashboardStats(statsRes.data);
      setRooms(roomsRes.data);
      setGuests(guestsRes.data);
      setBookings(bookingsRes.data);
      setExpenses(expensesRes.data);
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
      setIsAuthenticated(true);
      setAdminData(response.data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      await loadDashboardData();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hotel_token');
    setIsAuthenticated(false);
    setAdminData(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      const amenitiesArray = roomData.amenities.split(',').map(a => a.trim());
      const response = await axios.post(`${API}/rooms`, {
        ...roomData,
        amenities: amenitiesArray,
        price_per_night: parseFloat(roomData.price_per_night),
        max_occupancy: parseInt(roomData.max_occupancy)
      });
      setRooms([...rooms, response.data]);
      setShowAddRoom(false);
      setRoomData({
        room_number: '',
        room_type: 'single',
        price_per_night: '',
        amenities: '',
        max_occupancy: '',
        description: ''
      });
      loadDashboardData();
    } catch (error) {
      alert('Error adding room: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/guests`, guestData);
      setGuests([...guests, response.data]);
      setShowAddGuest(false);
      setGuestData({
        name: '',
        email: '',
        phone: '',
        address: '',
        id_proof: ''
      });
    } catch (error) {
      alert('Error adding guest: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleAddBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/bookings`, {
        ...bookingData,
        guests_count: parseInt(bookingData.guests_count)
      });
      setBookings([...bookings, response.data]);
      setShowAddBooking(false);
      setBookingData({
        room_id: '',
        guest_id: '',
        check_in: '',
        check_out: '',
        guests_count: '',
        special_requests: ''
      });
      loadDashboardData();
    } catch (error) {
      alert('Error adding booking: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/expenses`, {
        ...expenseData,
        amount: parseFloat(expenseData.amount)
      });
      setExpenses([...expenses, response.data]);
      setShowAddExpense(false);
      setExpenseData({
        category: '',
        amount: '',
        description: '',
        date: ''
      });
      loadDashboardData();
    } catch (error) {
      alert('Error adding expense: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const checkAvailability = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/rooms/availability`, availabilityDates);
      setAvailableRooms(response.data);
    } catch (error) {
      alert('Error checking availability: ' + error.response?.data?.detail || 'Unknown error');
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${newStatus}`);
      loadDashboardData();
    } catch (error) {
      alert('Error updating booking status: ' + error.response?.data?.detail || 'Unknown error');
    }
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
              <h1 className="text-xl font-semibold text-gray-900">Hotel Management System</h1>
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
            {['dashboard', 'rooms', 'guests', 'bookings', 'expenses', 'sales', 'reports'].map((view) => (
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
                        <span className="text-white font-bold text-sm">$</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                        <dd className="text-lg font-medium text-gray-900">${dashboardStats?.total_revenue || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Availability Check */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Check Room Availability</h3>
                <form onSubmit={checkAvailability} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                    <input
                      type="date"
                      value={availabilityDates.check_in}
                      onChange={(e) => setAvailabilityDates({...availabilityDates, check_in: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                    <input
                      type="date"
                      value={availabilityDates.check_out}
                      onChange={(e) => setAvailabilityDates({...availabilityDates, check_out: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                    <select
                      value={availabilityDates.room_type}
                      onChange={(e) => setAvailabilityDates({...availabilityDates, room_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="suite">Suite</option>
                      <option value="deluxe">Deluxe</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Check Availability
                    </button>
                  </div>
                </form>

                {availableRooms.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Available Rooms</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {availableRooms.map((room) => (
                        <div key={room.room_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">Room {room.room_number}</h5>
                              <p className="text-sm text-gray-500 capitalize">{room.room_type}</p>
                              <p className="text-sm text-gray-600">${room.price_per_night}/night</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Available
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rooms View */}
        {currentView === 'rooms' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
              <button
                onClick={() => setShowAddRoom(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Room
              </button>
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
                        <p className="text-lg font-semibold text-gray-900">${room.price_per_night}/night</p>
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

            {/* Add Room Modal */}
            {showAddRoom && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Room</h3>
                  <form onSubmit={handleAddRoom} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                      <input
                        type="text"
                        value={roomData.room_number}
                        onChange={(e) => setRoomData({...roomData, room_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                      <select
                        value={roomData.room_type}
                        onChange={(e) => setRoomData({...roomData, room_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="suite">Suite</option>
                        <option value="deluxe">Deluxe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night</label>
                      <input
                        type="number"
                        value={roomData.price_per_night}
                        onChange={(e) => setRoomData({...roomData, price_per_night: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Occupancy</label>
                      <input
                        type="number"
                        value={roomData.max_occupancy}
                        onChange={(e) => setRoomData({...roomData, max_occupancy: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
                      <input
                        type="text"
                        value={roomData.amenities}
                        onChange={(e) => setRoomData({...roomData, amenities: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="WiFi, TV, AC, Mini Bar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={roomData.description}
                        onChange={(e) => setRoomData({...roomData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Room
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddRoom(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guests View */}
        {currentView === 'guests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Guests</h2>
              <button
                onClick={() => setShowAddGuest(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Guest
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {guests.map((guest) => (
                  <li key={guest.guest_id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">{guest.name.charAt(0)}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                            <div className="text-sm text-gray-500">{guest.email}</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>{guest.phone}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add Guest Modal */}
            {showAddGuest && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Guest</h3>
                  <form onSubmit={handleAddGuest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={guestData.name}
                        onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={guestData.email}
                        onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={guestData.phone}
                        onChange={(e) => setGuestData({...guestData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={guestData.address}
                        onChange={(e) => setGuestData({...guestData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof</label>
                      <input
                        type="text"
                        value={guestData.id_proof}
                        onChange={(e) => setGuestData({...guestData, id_proof: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddGuest(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings View */}
        {currentView === 'bookings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
              <button
                onClick={() => setShowAddBooking(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Booking
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <li key={booking.booking_id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">{booking.room_number}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{booking.guest_name}</div>
                            <div className="text-sm text-gray-500">{booking.guest_email}</div>
                            <div className="text-sm text-gray-500">
                              {booking.check_in} to {booking.check_out}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-500">
                            <p>${booking.total_amount}</p>
                          </div>
                          <div className="flex space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                              booking.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.status}
                            </span>
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => updateBookingStatus(booking.booking_id, 'checked_in')}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              >
                                Check In
                              </button>
                            )}
                            {booking.status === 'checked_in' && (
                              <button
                                onClick={() => updateBookingStatus(booking.booking_id, 'checked_out')}
                                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                              >
                                Check Out
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add Booking Modal */}
            {showAddBooking && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Booking</h3>
                  <form onSubmit={handleAddBooking} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                      <select
                        value={bookingData.room_id}
                        onChange={(e) => setBookingData({...bookingData, room_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Room</option>
                        {rooms.map((room) => (
                          <option key={room.room_id} value={room.room_id}>
                            Room {room.room_number} ({room.room_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guest</label>
                      <select
                        value={bookingData.guest_id}
                        onChange={(e) => setBookingData({...bookingData, guest_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Guest</option>
                        {guests.map((guest) => (
                          <option key={guest.guest_id} value={guest.guest_id}>
                            {guest.name} ({guest.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={bookingData.check_in}
                        onChange={(e) => setBookingData({...bookingData, check_in: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={bookingData.check_out}
                        onChange={(e) => setBookingData({...bookingData, check_out: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
                      <input
                        type="number"
                        value={bookingData.guests_count}
                        onChange={(e) => setBookingData({...bookingData, guests_count: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                      <textarea
                        value={bookingData.special_requests}
                        onChange={(e) => setBookingData({...bookingData, special_requests: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddBooking(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expenses View */}
        {currentView === 'expenses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
              <button
                onClick={() => setShowAddExpense(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Expense
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <li key={expense.expense_id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.category}</div>
                          <div className="text-sm text-gray-500">{expense.description}</div>
                          <div className="text-sm text-gray-500">{expense.date}</div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${expense.amount}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add Expense Modal */}
            {showAddExpense && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Expense</h3>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={expenseData.category}
                        onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="utilities">Utilities</option>
                        <option value="staff">Staff</option>
                        <option value="supplies">Supplies</option>
                        <option value="marketing">Marketing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={expenseData.amount}
                        onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={expenseData.date}
                        onChange={(e) => setExpenseData({...expenseData, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Expense
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddExpense(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sales View */}
        {currentView === 'sales' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <li key={sale.sale_id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Booking: {sale.booking_id}</div>
                          <div className="text-sm text-gray-500">{sale.payment_method}</div>
                          <div className="text-sm text-gray-500">{sale.date}</div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${sale.amount}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Reports View */}
        {currentView === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Revenue</span>
                      <span className="text-sm font-medium text-gray-900">${dashboardStats?.total_revenue || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Expenses</span>
                      <span className="text-sm font-medium text-gray-900">${dashboardStats?.total_expenses || 0}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-sm font-medium text-gray-900">Net Profit</span>
                      <span className={`text-sm font-medium ${
                        (dashboardStats?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${dashboardStats?.net_profit || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Rooms</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats?.total_rooms || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Occupied Rooms</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats?.occupied_rooms || 0}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-sm font-medium text-gray-900">Occupancy Rate</span>
                      <span className="text-sm font-medium text-gray-900">
                        {dashboardStats?.occupancy_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
#!/usr/bin/env python3
import requests
import json
import time

# Test the Hotel Management System login and dashboard access
BACKEND_URL = "https://204c90d5-917b-4eac-9a9e-95f268b984fe.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

print("🧪 Testing Hotel Management System Login Flow...")

# Test 1: Login
print("\n1. Testing Login API...")
login_data = {
    "username": "admin",
    "password": "admin123"
}

try:
    response = requests.post(f"{API_URL}/admin/login", json=login_data)
    if response.status_code == 200:
        login_result = response.json()
        token = login_result["access_token"]
        print(f"✅ Login successful - Token: {token[:20]}...")
        
        # Test 2: Dashboard access
        print("\n2. Testing Dashboard Access...")
        headers = {"Authorization": f"Bearer {token}"}
        
        dashboard_response = requests.get(f"{API_URL}/dashboard/stats", headers=headers)
        if dashboard_response.status_code == 200:
            stats = dashboard_response.json()
            print(f"✅ Dashboard access successful - Stats: {stats}")
            
            # Test 3: Room creation
            print("\n3. Testing Room Creation...")
            room_data = {
                "room_number": "101",
                "room_type": "deluxe",
                "price_per_night": 150.0,
                "amenities": ["WiFi", "TV", "AC"],
                "max_occupancy": 2,
                "description": "Test room"
            }
            
            room_response = requests.post(f"{API_URL}/rooms", json=room_data, headers=headers)
            if room_response.status_code == 200:
                room_result = room_response.json()
                print(f"✅ Room creation successful - Room ID: {room_result['room_id']}")
                
                # Test 4: Expense creation
                print("\n4. Testing Expense Creation...")
                expense_data = {
                    "category": "maintenance",
                    "amount": 500.0,
                    "description": "Test expense",
                    "date": "2024-01-01"
                }
                
                expense_response = requests.post(f"{API_URL}/expenses", json=expense_data, headers=headers)
                if expense_response.status_code == 200:
                    expense_result = expense_response.json()
                    print(f"✅ Expense creation successful - Expense ID: {expense_result['expense_id']}")
                else:
                    print(f"❌ Expense creation failed - Status: {expense_response.status_code}, Error: {expense_response.text}")
                    
            else:
                print(f"❌ Room creation failed - Status: {room_response.status_code}, Error: {room_response.text}")
                
        else:
            print(f"❌ Dashboard access failed - Status: {dashboard_response.status_code}, Error: {dashboard_response.text}")
            
    else:
        print(f"❌ Login failed - Status: {response.status_code}, Error: {response.text}")
        
except Exception as e:
    print(f"❌ Test failed with exception: {str(e)}")

print("\n🏁 Testing completed!")
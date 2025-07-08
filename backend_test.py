#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta
import sys
import os
import time

# Get the backend URL from the frontend .env file
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BACKEND_URL = line.strip().split('=')[1].strip('"\'')
            break

# Add /api prefix to the backend URL
API_URL = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Test results
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, message=""):
    """Log test results"""
    status = "PASSED" if passed else "FAILED"
    print(f"[{status}] {name}: {message}")
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def test_admin_login():
    """Test admin login with correct and incorrect credentials"""
    print("\n=== Testing Admin Authentication System ===")
    
    # Test with correct credentials
    response = requests.post(
        f"{API_URL}/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200 and "access_token" in response.json():
        log_test("Admin Login - Correct Credentials", True, "Successfully logged in with correct credentials")
        token = response.json()["access_token"]
    else:
        log_test("Admin Login - Correct Credentials", False, 
                f"Failed to login with correct credentials. Status: {response.status_code}, Response: {response.text}")
        token = None
    
    # Test with incorrect credentials
    response = requests.post(
        f"{API_URL}/admin/login",
        json={"username": ADMIN_USERNAME, "password": "wrongpassword"}
    )
    
    if response.status_code == 401:
        log_test("Admin Login - Incorrect Credentials", True, "Correctly rejected login with wrong password")
    else:
        log_test("Admin Login - Incorrect Credentials", False, 
                f"Failed to reject login with wrong password. Status: {response.status_code}, Response: {response.text}")
    
    return token

def test_room_management(token):
    """Test room creation, listing, and availability checking"""
    print("\n=== Testing Room Management CRUD ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test room creation
    room_data = {
        "room_number": "101",
        "room_type": "deluxe",
        "price_per_night": 150.0,
        "amenities": ["TV", "AC", "WiFi", "Mini Bar"],
        "max_occupancy": 2,
        "description": "Deluxe room with city view"
    }
    
    response = requests.post(
        f"{API_URL}/rooms",
        json=room_data,
        headers=headers
    )
    
    if response.status_code == 200 and "room_id" in response.json():
        log_test("Room Creation", True, "Successfully created a new room")
        room_id = response.json()["room_id"]
    else:
        log_test("Room Creation", False, 
                f"Failed to create a room. Status: {response.status_code}, Response: {response.text}")
        # Try to create a different room in case the room number already exists
        room_data["room_number"] = "102"
        response = requests.post(
            f"{API_URL}/rooms",
            json=room_data,
            headers=headers
        )
        if response.status_code == 200 and "room_id" in response.json():
            log_test("Room Creation (Alternative)", True, "Successfully created a room with different room number")
            room_id = response.json()["room_id"]
        else:
            room_id = None
    
    # Test duplicate room number handling
    if room_id:
        response = requests.post(
            f"{API_URL}/rooms",
            json=room_data,  # Same room data with same room number
            headers=headers
        )
        
        if response.status_code == 400:
            log_test("Room Creation - Duplicate Check", True, "Correctly rejected duplicate room number")
        else:
            log_test("Room Creation - Duplicate Check", False, 
                    f"Failed to reject duplicate room number. Status: {response.status_code}, Response: {response.text}")
    
    # Test room listing
    response = requests.get(f"{API_URL}/rooms")
    
    if response.status_code == 200 and isinstance(response.json(), list):
        log_test("Room Listing", True, f"Successfully retrieved {len(response.json())} rooms")
    else:
        log_test("Room Listing", False, 
                f"Failed to retrieve rooms. Status: {response.status_code}, Response: {response.text}")
    
    # Test room availability checking
    check_in = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    check_out = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    
    response = requests.post(
        f"{API_URL}/rooms/availability",
        json={"check_in": check_in, "check_out": check_out}
    )
    
    if response.status_code == 200 and isinstance(response.json(), list):
        log_test("Room Availability Check", True, f"Successfully checked room availability, found {len(response.json())} available rooms")
    else:
        log_test("Room Availability Check", False, 
                f"Failed to check room availability. Status: {response.status_code}, Response: {response.text}")
    
    return room_id

def test_guest_management():
    """Test guest registration and listing"""
    print("\n=== Testing Guest Management System ===")
    
    # Test guest registration
    guest_data = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "123-456-7890",
        "address": "123 Main St, Anytown, USA",
        "id_proof": "DL12345678"
    }
    
    response = requests.post(
        f"{API_URL}/guests",
        json=guest_data
    )
    
    if response.status_code == 200 and "guest_id" in response.json():
        log_test("Guest Registration", True, "Successfully registered a new guest")
        guest_id = response.json()["guest_id"]
    else:
        log_test("Guest Registration", False, 
                f"Failed to register a guest. Status: {response.status_code}, Response: {response.text}")
        guest_id = None
    
    # Test guest listing
    response = requests.get(f"{API_URL}/guests")
    
    if response.status_code == 200 and isinstance(response.json(), list):
        log_test("Guest Listing", True, f"Successfully retrieved {len(response.json())} guests")
    else:
        log_test("Guest Listing", False, 
                f"Failed to retrieve guests. Status: {response.status_code}, Response: {response.text}")
    
    return guest_id

def test_booking_system(room_id, guest_id):
    """Test booking creation with availability checking and conflict detection"""
    print("\n=== Testing Booking System ===")
    
    if not room_id or not guest_id:
        log_test("Booking Creation", False, "Cannot test booking without valid room_id and guest_id")
        return None
    
    # Test booking creation
    check_in = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    check_out = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    booking_data = {
        "room_id": room_id,
        "guest_id": guest_id,
        "check_in": check_in,
        "check_out": check_out,
        "guests_count": 2,
        "special_requests": "Late check-in, extra pillows"
    }
    
    response = requests.post(
        f"{API_URL}/bookings",
        json=booking_data
    )
    
    if response.status_code == 200 and "booking_id" in response.json():
        log_test("Booking Creation", True, "Successfully created a new booking")
        booking_id = response.json()["booking_id"]
        
        # Test booking conflict detection (try to book the same room for the same dates)
        response = requests.post(
            f"{API_URL}/bookings",
            json=booking_data
        )
        
        if response.status_code == 400:
            log_test("Booking Conflict Detection", True, "Correctly detected booking conflict")
        else:
            log_test("Booking Conflict Detection", False, 
                    f"Failed to detect booking conflict. Status: {response.status_code}, Response: {response.text}")
    else:
        log_test("Booking Creation", False, 
                f"Failed to create a booking. Status: {response.status_code}, Response: {response.text}")
        booking_id = None
    
    # Test booking listing
    response = requests.get(f"{API_URL}/bookings")
    
    if response.status_code == 200 and isinstance(response.json(), list):
        log_test("Booking Listing", True, f"Successfully retrieved {len(response.json())} bookings")
    else:
        log_test("Booking Listing", False, 
                f"Failed to retrieve bookings. Status: {response.status_code}, Response: {response.text}")
    
    return booking_id

def test_dashboard_statistics():
    """Test dashboard statistics calculation"""
    print("\n=== Testing Dashboard Statistics ===")
    
    response = requests.get(f"{API_URL}/dashboard/stats")
    
    if response.status_code == 200:
        stats = response.json()
        required_fields = [
            "total_rooms", "occupied_rooms", "available_rooms", 
            "total_bookings", "total_revenue", "total_expenses", 
            "net_profit", "occupancy_rate"
        ]
        
        all_fields_present = all(field in stats for field in required_fields)
        
        if all_fields_present:
            log_test("Dashboard Statistics", True, "Successfully retrieved dashboard statistics with all required fields")
        else:
            missing_fields = [field for field in required_fields if field not in stats]
            log_test("Dashboard Statistics", False, f"Missing fields in dashboard statistics: {missing_fields}")
    else:
        log_test("Dashboard Statistics", False, 
                f"Failed to retrieve dashboard statistics. Status: {response.status_code}, Response: {response.text}")

def print_summary():
    """Print test summary"""
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['passed'] + test_results['failed']}")
    print(f"Passed: {test_results['passed']}")
    print(f"Failed: {test_results['failed']}")
    
    if test_results["failed"] > 0:
        print("\nFailed tests:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"- {test['name']}: {test['message']}")

def main():
    """Main test function"""
    print(f"Testing backend API at: {API_URL}")
    
    # Wait for a moment to ensure the backend is ready
    time.sleep(2)
    
    # Test admin login
    token = test_admin_login()
    if not token:
        print("Cannot proceed with tests that require authentication. Exiting.")
        print_summary()
        return
    
    # Test room management
    room_id = test_room_management(token)
    
    # Test guest management
    guest_id = test_guest_management()
    
    # Test booking system
    booking_id = test_booking_system(room_id, guest_id)
    
    # Test dashboard statistics
    test_dashboard_statistics()
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime
import uuid

load_dotenv()

async def initialize_rooms():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Clear existing rooms
    await db.rooms.delete_many({})
    print("Cleared existing rooms")
    
    # Define the 10 rooms: 7 Double and 3 Triple
    rooms_data = [
        # 7 Double rooms
        {"room_number": "101", "room_type": "double", "price_per_night": 8500, "max_occupancy": 2},
        {"room_number": "102", "room_type": "double", "price_per_night": 8500, "max_occupancy": 2},
        {"room_number": "103", "room_type": "double", "price_per_night": 8500, "max_occupancy": 2},
        {"room_number": "201", "room_type": "double", "price_per_night": 9000, "max_occupancy": 2},
        {"room_number": "202", "room_type": "double", "price_per_night": 9000, "max_occupancy": 2},
        {"room_number": "203", "room_type": "double", "price_per_night": 9000, "max_occupancy": 2},
        {"room_number": "301", "room_type": "double", "price_per_night": 9500, "max_occupancy": 2},
        
        # 3 Triple rooms
        {"room_number": "204", "room_type": "triple", "price_per_night": 12000, "max_occupancy": 3},
        {"room_number": "302", "room_type": "triple", "price_per_night": 12500, "max_occupancy": 3},
        {"room_number": "303", "room_type": "triple", "price_per_night": 12500, "max_occupancy": 3},
    ]
    
    # Create rooms
    for room_data in rooms_data:
        room = {
            "room_id": str(uuid.uuid4()),
            "room_number": room_data["room_number"],
            "room_type": room_data["room_type"],
            "price_per_night": room_data["price_per_night"],
            "amenities": ["WiFi", "TV", "AC", "Mini Fridge", "Room Service"],
            "status": "available",
            "max_occupancy": room_data["max_occupancy"],
            "description": f"Comfortable {room_data['room_type']} room with modern amenities",
            "created_at": datetime.utcnow()
        }
        
        await db.rooms.insert_one(room)
        print(f"Created room {room_data['room_number']} - {room_data['room_type']} - LKR {room_data['price_per_night']}")
    
    # Initialize default settings with LKR currency
    existing_settings = await db.settings.find_one()
    if not existing_settings:
        settings = {
            "setting_id": str(uuid.uuid4()),
            "currency": "LKR",
            "currency_symbol": "Rs.",
            "hotel_name": "Hotel Management System",
            "updated_at": datetime.utcnow()
        }
        await db.settings.insert_one(settings)
        print("Created default settings with LKR currency")
    
    client.close()
    print("Hotel rooms initialization completed!")
    print("Total: 10 rooms (7 Double, 3 Triple)")

if __name__ == "__main__":
    asyncio.run(initialize_rooms())
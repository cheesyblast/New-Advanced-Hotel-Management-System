from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Hotel Management System API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = "hotel-management-secret-key-2024"
JWT_ALGORITHM = "HS256"

# Define Models
class Room(BaseModel):
    room_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_number: str
    room_type: str  # "single", "double", "suite", "deluxe"
    price_per_night: float
    amenities: List[str]
    status: str = "available"  # "available", "occupied", "maintenance"
    max_occupancy: int
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RoomCreate(BaseModel):
    room_number: str
    room_type: str
    price_per_night: float
    amenities: List[str]
    max_occupancy: int
    description: str

class Guest(BaseModel):
    guest_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    address: str
    id_proof: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestCreate(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    id_proof: str

class Booking(BaseModel):
    booking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    guest_id: str
    check_in: date
    check_out: date
    total_amount: float
    advance_payment: float = 0.0
    status: str = "confirmed"  # "confirmed", "cancelled", "checked_in", "checked_out"
    guests_count: int
    special_requests: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookingCreate(BaseModel):
    room_id: str
    guest_name: str
    guest_email: str = ""  # Made optional
    guest_phone: str = ""  # Made optional
    guest_address: str = ""
    guest_id_proof: str = ""
    check_in: date
    check_out: date
    guests_count: int = 1
    special_requests: str = ""
    advance_payment: float = 0.0

class BookingWithDetails(BaseModel):
    booking_id: str
    room_number: str
    room_type: str
    guest_name: str
    guest_email: str
    guest_phone: str
    check_in: date
    check_out: date
    total_amount: float
    status: str
    guests_count: int
    special_requests: str
    created_at: datetime

class Admin(BaseModel):
    admin_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str = "admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminCreate(BaseModel):
    username: str
    password: str

class Expense(BaseModel):
    expense_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    amount: float
    description: str
    date: date
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str
    date: date

class Sale(BaseModel):
    sale_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    amount: float
    payment_method: str
    date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SaleCreate(BaseModel):
    booking_id: str
    amount: float
    payment_method: str
    date: date

class BookingStatusUpdate(BaseModel):
    status: str
    additional_charges: float = 0.0
    advance_payment_received: float = 0.0  # For check-in advance
    payment_method: str = "cash"
    notes: str = ""

class Settings(BaseModel):
    setting_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    currency: str = "LKR"
    currency_symbol: str = "Rs."
    hotel_name: str = "Hotel Management System"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SettingsUpdate(BaseModel):
    currency: str
    currency_symbol: str
    hotel_name: str

class PaymentBalance(BaseModel):
    booking_id: str
    room_charges: float
    additional_charges: float
    total_amount: float
    paid_amount: float
    balance_due: float
    payment_status: str

class AvailabilityCheck(BaseModel):
    check_in: date
    check_out: date
    room_type: Optional[str] = None

class DashboardStats(BaseModel):
    total_rooms: int
    occupied_rooms: int
    available_rooms: int
    total_bookings: int
    total_revenue: float
    total_expenses: float
    net_profit: float
    occupancy_rate: float

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Auth endpoints
@api_router.post("/admin/login")
async def admin_login(admin_data: AdminLogin):
    try:
        admin = await db.admins.find_one({"username": admin_data.username})
        if not admin or not verify_password(admin_data.password, admin["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        token = create_access_token({"admin_id": admin["admin_id"], "username": admin["username"]})
        return {"access_token": token, "token_type": "bearer", "admin_id": admin["admin_id"]}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@api_router.post("/admin/create", response_model=Admin)
async def create_admin(admin_data: AdminCreate):
    try:
        # Check if admin already exists
        existing_admin = await db.admins.find_one({"username": admin_data.username})
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin already exists"
            )
        
        admin_dict = admin_data.dict()
        admin_dict["password_hash"] = hash_password(admin_data.password)
        admin_obj = Admin(**admin_dict)
        await db.admins.insert_one(admin_obj.dict())
        return admin_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create admin error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create admin"
        )

# Room endpoints
@api_router.post("/rooms", response_model=Room)
async def create_room(room_data: RoomCreate, token_data: dict = Depends(verify_token)):
    try:
        # Check if room number already exists
        existing_room = await db.rooms.find_one({"room_number": room_data.room_number})
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room number {room_data.room_number} already exists"
            )
        
        room_dict = room_data.dict()
        room_obj = Room(**room_dict)
        await db.rooms.insert_one(room_obj.dict())
        return room_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create room error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create room"
        )

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms():
    try:
        rooms = await db.rooms.find().to_list(1000)
        return [Room(**room) for room in rooms]
    except Exception as e:
        logger.error(f"Get rooms error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rooms"
        )

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    try:
        room = await db.rooms.find_one({"room_id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return Room(**room)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get room error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve room"
        )

@api_router.put("/rooms/{room_id}", response_model=Room)
async def update_room(room_id: str, room_data: RoomCreate, token_data: dict = Depends(verify_token)):
    try:
        room = await db.rooms.find_one({"room_id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        update_dict = room_data.dict()
        await db.rooms.update_one({"room_id": room_id}, {"$set": update_dict})
        
        updated_room = await db.rooms.find_one({"room_id": room_id})
        return Room(**updated_room)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update room error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update room"
        )

@api_router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, token_data: dict = Depends(verify_token)):
    try:
        room = await db.rooms.find_one({"room_id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        await db.rooms.delete_one({"room_id": room_id})
        return {"message": "Room deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete room error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete room"
        )

# Guest endpoints
@api_router.post("/guests", response_model=Guest)
async def create_guest(guest_data: GuestCreate):
    try:
        guest_dict = guest_data.dict()
        guest_obj = Guest(**guest_dict)
        await db.guests.insert_one(guest_obj.dict())
        return guest_obj
    except Exception as e:
        logger.error(f"Create guest error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create guest"
        )

@api_router.get("/guests", response_model=List[Guest])
async def get_guests():
    try:
        guests = await db.guests.find().to_list(1000)
        return [Guest(**guest) for guest in guests]
    except Exception as e:
        logger.error(f"Get guests error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve guests"
        )

@api_router.get("/guests/{guest_id}", response_model=Guest)
async def get_guest(guest_id: str):
    try:
        guest = await db.guests.find_one({"guest_id": guest_id})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        return Guest(**guest)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get guest error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve guest"
        )

# Booking endpoints
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    try:
        # Check if room exists
        room = await db.rooms.find_one({"room_id": booking_data.room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Check if guest exists by email, if not create new guest
        guest = await db.guests.find_one({"email": booking_data.guest_email})
        if not guest:
            # Create new guest
            guest_data = {
                "guest_id": str(uuid.uuid4()),
                "name": booking_data.guest_name,
                "email": booking_data.guest_email,
                "phone": booking_data.guest_phone,
                "address": booking_data.guest_address,
                "id_proof": booking_data.guest_id_proof,
                "created_at": datetime.utcnow()
            }
            await db.guests.insert_one(guest_data)
            guest = guest_data
        
        # Convert date objects to datetime objects for MongoDB compatibility
        check_in_datetime = datetime.combine(booking_data.check_in, datetime.min.time())
        check_out_datetime = datetime.combine(booking_data.check_out, datetime.min.time())
        
        # Check room availability
        conflicting_bookings = await db.bookings.find({
            "room_id": booking_data.room_id,
            "status": {"$in": ["confirmed", "checked_in"]},
            "$or": [
                {
                    "check_in": {"$lte": check_out_datetime}, 
                    "check_out": {"$gte": check_in_datetime}
                }
            ]
        }).to_list(1000)
        
        if conflicting_bookings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room is not available for the selected dates"
            )
        
        # Calculate total amount
        days = (booking_data.check_out - booking_data.check_in).days
        if days <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be after check-in date"
            )
        
        total_amount = days * room["price_per_night"]
        
        # Create booking
        booking_dict = {
            "booking_id": str(uuid.uuid4()),
            "room_id": booking_data.room_id,
            "guest_id": guest["guest_id"],
            "check_in": booking_data.check_in,
            "check_out": booking_data.check_out,
            "total_amount": total_amount,
            "status": "confirmed",
            "guests_count": booking_data.guests_count,
            "special_requests": booking_data.special_requests,
            "created_at": datetime.utcnow()
        }
        
        booking_obj = Booking(**booking_dict)
        
        # Convert date objects to datetime objects before saving to MongoDB
        booking_dict_for_db = booking_obj.dict()
        booking_dict_for_db["check_in"] = check_in_datetime
        booking_dict_for_db["check_out"] = check_out_datetime
        
        await db.bookings.insert_one(booking_dict_for_db)
        
        # Create sale record
        sale_obj = Sale(
            booking_id=booking_obj.booking_id,
            amount=total_amount,
            payment_method="cash",
            date=booking_data.check_in
        )
        
        # Convert date object to datetime object before saving to MongoDB
        sale_dict_for_db = sale_obj.dict()
        sale_dict_for_db["date"] = datetime.combine(sale_obj.date, datetime.min.time())
        
        await db.sales.insert_one(sale_dict_for_db)
        
        return booking_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create booking error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create booking"
        )

@api_router.get("/bookings", response_model=List[BookingWithDetails])
async def get_bookings():
    try:
        bookings = await db.bookings.find().to_list(1000)
        booking_details = []
        
        for booking in bookings:
            room = await db.rooms.find_one({"room_id": booking["room_id"]})
            guest = await db.guests.find_one({"guest_id": booking["guest_id"]})
            
            # Convert datetime objects back to date objects if needed
            check_in = booking["check_in"]
            check_out = booking["check_out"]
            
            if isinstance(check_in, datetime):
                check_in = check_in.date()
            if isinstance(check_out, datetime):
                check_out = check_out.date()
            
            booking_detail = BookingWithDetails(
                booking_id=booking["booking_id"],
                room_number=room["room_number"] if room else "Unknown",
                room_type=room["room_type"] if room else "Unknown",
                guest_name=guest["name"] if guest else "Unknown",
                guest_email=guest["email"] if guest else "Unknown",
                guest_phone=guest["phone"] if guest else "Unknown",
                check_in=check_in,
                check_out=check_out,
                total_amount=booking["total_amount"],
                status=booking["status"],
                guests_count=booking["guests_count"],
                special_requests=booking.get("special_requests", ""),
                created_at=booking["created_at"]
            )
            booking_details.append(booking_detail)
        
        return booking_details
    except Exception as e:
        logger.error(f"Get bookings error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bookings"
        )

@api_router.get("/bookings/{booking_id}", response_model=BookingWithDetails)
async def get_booking(booking_id: str):
    try:
        booking = await db.bookings.find_one({"booking_id": booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        room = await db.rooms.find_one({"room_id": booking["room_id"]})
        guest = await db.guests.find_one({"guest_id": booking["guest_id"]})
        
        # Convert datetime objects back to date objects if needed
        check_in = booking["check_in"]
        check_out = booking["check_out"]
        
        if isinstance(check_in, datetime):
            check_in = check_in.date()
        if isinstance(check_out, datetime):
            check_out = check_out.date()
        
        return BookingWithDetails(
            booking_id=booking["booking_id"],
            room_number=room["room_number"] if room else "Unknown",
            room_type=room["room_type"] if room else "Unknown",
            guest_name=guest["name"] if guest else "Unknown",
            guest_email=guest["email"] if guest else "Unknown",
            guest_phone=guest["phone"] if guest else "Unknown",
            check_in=check_in,
            check_out=check_out,
            total_amount=booking["total_amount"],
            status=booking["status"],
            guests_count=booking["guests_count"],
            special_requests=booking.get("special_requests", ""),
            created_at=booking["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get booking error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve booking"
        )

@api_router.put("/bookings/{booking_id}/status", response_model=PaymentBalance)
async def update_booking_status(booking_id: str, status_update: BookingStatusUpdate, token_data: dict = Depends(verify_token)):
    try:
        booking = await db.bookings.find_one({"booking_id": booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if status_update.status not in ["confirmed", "cancelled", "checked_in", "checked_out"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid booking status"
            )
        
        # Update booking status
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {"$set": {"status": status_update.status}}
        )
        
        # Calculate payment balance for checkout
        room_charges = booking["total_amount"]
        additional_charges = status_update.additional_charges
        total_amount = room_charges + additional_charges
        paid_amount = room_charges  # Assuming room charges were paid on booking
        balance_due = additional_charges
        
        # If there are additional charges, create a new sale record
        if additional_charges > 0:
            additional_sale = Sale(
                booking_id=booking_id,
                amount=additional_charges,
                payment_method=status_update.payment_method,
                date=datetime.utcnow().date()
            )
            
            sale_dict_for_db = additional_sale.dict()
            sale_dict_for_db["date"] = datetime.combine(additional_sale.date, datetime.min.time())
            await db.sales.insert_one(sale_dict_for_db)
        
        # Prepare payment balance response
        payment_balance = PaymentBalance(
            booking_id=booking_id,
            room_charges=room_charges,
            additional_charges=additional_charges,
            total_amount=total_amount,
            paid_amount=paid_amount + (additional_charges if status_update.status == "checked_out" else 0),
            balance_due=balance_due if status_update.status != "checked_out" else 0.0,
            payment_status="paid" if balance_due == 0 else "pending"
        )
        
        return payment_balance
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update booking status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update booking status"
        )

@api_router.post("/rooms/availability", response_model=List[Room])
async def check_room_availability(availability_data: AvailabilityCheck):
    try:
        # Find all rooms
        rooms_query = {}
        if availability_data.room_type:
            rooms_query["room_type"] = availability_data.room_type
        
        rooms = await db.rooms.find(rooms_query).to_list(1000)
        available_rooms = []
        
        # Convert date objects to datetime objects for MongoDB compatibility
        check_in_datetime = datetime.combine(availability_data.check_in, datetime.min.time())
        check_out_datetime = datetime.combine(availability_data.check_out, datetime.min.time())
        
        for room in rooms:
            # Check if room has conflicting bookings
            conflicting_bookings = await db.bookings.find({
                "room_id": room["room_id"],
                "status": {"$in": ["confirmed", "checked_in"]},
                "$or": [
                    {
                        "check_in": {"$lte": check_out_datetime}, 
                        "check_out": {"$gte": check_in_datetime}
                    }
                ]
            }).to_list(1000)
            
            if not conflicting_bookings:
                available_rooms.append(Room(**room))
        
        return available_rooms
    except Exception as e:
        logger.error(f"Check room availability error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check room availability"
        )

# Expense endpoints
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, token_data: dict = Depends(verify_token)):
    try:
        expense_dict = expense_data.dict()
        expense_dict["created_by"] = token_data["admin_id"]
        
        # Create expense object first
        expense_obj = Expense(**expense_dict)
        
        # Convert date object to datetime object for MongoDB compatibility
        expense_dict_for_db = expense_obj.dict()
        expense_dict_for_db["date"] = datetime.combine(expense_data.date, datetime.min.time())
        
        await db.expenses.insert_one(expense_dict_for_db)
        
        return expense_obj
    except Exception as e:
        logger.error(f"Create expense error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense: {str(e)}"
        )

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses():
    try:
        expenses = await db.expenses.find().to_list(1000)
        expense_list = []
        
        for expense in expenses:
            # Convert datetime objects back to date objects if needed
            expense_date = expense["date"]
            if isinstance(expense_date, datetime):
                expense_date = expense_date.date()
            
            expense_obj = Expense(
                expense_id=expense["expense_id"],
                category=expense["category"],
                amount=expense["amount"],
                description=expense["description"],
                date=expense_date,
                created_by=expense["created_by"],
                created_at=expense["created_at"]
            )
            expense_list.append(expense_obj)
        
        return expense_list
    except Exception as e:
        logger.error(f"Get expenses error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve expenses"
        )

# Sales endpoints
@api_router.get("/sales", response_model=List[Sale])
async def get_sales():
    try:
        sales = await db.sales.find().to_list(1000)
        sale_list = []
        
        for sale in sales:
            # Convert datetime objects back to date objects if needed
            sale_date = sale["date"]
            if isinstance(sale_date, datetime):
                sale_date = sale_date.date()
            
            sale_obj = Sale(
                sale_id=sale["sale_id"],
                booking_id=sale["booking_id"],
                amount=sale["amount"],
                payment_method=sale["payment_method"],
                date=sale_date,
                created_at=sale["created_at"]
            )
            sale_list.append(sale_obj)
        
        return sale_list
    except Exception as e:
        logger.error(f"Get sales error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sales"
        )

# Dashboard endpoints
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    try:
        # Get room statistics
        total_rooms = await db.rooms.count_documents({})
        
        # Convert current date to datetime for MongoDB compatibility
        current_datetime = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        
        occupied_rooms = await db.bookings.count_documents({
            "status": "checked_in",
            "check_in": {"$lte": current_datetime},
            "check_out": {"$gte": current_datetime}
        })
        available_rooms = total_rooms - occupied_rooms
        
        # Get booking statistics
        total_bookings = await db.bookings.count_documents({})
        
        # Get revenue statistics
        sales = await db.sales.find().to_list(1000)
        total_revenue = sum(sale["amount"] for sale in sales)
        
        # Get expense statistics
        expenses = await db.expenses.find().to_list(1000)
        total_expenses = sum(expense["amount"] for expense in expenses)
        
        # Calculate net profit
        net_profit = total_revenue - total_expenses
        
        # Calculate occupancy rate
        occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0
        
        return DashboardStats(
            total_rooms=total_rooms,
            occupied_rooms=occupied_rooms,
            available_rooms=available_rooms,
            total_bookings=total_bookings,
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            net_profit=net_profit,
            occupancy_rate=occupancy_rate
        )
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )

@api_router.get("/")
async def root():
    return {"message": "Hotel Management System API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
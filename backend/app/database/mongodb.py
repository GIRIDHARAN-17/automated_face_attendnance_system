from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
from ..utils.config import settings


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database = None


mongodb = MongoDB()


async def get_database():
    """Get MongoDB database instance"""
    if mongodb.database is None:
        await init_database()
    return mongodb.database


async def init_database():
    """Initialize MongoDB connection"""
    mongodb_uri = settings.MONGODB_URI
    database_name = settings.MONGODB_DB_NAME
    
    mongodb.client = AsyncIOMotorClient(mongodb_uri)
    mongodb.database = mongodb.client[database_name]
    
    # Create indexes
    await mongodb.database.students.create_index("student_id", unique=True)
    await mongodb.database.attendance.create_index([("student_id", 1), ("date", 1)], unique=True)
    await mongodb.database.attendance.create_index("date")
    await mongodb.database.recognition_logs.create_index("timestamp")
    
    print(f"Connected to MongoDB: {database_name}")


async def close_database():
    """Close MongoDB connection"""
    if mongodb.client:
        mongodb.client.close()
        print("MongoDB connection closed")


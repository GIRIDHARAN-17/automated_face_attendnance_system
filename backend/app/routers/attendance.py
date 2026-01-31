from fastapi import APIRouter, Query, Depends
from datetime import date, datetime, timedelta
from typing import List, Optional
from ..models.attendance import AttendanceResponse
from ..database.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/today", response_model=List[AttendanceResponse])
async def get_today_attendance(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get today's attendance records"""
    today = date.today()
    
    # Get attendance records
    attendance_records = await db.attendance.find({"date": today}).to_list(None)
    
    # Get student names
    student_ids = [r["student_id"] for r in attendance_records]
    students = await db.students.find({"student_id": {"$in": student_ids}}).to_list(None)
    student_map = {s["student_id"]: s["name"] for s in students}
    
    # Format response
    results = []
    for record in attendance_records:
        results.append(AttendanceResponse(
            student_id=record["student_id"],
            date=record["date"],
            status=record["status"],
            timestamp=record["timestamp"],
            confidence=record.get("confidence"),
            student_name=student_map.get(record["student_id"])
        ))
    
    return results


@router.get("/history", response_model=List[AttendanceResponse])
async def get_attendance_history(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    student_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get attendance history with filters"""
    query = {}
    
    if student_id:
        query["student_id"] = student_id
    
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    
    # Get attendance records
    attendance_records = await db.attendance.find(query).sort("date", -1).to_list(1000)
    
    # Get student names
    student_ids = list(set([r["student_id"] for r in attendance_records]))
    students = await db.students.find({"student_id": {"$in": student_ids}}).to_list(None)
    student_map = {s["student_id"]: s["name"] for s in students}
    
    # Format response
    results = []
    for record in attendance_records:
        results.append(AttendanceResponse(
            student_id=record["student_id"],
            date=record["date"],
            status=record["status"],
            timestamp=record["timestamp"],
            confidence=record.get("confidence"),
            student_name=student_map.get(record["student_id"])
        ))
    
    return results


@router.get("/stats")
async def get_attendance_stats(
    target_date: Optional[date] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get attendance statistics for a date"""
    if not target_date:
        target_date = date.today()
    
    # Get all students
    total_students = await db.students.count_documents({})
    
    # Get attendance for date
    attendance_records = await db.attendance.find({"date": target_date}).to_list(None)
    
    present_count = sum(1 for r in attendance_records if r["status"] in ["present", "late"])
    absent_count = total_students - present_count
    attendance_percentage = (present_count / total_students * 100) if total_students > 0 else 0
    
    return {
        "date": target_date.isoformat(),
        "total_students": total_students,
        "present": present_count,
        "absent": absent_count,
        "attendance_percentage": round(attendance_percentage, 2)
    }






from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
from ..database.mongodb import get_database
from ..utils.config import settings



class AttendanceTracker:
    """Attendance tracking service with buffer-based detection"""
    
    def __init__(self):
        # Tracking buffer: {student_id: [timestamps]}
        self.tracking_buffer: Dict[str, List[datetime]] = defaultdict(list)
        self.marked_today: Dict[str, date] = {}  # {student_id: date}
    
    def add_detection(self, student_id: str, timestamp: datetime):
        """
        Add a detection to the tracking buffer
        
        Args:
            student_id: Detected student ID
            timestamp: Detection timestamp
        """
        self.tracking_buffer[student_id].append(timestamp)
        
        # Clean old detections (older than window)
        window_start = timestamp - timedelta(seconds=settings.ATTENDANCE_WINDOW_SECONDS)
        self.tracking_buffer[student_id] = [
            ts for ts in self.tracking_buffer[student_id]
            if ts >= window_start
        ]
    
    async def check_and_mark_attendance(self, student_id: str, confidence: float) -> Optional[dict]:
        """
        Check if student should be marked present and mark if conditions met
        
        Args:
            student_id: Student ID
            confidence: Recognition confidence
            
        Returns:
            Attendance record if marked, None otherwise
        """
        today = date.today()
        
        # Check if already marked today
        if student_id in self.marked_today and self.marked_today[student_id] == today:
            return None
        
        # Check buffer
        detections = self.tracking_buffer.get(student_id, [])
        if len(detections) < settings.FRAMES_FOR_ATTENDANCE:
            return None
        
        # Check time window
        if len(detections) > 0:
            time_span = (detections[-1] - detections[0]).total_seconds()
            if time_span > settings.ATTENDANCE_WINDOW_SECONDS:
                # Reset buffer if window exceeded
                self.tracking_buffer[student_id] = [detections[-1]]
                return None
        
        # Mark attendance
        now = datetime.now()
        status = "present"
        
        # Check for late arrival
        if now.hour >= settings.LATE_ARRIVAL_THRESHOLD_HOURS:
            status = "late"
        
        attendance_record = {
            "student_id": student_id,
            "date": today,
            "status": status,
            "timestamp": now,
            "confidence": confidence
        }
        
        # Save to database
        db = await get_database()
        try:
            await db.attendance.update_one(
                {"student_id": student_id, "date": today},
                {"$set": attendance_record},
                upsert=True
            )
            
            # Mark as done for today
            self.marked_today[student_id] = today
            
            # Clear buffer for this student
            self.tracking_buffer[student_id] = []
            
            return attendance_record
        except Exception as e:
            print(f"Error marking attendance: {e}")
            return None
    
    def reset_daily(self):
        """Reset daily tracking (call at start of new day)"""
        self.marked_today.clear()
        self.tracking_buffer.clear()
    
    def get_buffer_status(self) -> Dict[str, int]:
        """Get current buffer status for all students"""
        return {
            student_id: len(timestamps)
            for student_id, timestamps in self.tracking_buffer.items()
        }


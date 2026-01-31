# Face Attendance System

An AI-based offline face recognition attendance system for classrooms with a modern SaaS dashboard interface.

## Features

- **Face Recognition Pipeline**: MTCNN (detection) → FaceNet (embedding) → SVM (classification)
- **Student Registration**: Capture 100 face images per student via webcam
- **Real-time Recognition**: Live camera feed with automatic attendance marking
- **Attendance Tracking**: Automatic attendance marking with duplicate prevention
- **Modern Dashboard**: Purple-themed SaaS UI with KPI cards, charts, and data tables
- **Offline Operation**: Works completely offline after initial setup

## Architecture

- **Backend**: FastAPI with Python 3.10+
- **Frontend**: React 18 with Vite, Tailwind CSS
- **Database**: MongoDB Atlas (cloud)
- **AI Models**: MTCNN, FaceNet (facenet-pytorch), scikit-learn SVM
- **Deployment**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (or local MongoDB)
- Webcam for student registration and live recognition

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd automatedfaceattendnancesystem
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=face_attendance
```

### 3. Build and Run with Docker

```bash
docker-compose build
docker-compose up
```

The system will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Usage Guide

### 1. Register Students

1. Navigate to **Students** page
2. Click **Register New Student**
3. Enter Student ID and Name
4. Click **Start Capture** to capture 100 face images
5. Wait for capture to complete
6. Click **Register Student** to save

### 2. Train the Model

After registering students, you need to train the SVM classifier:

1. Go to **Students** page
2. The system will automatically prompt to train (or use API endpoint)
3. Training endpoint: `POST /api/v1/training/train`
4. Wait for training to complete

### 3. Start Live Recognition

1. Navigate to **Live Camera** page
2. Click **Start Recognition**
3. Allow camera permissions
4. The system will automatically:
   - Detect faces in video feed
   - Recognize students
   - Mark attendance after 5+ detections within 10 seconds

### 4. View Attendance

- **Dashboard**: Overview with KPIs and charts
- **Attendance Page**: Detailed records with filters and CSV export

## API Endpoints

### Students

- `POST /api/v1/students/register` - Register new student with face images
- `GET /api/v1/students` - List all students
- `DELETE /api/v1/students/{student_id}` - Delete student

### Training

- `POST /api/v1/training/train` - Train SVM classifier
- `GET /api/v1/training/status` - Get training status

### Recognition

- `POST /api/v1/recognize` - Process frame for recognition

### Attendance

- `GET /api/v1/attendance/today` - Get today's attendance
- `GET /api/v1/attendance/history` - Get attendance history with filters
- `GET /api/v1/attendance/stats` - Get attendance statistics

Full API documentation available at `/docs` when backend is running.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `MONGODB_DB_NAME` | Database name | `face_attendance` |
| `CONFIDENCE_THRESHOLD` | Minimum confidence for recognition | `0.7` |
| `FRAMES_FOR_ATTENDANCE` | Frames required to mark attendance | `5` |
| `ATTENDANCE_WINDOW_SECONDS` | Time window for attendance detection | `10` |
| `LATE_ARRIVAL_THRESHOLD_HOURS` | Hour threshold for late arrival | `9` |

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
automatedfaceattendnancesystem/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models/       # Pydantic models
│   │   ├── services/     # AI services (detection, embedding, recognition)
│   │   ├── routers/      # API endpoints
│   │   ├── database/     # MongoDB connection
│   │   └── utils/        # Configuration
│   └── requirements.txt
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   └── services/    # API client
│   └── package.json
├── docker-compose.yml    # Docker orchestration
└── README.md
```

## Attendance Rules

1. **One attendance per day**: Each student can only be marked present once per day
2. **Detection threshold**: Student must be detected in 5+ frames within 10 seconds
3. **Confidence filtering**: Only matches with confidence ≥ 0.7 are considered
4. **Late arrival**: Automatically detected if arrival time ≥ 9 AM (configurable)
5. **Duplicate prevention**: System prevents duplicate attendance marking

## Performance Optimizations

- **Frame skipping**: Face detection runs every 3rd frame
- **Embedding cache**: Cached embeddings prevent repeated computations
- **Efficient processing**: Optimized pipeline for real-time performance

## Troubleshooting

### Camera not working
- Check browser permissions for camera access
- Ensure HTTPS or localhost (required for getUserMedia)

### Model not training
- Ensure at least one student with embeddings exists
- Check MongoDB connection
- Verify embeddings are 512-dimensional

### Recognition not working
- Ensure model is trained (`GET /api/v1/training/status`)
- Check confidence threshold settings
- Verify camera feed is active

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the repository.






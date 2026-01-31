import { useState, useEffect, useRef } from 'react'
import { Play, Square, Camera } from 'lucide-react'
import { recognitionAPI, trainingAPI } from '../services/api'

export default function LiveCamera() {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [recognizedStudents, setRecognizedStudents] = useState([])
  const [attendanceMarked, setAttendanceMarked] = useState([])
  const [isModelTrained, setIsModelTrained] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    checkModelStatus()
    return () => {
      stopRecognition()
    }
  }, [])

  const checkModelStatus = async () => {
    try {
      const status = await trainingAPI.status()
      setIsModelTrained(status.is_trained)
    } catch (error) {
      console.error('Error checking model status:', error)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Failed to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.8)
    })
  }

  const processFrame = async () => {
    if (!isRecognizing) return
    
    try {
      const frameBlob = await captureFrame()
      if (!frameBlob) return
      
      const result = await recognitionAPI.recognize(frameBlob)
      
      setRecognizedStudents(result.recognized_students || [])
      
      if (result.attendance_marked && result.attendance_marked.length > 0) {
        setAttendanceMarked(prev => [
          ...result.attendance_marked,
          ...prev
        ].slice(0, 10)) // Keep last 10
      }
    } catch (error) {
      console.error('Error processing frame:', error)
    }
  }

  const startRecognition = async () => {
    if (!isModelTrained) {
      alert('Model not trained. Please train the model first.')
      return
    }
    
    await startCamera()
    setIsRecognizing(true)
    
    // Process frame every 1 second
    intervalRef.current = setInterval(processFrame, 1000)
  }

  const stopRecognition = () => {
    setIsRecognizing(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    stopCamera()
  }

  const drawBoundingBoxes = () => {
    if (!canvasRef.current || !videoRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const video = videoRef.current
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Draw bounding boxes and labels
    recognizedStudents.forEach((student) => {
      const [x1, y1, x2, y2] = student.bbox
      
      // Draw bounding box
      ctx.strokeStyle = '#7c3aed'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      
      // Draw label background
      ctx.fillStyle = '#7c3aed'
      ctx.fillRect(x1, y1 - 30, x2 - x1, 30)
      
      // Draw label text
      ctx.fillStyle = 'white'
      ctx.font = '16px Arial'
      ctx.fillText(
        `${student.name} (${(student.confidence * 100).toFixed(1)}%)`,
        x1 + 5,
        y1 - 8
      )
    })
  }

  useEffect(() => {
    if (isRecognizing && recognizedStudents.length > 0) {
      drawBoundingBoxes()
    }
  }, [recognizedStudents, isRecognizing])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Camera</h1>
          <p className="text-gray-600">Real-time face recognition and attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          {!isModelTrained && (
            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              Model not trained
            </div>
          )}
          {isRecognizing ? (
            <button
              onClick={stopRecognition}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Square size={20} />
              <span>Stop Recognition</span>
            </button>
          ) : (
            <button
              onClick={startRecognition}
              disabled={!isModelTrained}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Play size={20} />
              <span>Start Recognition</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {!isRecognizing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                  <div className="text-white text-center">
                    <Camera size={48} className="mx-auto mb-4" />
                    <p>Camera feed will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recognition Panel */}
        <div className="space-y-6">
          {/* Currently Recognized */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Currently Recognized</h2>
            <div className="space-y-2">
              {recognizedStudents.length === 0 ? (
                <p className="text-gray-500 text-sm">No students detected</p>
              ) : (
                recognizedStudents.map((student, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-primary-50 rounded-lg border border-primary-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.student_id}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Present
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {(student.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Marked */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Marked</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attendanceMarked.length === 0 ? (
                <p className="text-gray-500 text-sm">No attendance marked yet</p>
              ) : (
                attendanceMarked.map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{record.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}






import { useState, useEffect, useRef } from 'react'
import { UserPlus, Trash2, Camera, Loader, Square } from 'lucide-react'
import { studentsAPI, trainingAPI } from '../services/api'
import DataTable from '../components/DataTable'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [formData, setFormData] = useState({ studentId: '', name: '' })
  const [capturedImages, setCapturedImages] = useState([])
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const captureIntervalRef = useRef(null)

  useEffect(() => {
    loadStudents()
    return () => {
      stopCamera()
    }
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await studentsAPI.list()
      setStudents(data)
    } catch (error) {
      console.error('Error loading students:', error)
      alert('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
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
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' })
        resolve(file)
      }, 'image/jpeg', 0.9)
    })
  }

  const startCapture = async () => {
    if (!formData.studentId || !formData.name) {
      alert('Please enter student ID and name')
      return
    }

    await startCamera()
    setCapturing(true)
    setCapturedImages([])
    setCaptureProgress(0)

    let count = 0
    const targetImages = 100
    const interval = 200 // Capture every 200ms

    captureIntervalRef.current = setInterval(async () => {
      const image = await captureImage()
      if (image) {
        setCapturedImages(prev => [...prev, image])
        count++
        setCaptureProgress(Math.round((count / targetImages) * 100))

        if (count >= targetImages) {
          stopCamera()
          setCapturing(false)
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current)
            captureIntervalRef.current = null
          }
        }
      }
    }, interval)
  }

  const stopCapture = () => {
    stopCamera()
    setCapturing(false)
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
  }

  const handleRegister = async () => {
    if (capturedImages.length < 10) {
      alert('Please capture at least 10 images')
      return
    }

    try {
      setRegistering(true)
      await studentsAPI.register(formData.studentId, formData.name, capturedImages)
      alert('Student registered successfully!')
      setShowRegisterForm(false)
      setFormData({ studentId: '', name: '' })
      setCapturedImages([])
      stopCamera()
      loadStudents()
    } catch (error) {
      console.error('Error registering student:', error)
      alert(error.response?.data?.detail || 'Failed to register student')
    } finally {
      setRegistering(false)
    }
  }

  const handleDelete = async (studentId) => {
    if (!confirm(`Are you sure you want to delete student ${studentId}?`)) {
      return
    }

    try {
      await studentsAPI.delete(studentId)
      alert('Student deleted successfully')
      loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Failed to delete student')
    }
  }

  const handleTrainModel = async () => {
    if (students.length === 0) {
      alert('No students registered. Please register at least one student first.')
      return
    }

    if (!confirm('This will train the model on all registered students. Continue?')) {
      return
    }

    try {
      setLoading(true)
      const result = await trainingAPI.train()
      alert(`Model trained successfully! Trained on ${result.num_students} students with ${result.num_samples} samples.`)
    } catch (error) {
      console.error('Error training model:', error)
      alert(error.response?.data?.detail || 'Failed to train model')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Students</h1>
          <p className="text-gray-600">Manage student registrations</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleTrainModel}
            disabled={loading || students.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Loader className={loading ? "animate-spin" : ""} size={20} />
            <span>Train Model</span>
          </button>
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <UserPlus size={20} />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {/* Registration Form */}
      {showRegisterForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Register New Student</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter student ID"
                disabled={capturing || registering}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter student name"
                disabled={capturing || registering}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Camera Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera Preview
                </label>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {!capturing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <div className="text-white text-center">
                        <Camera size={48} className="mx-auto mb-2" />
                        <p className="text-sm">Camera preview</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-center space-x-4">
                  {!capturing ? (
                    <button
                      onClick={startCapture}
                      disabled={!formData.studentId || !formData.name || registering}
                      className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                    >
                      <Camera size={20} />
                      <span>Start Capture (100 images)</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopCapture}
                      className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Square size={20} />
                      <span>Stop Capture</span>
                    </button>
                  )}
                </div>
                {capturing && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">
                        {capturedImages.length} / 100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${captureProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                  <p>1. Enter student ID and name</p>
                  <p>2. Position student in front of camera</p>
                  <p>3. Click "Start Capture" to capture 100 images</p>
                  <p>4. Student should move slightly during capture</p>
                  <p>5. Wait for capture to complete</p>
                  <p>6. Click "Register Student" to save</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Captured: <span className="font-medium text-gray-900">{capturedImages.length} images</span>
                  </p>
                  {capturedImages.length >= 10 && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Ready to register
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-4">
            <button
              onClick={() => {
                setShowRegisterForm(false)
                stopCamera()
                setCapturedImages([])
                setFormData({ studentId: '', name: '' })
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              disabled={capturedImages.length < 10 || registering}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
            >
              {registering && <Loader className="animate-spin" size={20} />}
              <span>Register Student</span>
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Registered Students</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading students...</div>
        ) : (
          <DataTable
            columns={[
              { key: 'student_id', label: 'Student ID' },
              { key: 'name', label: 'Name' },
              { key: 'registration_date', label: 'Registration Date', render: (value) => 
                new Date(value).toLocaleDateString()
              },
              { key: 'embeddings_count', label: 'Face Embeddings' },
            ]}
            data={students}
            actions={(row) => (
              <button
                onClick={() => handleDelete(row.student_id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={18} />
              </button>
            )}
          />
        )}
      </div>
    </div>
  )
}


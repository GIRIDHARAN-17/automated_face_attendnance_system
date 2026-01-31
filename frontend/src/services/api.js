import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Students API
export const studentsAPI = {
  register: async (studentId, name, images) => {
    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('name', name)
    images.forEach((image) => {
      formData.append('images', image)
    })
    
    const response = await api.post('/students/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  list: async () => {
    const response = await api.get('/students')
    return response.data
  },
  
  delete: async (studentId) => {
    const response = await api.delete(`/students/${studentId}`)
    return response.data
  },
}

// Training API
export const trainingAPI = {
  train: async () => {
    const response = await api.post('/training/train')
    return response.data
  },
  
  status: async () => {
    const response = await api.get('/training/status')
    return response.data
  },
}

// Recognition API
export const recognitionAPI = {
  recognize: async (frame) => {
    const formData = new FormData()
    formData.append('frame', frame)
    
    const response = await api.post('/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

// Attendance API
export const attendanceAPI = {
  getToday: async () => {
    const response = await api.get('/attendance/today')
    return response.data
  },
  
  getHistory: async (startDate, endDate, studentId) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (studentId) params.student_id = studentId
    
    const response = await api.get('/attendance/history', { params })
    return response.data
  },
  
  getStats: async (targetDate) => {
    const params = {}
    if (targetDate) params.target_date = targetDate
    
    const response = await api.get('/attendance/stats', { params })
    return response.data
  },
}

export default api






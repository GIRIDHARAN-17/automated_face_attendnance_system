import { useState, useEffect } from 'react'
import { Download, Calendar, Search } from 'lucide-react'
import { attendanceAPI, studentsAPI } from '../services/api'
import DataTable from '../components/DataTable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    studentId: '',
  })
  const [students, setStudents] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

  useEffect(() => {
    loadStudents()
    loadAttendance()
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [filters, selectedMonth])

  const loadStudents = async () => {
    try {
      const data = await studentsAPI.list()
      setStudents(data)
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const loadAttendance = async () => {
    try {
      setLoading(true)
      let startDate = filters.startDate
      let endDate = filters.endDate

      // If no dates specified, use selected month
      if (!startDate && !endDate && selectedMonth) {
        const year = parseInt(selectedMonth.split('-')[0])
        const month = parseInt(selectedMonth.split('-')[1])
        startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
        const lastDay = new Date(year, month, 0).getDate()
        endDate = new Date(year, month - 1, lastDay).toISOString().split('T')[0]
      }

      const data = await attendanceAPI.getHistory(startDate, endDate, filters.studentId || undefined)
      setAttendance(data)

      // Calculate monthly data
      if (selectedMonth) {
        calculateMonthlyData(data)
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
      alert('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const calculateMonthlyData = (attendanceData) => {
    // Group by date
    const dailyMap = {}
    attendanceData.forEach((record) => {
      const date = record.date
      if (!dailyMap[date]) {
        dailyMap[date] = { present: 0, absent: 0, late: 0 }
      }
      if (record.status === 'present') {
        dailyMap[date].present++
      } else if (record.status === 'late') {
        dailyMap[date].late++
      } else {
        dailyMap[date].absent++
      }
    })

    // Get total students
    const totalStudents = students.length

    // Convert to chart data
    const chartData = Object.entries(dailyMap).map(([date, counts]) => {
      const total = counts.present + counts.absent + counts.late
      const percentage = totalStudents > 0 ? ((counts.present + counts.late) / totalStudents) * 100 : 0
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        percentage: percentage.toFixed(1),
      }
    })

    setMonthlyData(chartData.sort((a, b) => new Date(a.date) - new Date(b.date)))
  }

  const exportToCSV = () => {
    if (attendance.length === 0) {
      alert('No data to export')
      return
    }

    // CSV headers
    const headers = ['Student ID', 'Name', 'Date', 'Status', 'Time', 'Confidence']
    const rows = attendance.map((record) => [
      record.student_id,
      record.student_name || record.student_id,
      record.date,
      record.status,
      new Date(record.timestamp).toLocaleTimeString(),
      record.confidence ? (record.confidence * 100).toFixed(2) + '%' : 'N/A',
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance</h1>
          <p className="text-gray-600">View and manage attendance records</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student
            </label>
            <select
              value={filters.studentId}
              onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.name} ({student.student_id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Attendance Percentage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="percentage" fill="#7c3aed" name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Attendance Table */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Records</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading attendance...</div>
        ) : (
          <DataTable
            columns={[
              { key: 'student_id', label: 'Student ID' },
              { key: 'student_name', label: 'Name', render: (value, row) => value || row.student_id },
              { key: 'date', label: 'Date', render: (value) => new Date(value).toLocaleDateString() },
              { key: 'status', label: 'Status', render: (value) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  value === 'present' ? 'bg-green-100 text-green-800' :
                  value === 'late' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {value}
                </span>
              )},
              { key: 'timestamp', label: 'Time', render: (value) => new Date(value).toLocaleTimeString() },
              { key: 'confidence', label: 'Confidence', render: (value) => 
                value ? `${(value * 100).toFixed(1)}%` : 'N/A'
              },
            ]}
            data={attendance}
          />
        )}
      </div>
    </div>
  )
}






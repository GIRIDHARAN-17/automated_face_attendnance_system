import { useEffect, useState } from 'react'
import KPICard from '../components/KPICard'
import { Users, UserCheck, UserX, Percent } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { studentsAPI, attendanceAPI } from '../services/api'
import DataTable from '../components/DataTable'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendancePercentage: 0,
  })
  const [dailyTrend, setDailyTrend] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get students count
      const students = await studentsAPI.list()
      const totalStudents = students.length

      // Get today's stats
      const todayStats = await attendanceAPI.getStats()
      
      // Get today's attendance
      const todayAttendance = await attendanceAPI.getToday()
      
      // Get last 7 days attendance
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      
      const history = await attendanceAPI.getHistory(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      // Process daily trend
      const dailyMap = {}
      history.forEach((record) => {
        const date = record.date
        if (!dailyMap[date]) {
          dailyMap[date] = { date, present: 0, total: totalStudents }
        }
        if (record.status === 'present' || record.status === 'late') {
          dailyMap[date].present++
        }
      })
      
      const trend = Object.values(dailyMap).map((d) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: totalStudents > 0 ? ((d.present / totalStudents) * 100).toFixed(1) : 0,
      }))
      
      setDailyTrend(trend)
      
      // Recent activity (last 10 attendance records)
      const recent = todayAttendance.slice(0, 10).map((r) => ({
        student: r.student_name || r.student_id,
        status: r.status,
        time: new Date(r.timestamp).toLocaleTimeString(),
      }))
      
      setRecentActivity(recent)
      
      setStats({
        totalStudents,
        presentToday: todayStats.present || 0,
        absentToday: todayStats.absent || 0,
        attendancePercentage: todayStats.attendance_percentage || 0,
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of attendance system</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="primary"
        />
        <KPICard
          title="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          color="green"
        />
        <KPICard
          title="Absent Today"
          value={stats.absentToday}
          icon={UserX}
          color="orange"
        />
        <KPICard
          title="Attendance %"
          value={`${stats.attendancePercentage}%`}
          icon={Percent}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="attendance" stroke="#7c3aed" strokeWidth={2} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendance" fill="#7c3aed" name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <DataTable
          columns={[
            { key: 'student', label: 'Student' },
            { key: 'status', label: 'Status', render: (value) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                value === 'present' ? 'bg-green-100 text-green-800' :
                value === 'late' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {value}
              </span>
            )},
            { key: 'time', label: 'Time' },
          ]}
          data={recentActivity}
        />
      </div>
    </div>
  )
}






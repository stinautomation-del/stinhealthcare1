import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDataStore, useAuthStore } from '@/store/useStore';
import { dashboardApi, scheduleApi, escalationsApi } from '@/services/api';
import {
  Users,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatTimeToAmPm } from '@/lib/utils';

export function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    dashboardStats,
    wardStats,
    scheduleEntries,
    escalations,
    setDashboardStats,
    setWardStats,
    setScheduleEntries,
    setEscalations,
  } = useDataStore();

  const [, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, wardStatsRes, scheduleRes, escalationRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getWardStats(),
          scheduleApi.getToday(),
          escalationsApi.getOpen(),
        ]);

        if (statsRes.success) setDashboardStats(statsRes.data!);
        if (wardStatsRes.success) setWardStats(wardStatsRes.data!);
        if (scheduleRes.success) setScheduleEntries(scheduleRes.data!);
        if (escalationRes.success) setEscalations(escalationRes.data!);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setDashboardStats, setWardStats, setScheduleEntries, setEscalations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'given':
        return 'bg-green-100 text-green-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pieChartData = dashboardStats
    ? [
        { name: 'Given', value: dashboardStats.givenDoses, color: '#22c55e' },
        { name: 'Missed', value: dashboardStats.missedDoses, color: '#ef4444' },
        { name: 'Pending', value: dashboardStats.pendingDoses, color: '#f59e0b' },
      ]
    : [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.name.split(' ')[0]}
          </h2>
          <p className="text-gray-500 mt-1">
            Here's what's happening in your ward today
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="w-3 h-3 mr-1" />
            System Online
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Patients
              </CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalPatients}</div>
              <p className="text-xs text-gray-500 mt-1">Across all wards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Today's Reminders
              </CardTitle>
              <Bell className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.todayReminders}</div>
              <p className="text-xs text-gray-500 mt-1">
                {dashboardStats.givenDoses} given, {dashboardStats.pendingDoses} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Missed Doses
              </CardTitle>
              <XCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.missedDoses}</div>
              <p className="text-xs text-gray-500 mt-1">
                {dashboardStats.escalationRate}% escalation rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Avg Response Time
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.avgAcknowledgementTime}m
              </div>
              <p className="text-xs text-gray-500 mt-1">Target: &lt; 3 minutes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dose Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Dose Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ward Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Ward Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="wardName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="givenDoses" fill="#22c55e" name="Given" />
                  <Bar dataKey="missedDoses" fill="#ef4444" name="Missed" />
                  <Bar dataKey="pendingDoses" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Reminders</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reminders')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduleEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        entry.status === 'given'
                          ? 'bg-green-500'
                          : entry.status === 'missed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{entry.patientName}</p>
                      <p className="text-xs text-gray-500">
                        {entry.medicineName} {entry.dose} at {formatTimeToAmPm(entry.scheduledTime)}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(entry.status)}>
                    {entry.status}
                  </Badge>
                </div>
              ))}
              {scheduleEntries.length === 0 && (
                <p className="text-center text-gray-500 py-4">No reminders today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Escalations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Escalations</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/escalations')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalations.filter(e => e.status === 'open').map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">{escalation.patientName}</p>
                      <p className="text-xs text-gray-500">
                        {escalation.medicineName} - Scheduled: {formatTimeToAmPm(escalation.scheduledTime)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">Open</Badge>
                </div>
              ))}
              {escalations.filter(e => e.status === 'open').length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No active escalations</p>
                  <p className="text-sm text-gray-400">Great job team!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

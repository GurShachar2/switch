import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, DollarSign, Calendar, TrendingUp, Pause } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    pausedClients: 0,
    totalManagers: 0,
    monthlyRevenue: 0,
    clientsDueThisWeek: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clients, managers] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.CampaignManager.list()
      ]);

      const activeClients = clients.filter(c => c.status === 'active');
      const pausedClients = clients.filter(c => c.status === 'paused');
      const monthlyRevenue = activeClients.reduce((sum, client) => sum + (client.monthly_retainer || 0), 0);

      // Get clients with billing due this week
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const clientsDueThisWeek = clients.filter(client => {
        if (!client.next_billing_date || client.status !== 'active') return false;
        const billingDate = new Date(client.next_billing_date);
        return billingDate >= today && billingDate <= nextWeek;
      });

      setStats({
        totalClients: clients.length,
        activeClients: activeClients.length,
        pausedClients: pausedClients.length,
        totalManagers: managers.length,
        monthlyRevenue,
        clientsDueThisWeek
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">לוח הבקרה</h1>
        <p className="text-slate-600">סקירה כללית של המערכת</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="סך הכל לקוחות"
          value={stats.totalClients}
          icon={Users}
          color="bg-blue-500"
          subtext="בכל הסטטוסים"
        />
        <StatCard
          title="לקוחות פעילים"
          value={stats.activeClients}
          icon={TrendingUp}
          color="bg-green-500"
          subtext="מייצרים הכנסות"
        />
        <StatCard
          title="לקוחות בהקפאה"
          value={stats.pausedClients}
          icon={Pause}
          color="bg-orange-500"
          subtext="זמנית לא פעילים"
        />
        <StatCard
          title="מנהלי קמפיינים"
          value={stats.totalManagers}
          icon={UserCheck}
          color="bg-purple-500"
          subtext="צוות העבודה"
        />
      </div>

      {/* Revenue and Upcoming Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="w-6 h-6" />
              הכנסות חודשיות צפויות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900 mb-2">
              ₪{stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-green-700">מלקוחות פעילים</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Calendar className="w-6 h-6" />
              חשבוניות השבוע
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900 mb-2">
              {stats.clientsDueThisWeek.length}
            </div>
            <div className="space-y-1">
              {stats.clientsDueThisWeek.slice(0, 3).map(client => (
                <p key={client.id} className="text-sm text-blue-700">
                  {client.name} - {format(new Date(client.next_billing_date), "d/M", { locale: he })}
                </p>
              ))}
              {stats.clientsDueThisWeek.length > 3 && (
                <p className="text-sm text-blue-600">ועוד {stats.clientsDueThisWeek.length - 3}...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-slate-900 to-blue-900 text-white border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">ברוכים הבאים ל-Switch Marketing</h2>
          <p className="text-slate-300">
            מערכת ניהול תשלומים מתקדמת למנהלי קמפיינים ולקוחות
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
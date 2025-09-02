import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlayCircle, XCircle, FileText, User } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { ReportCycle } from "@/api/entities";
import ClientReportDialog from './ClientReportDialog';

export default function WeeklyReportWindow({ clients, manager }) {
  const [activeCycle, setActiveCycle] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStartingCycle, setIsStartingCycle] = useState(false);
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const loadCycleAndReports = useCallback(async () => {
    if (!manager || !manager.id) return;
    setLoading(true);
    try {
      const cycles = await ReportCycle.filter({ campaign_manager_id: manager.id, status: 'active' });
      const currentCycle = cycles.length > 0 ? cycles[0] : null;
      setActiveCycle(currentCycle);

      if (currentCycle) {
        const reports = await base44.entities.WeeklyReport.filter({ campaign_manager_id: manager.id });
        const cycleReports = reports.filter(r => new Date(r.created_date) >= new Date(currentCycle.start_date));
        setAllReports(cycleReports);
      } else {
        setAllReports([]);
      }
    } catch (error) {
      console.error("Error loading report cycle:", error);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    loadCycleAndReports();
  }, [loadCycleAndReports]);

  const startNewCycle = async () => {
    setIsStartingCycle(true);
    try {
      await ReportCycle.create({
        campaign_manager_id: manager.id,
        status: 'active',
        start_date: new Date().toISOString()
      });
      await loadCycleAndReports();
    } catch (error) {
      console.error("Error starting new cycle:", error);
    } finally {
      setIsStartingCycle(false);
    }
  };

  const closeCycle = async () => {
    if (!activeCycle) return;
    setIsClosingCycle(true);
    try {
      await ReportCycle.update(activeCycle.id, {
        status: 'completed',
        end_date: new Date().toISOString()
      });
      await loadCycleAndReports();
    } catch (error) {
      console.error("Error closing cycle:", error);
    } finally {
      setIsClosingCycle(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">טוען מצב סבב דוחות...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activeCycle) {
    return (
      <Card className="text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-12">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PlayCircle className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                האם ברצונך להתחיל סבב דוחות חדש?
              </h2>
              <p className="text-slate-600 text-lg mb-8">
                התחל סבב דוחות שבועי חדש עבור כל הלקוחות הפעילים
              </p>
            </div>
            <Button 
              onClick={startNewCycle} 
              disabled={isStartingCycle}
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg font-semibold shadow-lg"
            >
              {isStartingCycle ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  מתחיל סבב דוחות...
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6 mr-3" />
                  התחל סבב דוחות שבועי
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeClientsInCycle = clients.filter(c => c.status === 'active');
  const approvedReports = allReports.filter(r => r.status === 'approved');
  const allReportsApproved = activeCycle && 
    activeClientsInCycle.length > 0 && 
    activeClientsInCycle.every(client => {
      return approvedReports.some(report => report.client_id === client.id);
    });

  const copyReportText = (text) => {
    navigator.clipboard.writeText(text);
    alert("הדוח הועתק ללוח!");
  };

  const getClientStatus = (client) => {
    const clientReport = allReports.find(r => r.client_id === client.id);
    if (!clientReport) return { status: 'pending', text: 'ממתין לדוח', color: 'bg-gray-100 text-gray-800' };
    
    const statusConfig = {
      pending_approval: { text: "נשלח לאישור", color: "bg-yellow-100 text-yellow-800" },
      requires_changes: { text: "דורש תיקונים", color: "bg-red-100 text-red-800" },
      approved: { text: "אושר", color: "bg-green-100 text-green-800" },
    };
    
    return statusConfig[clientReport.status] || { text: clientReport.status, color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              סבב דוחות שבועי פעיל
            </CardTitle>
            <p className="text-slate-600">
              התחלת ב-{new Date(activeCycle.start_date).toLocaleDateString('he-IL')}
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={closeCycle}
            disabled={isClosingCycle}
            className="flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            {isClosingCycle ? 'סוגר סבב...' : 'סגור סבב דוחות'}
          </Button>
        </CardHeader>
      </Card>

      {allReportsApproved && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-green-900 flex items-center justify-center gap-3">
                <CheckCircle2 className="w-10 h-10" />
                כל הדוחות אושרו בהצלחה!
              </CardTitle>
              <p className="text-green-700 text-lg mt-2">
                העתק את הדוחות המאושרים ושלח אותם ללקוחותיך בוואטסאפ
              </p>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {approvedReports.map(report => {
              const client = clients.find(c => c.id === report.client_id);
              const clientName = client?.name || 'לקוח לא ידוע';
              return (
                <Card key={report.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {clientName}
                      </CardTitle>
                      <Button 
                        onClick={() => copyReportText(report.final_content)} 
                        variant="outline" 
                        className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        העתק דוח
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{report.final_content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold text-orange-900 mb-4">
                לחץ כאן לאחר שסיימת לשלוח את כל הדוחות ללקוחות
              </h3>
              <Button
                onClick={closeCycle}
                disabled={isClosingCycle}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg font-semibold shadow-lg"
              >
                <XCircle className="w-6 h-6 mr-3" />
                {isClosingCycle ? 'סוגר סבב דוחות...' : 'לסגירת סבב דוחות שבועי'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!allReportsApproved && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">בחר לקוח להגשת דוח</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClientsInCycle.map((client) => {
              const clientStatus = getClientStatus(client);
              return (
                <Card 
                  key={client.id} 
                  className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedClient(client)}
                >
                  <CardHeader className="text-center p-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 mb-2">
                      {client.name}
                    </CardTitle>
                    {client.company && (
                      <p className="text-sm text-slate-600 mb-3">{client.company}</p>
                    )}
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${clientStatus.color}`}>
                      {clientStatus.text}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {selectedClient && (
        <ClientReportDialog
          client={selectedClient}
          manager={manager}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onReportUpdate={loadCycleAndReports}
          activeCycle={activeCycle}
        />
      )}
    </div>
  );
}
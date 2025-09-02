
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  User, 
  Building2, 
  Calendar,
  CheckSquare,
  Clock,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  Eye,
  EyeOff
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function DailyReports() {
  const [reports, setReports] = useState([]);
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedManager, setSelectedManager] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd")); // Default to today
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd")); // Default to today
  const [showReportsWithoutNotes, setShowReportsWithoutNotes] = useState(true);
  const [loading, setLoading] = useState(true);

  // New state for treatment notes dialog
  const [treatmentDialog, setTreatmentDialog] = useState(null); // Holds the report object being treated
  const [treatmentNotes, setTreatmentNotes] = useState(""); // Holds the notes for the textarea

  useEffect(() => {
    loadData();
  }, []);

  const filterReports = useCallback(() => {
    let filtered = [...reports];

    // Filter by manager
    if (selectedManager !== "all") {
      filtered = filtered.filter(report => report.campaign_manager_id === selectedManager);
    }

    // Filter by client
    if (selectedClient !== "all") {
      filtered = filtered.filter(report => report.client_id === selectedClient);
    }

    // Filter by date range
    if (dateFrom && dateTo) {
      const fromDate = startOfDay(new Date(dateFrom));
      const toDate = endOfDay(new Date(dateTo));
      
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.report_date);
        return isWithinInterval(reportDate, { start: fromDate, end: toDate });
      });
    }

    setFilteredReports(filtered);
  }, [reports, selectedManager, selectedClient, dateFrom, dateTo]);

  useEffect(() => {
    filterReports();
  }, [filterReports]); // Now depends on the memoized filterReports function

  const loadData = async () => {
    setLoading(true); // Ensure loading is true when data is being fetched
    try {
      const [reportsData, managersData, clientsData] = await Promise.all([
        base44.entities.ClientDailyReport.list("-submitted_at"),
        base44.entities.CampaignManager.list(),
        base44.entities.Client.list()
      ]);
      
      setReports(reportsData);
      setManagers(managersData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (managerId) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : "לא נמצא";
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "לא נמצא";
  };

  const getClientCompany = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company : "";
  };

  const exportToCSV = () => {
    // Add 'דרכי טיפול' column to the CSV header
    let csvContent = "תאריך,מנהל קמפיינים,לקוח,חברה,משימות הושלמו,סך משימות,הערות,דרכי טיפול\n";
    
    filteredReports.forEach(report => {
      const notes = report.notes ? report.notes.replace(/"/g, '""').replace(/\n/g, ' ') : '';
      const treatmentNotes = report.treatment_notes ? report.treatment_notes.replace(/"/g, '""').replace(/\n/g, ' ') : '';
      csvContent += `"${format(new Date(report.report_date), 'd/M/yyyy')}","${getManagerName(report.campaign_manager_id)}","${getClientName(report.client_id)}","${getClientCompany(report.client_id) || ''}","${report.tasks_completed}","${report.total_tasks}","${notes}","${treatmentNotes}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to open the treatment notes dialog
  const openTreatmentDialog = (report) => {
    setTreatmentDialog(report);
    setTreatmentNotes(report.treatment_notes || "");
  };

  // Function to save treatment notes
  const saveTreatmentNotes = async () => {
    if (!treatmentDialog) return;
    
    try {
      await base44.entities.ClientDailyReport.update(treatmentDialog.id, {
        treatment_notes: treatmentNotes
      });
      setTreatmentDialog(null); // Close dialog
      setTreatmentNotes(""); // Clear notes
      loadData(); // Refresh data to show updated notes
    } catch (error) {
      console.error("Error saving treatment notes:", error);
      alert("שגיאה בשמירת דרכי הטיפול");
    }
  };

  // Separate reports with and without notes
  const reportsWithNotes = filteredReports.filter(report => report.notes && report.notes.trim() !== "");
  const reportsWithoutNotes = filteredReports.filter(report => !report.notes || report.notes.trim() === "");

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-600" />
            דוחות יומיים
          </h1>
          <p className="text-slate-600 mt-1">מעקב אחר דוחות וביצועים יומיים</p>
        </div>
        
        <Button 
          onClick={exportToCSV}
          variant="outline"
          disabled={filteredReports.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          ייצא ל-CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              דוחות עם הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {reportsWithNotes.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              דוחות ללא הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {reportsWithoutNotes.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700">סך דוחות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {filteredReports.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700">משימות הושלמו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              {filteredReports.reduce((sum, report) => sum + report.tasks_completed, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            סינון דוחות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>מנהל קמפיינים</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="כל המנהלים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המנהלים</SelectItem>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>לקוח</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הלקוחות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הלקוחות</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `- ${client.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תאריך מ</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>תאריך עד</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports with Notes - Priority Section */}
      {reportsWithNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              דוחות עם הערות ומסקנות ({reportsWithNotes.length})
            </h2>
            <Badge className="bg-blue-100 text-blue-800">עדיפות גבוהה</Badge>
          </div>

          <div className="space-y-4">
            {reportsWithNotes.map(report => (
              <Card key={`notes-${report.id}`} className="bg-white border-l-4 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-l from-slate-50 to-blue-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {format(new Date(report.report_date), "d/M/yyyy", { locale: he })}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {getManagerName(report.campaign_manager_id)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {getClientName(report.client_id)}
                          {getClientCompany(report.client_id) && ` - ${getClientCompany(report.client_id)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                        <CheckSquare className="w-3 h-3 mr-1" />
                        {report.tasks_completed}/{report.total_tasks} משימות
                      </Badge>
                      <div className="text-xs text-slate-500 mt-1">
                        נשלח: {format(parseISO(report.submitted_at), "HH:mm", { locale: he })}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-4">
                  <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      הערות ומסקנות:
                    </h4>
                    <p className="text-blue-800 whitespace-pre-wrap">{report.notes}</p>
                  </div>
                  
                  {/* Treatment Notes Section */}
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-green-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        דרכי טיפול:
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTreatmentDialog(report)}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        {report.treatment_notes ? 'ערוך טיפול' : 'הוסף טיפול'}
                      </Button>
                    </div>
                    {report.treatment_notes ? (
                      <p className="text-green-800 whitespace-pre-wrap text-sm">{report.treatment_notes}</p>
                    ) : (
                      <p className="text-green-600 text-sm italic">לא נרשמו דרכי טיפול</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reports without Notes - Compact Section */}
      {reportsWithoutNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              דוחות ללא הערות ({reportsWithoutNotes.length})
            </h2>
            <Button
              variant="ghost"
              onClick={() => setShowReportsWithoutNotes(!showReportsWithoutNotes)}
              className="flex items-center gap-2"
            >
              {showReportsWithoutNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showReportsWithoutNotes ? 'הסתר' : 'הצג'}
              {showReportsWithoutNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showReportsWithoutNotes && (
            <Card className="bg-green-50 border border-green-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {reportsWithoutNotes.map(report => (
                    <div key={`no-notes-${report.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-slate-900">
                          {format(new Date(report.report_date), "d/M", { locale: he })}
                        </div>
                        <div className="text-sm text-slate-600">
                          {getManagerName(report.campaign_manager_id)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {getClientName(report.client_id)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                          <CheckSquare className="w-3 h-3 mr-1" />
                          {report.tasks_completed}/{report.total_tasks}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          הושלם
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין דוחות להצגה</h3>
          <p className="text-slate-500">לא נמצאו דוחות יומיים לפי הקריטריונים שנבחרו</p>
        </div>
      )}

      {/* Treatment Notes Dialog */}
      <Dialog open={!!treatmentDialog} onOpenChange={() => setTreatmentDialog(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>דרכי טיפול בהערות דוח</DialogTitle>
            <div className="text-sm text-slate-600 mt-2">
              {treatmentDialog && (
                <>
                  לקוח: {getClientName(treatmentDialog.client_id)} |&nbsp;
                  תאריך: {format(new Date(treatmentDialog.report_date), "d/M/yyyy", { locale: he })} |&nbsp;
                  מנהל: {getManagerName(treatmentDialog.campaign_manager_id)}
                </>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {treatmentDialog && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">ההערה המקורית:</h4>
                <p className="text-blue-800 whitespace-pre-wrap text-sm">{treatmentDialog.notes}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="treatment-notes">דרכי טיפול והנחיות:</Label>
              <Textarea
                id="treatment-notes"
                placeholder="תאר את הפעולות שננקטו או צריכות להינקט בעקבות ההערה..."
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-sm text-slate-500">
                דרכי הטיפול ישלחו למערכת ה-AI כהקשר נוסף בניתוח הדוחות
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTreatmentDialog(null)}>
              ביטול
            </Button>
            <Button onClick={saveTreatmentNotes} className="bg-green-600 hover:bg-green-700">
              שמור דרכי טיפול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { FileClock, User, Building2, Calendar, Check, MessageSquare, History, X, Edit, Info } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const statusConfig = {
  pending_approval: { text: "ממתין לאישור", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  requires_changes: { text: "דורש תיקונים", color: "bg-red-100 text-red-800 border-red-200" },
  approved: { text: "מאושר", color: "bg-green-100 text-green-800 border-green-200" },
};

const getStatusBadge = (status) => {
  const config = statusConfig[status] || { text: status, color: "bg-gray-100 text-gray-800" };
  return <Badge className={config.color}>{config.text}</Badge>;
};

export default function WeeklyReportsAdmin() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState({});
  const [managers, setManagers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsData, clientsData, managersData] = await Promise.all([
        base44.entities.WeeklyReport.list("-report_date"),
        base44.entities.Client.list(),
        base44.entities.CampaignManager.list()
      ]);
      setReports(reportsData);
      setClients(clientsData.reduce((acc, client) => ({ ...acc, [client.id]: client }), {}));
      setManagers(managersData.reduce((acc, manager) => ({ ...acc, [manager.id]: manager }), {}));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (report) => {
    const clientPreviousReports = reports
      .filter(r => r.client_id === report.client_id && r.id !== report.id && r.status === 'approved')
      .sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
    
    setPreviousReports(clientPreviousReports.slice(0, 2));
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
  };

  const handleReview = async (newStatus) => {
    if (!selectedReport) return;

    const notesToSave = (newStatus === 'requires_changes' || (newStatus === 'approved' && adminNotes)) ? adminNotes : "";

    try {
      await base44.entities.WeeklyReport.update(selectedReport.id, {
        status: newStatus,
        admin_notes: notesToSave,
      });
      setSelectedReport(null);
      setAdminNotes("");
      loadData();
    } catch (error) {
      console.error("Error updating report status:", error);
      alert("שגיאה בעדכון הדוח. נסה שנית.");
    }
  };

  const reportsToReview = reports.filter(r => r.status === 'pending_approval' || r.status === 'requires_changes');
  const approvedReports = reports.filter(r => r.status === 'approved');

  if (loading) return <div className="p-8">טוען דוחות...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileClock className="w-8 h-8 text-indigo-600" />
          אישור דוחות שבועיים
        </h1>
        <p className="text-slate-600 mt-1">סקירה ואישור דוחות שבועיים ממנהלי הקמפיינים</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>דוחות הממתינים לסקירה ({reportsToReview.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportsToReview.length > 0 ? reportsToReview.map(report => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                <div>
                  <p className="font-semibold">{clients[report.client_id]?.name || 'לקוח לא ידוע'}</p>
                  <p className="text-sm text-slate-500">
                    {managers[report.campaign_manager_id]?.name || 'מנהל לא ידוע'} - {format(new Date(report.report_date), 'd/M/yyyy', { locale: he })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(report.status)}
                  <Button onClick={() => openReviewDialog(report)}>פתח לסקירה</Button>
                </div>
              </div>
            )) : <p className="text-slate-500">אין דוחות הממתינים לאישור.</p>}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="approved-reports">
          <AccordionTrigger className="text-lg font-semibold">היסטוריית דוחות מאושרים</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-4">
              {approvedReports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                   <p>{clients[report.client_id]?.name} - {format(new Date(report.report_date), 'd/M/yyyy')} ({managers[report.campaign_manager_id]?.name})</p>
                   {getStatusBadge(report.status)}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>סקירת דוח שבועי - {clients[selectedReport?.client_id]?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[70vh] overflow-y-auto p-2">
            {/* Current Report */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">דוח נוכחי לאישור</h3>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 whitespace-pre-wrap">{selectedReport?.final_content}</CardContent>
              </Card>

              <h3 className="font-semibold text-lg">הוסף הערות</h3>
              <Textarea 
                placeholder="הערות יוצגו למנהל הקמפיינים. ניתן לאשר עם הערה, או לשלוח לתיקון עם הערה."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
            {/* Previous Reports */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><History className="w-5 h-5"/> 2 דוחות קודמים</h3>
              {previousReports.length > 0 ? previousReports.map(report => (
                <Card key={report.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{format(new Date(report.report_date), 'd MMMM yyyy', { locale: he })}</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-slate-600">{report.final_content}</CardContent>
                </Card>
              )) : <p className="text-slate-500">לא נמצאו דוחות קודמים מאושרים עבור לקוח זה.</p>}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="destructive" onClick={() => handleReview('requires_changes')} disabled={!adminNotes}>
              <X className="ml-2 w-4 h-4"/>שלח לתיקונים
            </Button>
            <Button variant="outline" onClick={() => handleReview('approved')} disabled={!adminNotes}>
               <Info className="ml-2 w-4 h-4" />אשר עם הערה
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleReview('approved')}>
              <Check className="ml-2 w-4 h-4"/>אשר דוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

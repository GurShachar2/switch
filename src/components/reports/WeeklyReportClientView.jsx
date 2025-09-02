
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle2, AlertTriangle, FileText, MessageSquare, Plus } from 'lucide-react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const getStatusBadge = (status) => {
  const statusConfig = {
    draft: { text: "טיוטה", color: "bg-gray-100 text-gray-800 border border-gray-200", icon: FileText },
    pending_approval: { text: "ממתין לאישור", color: "bg-yellow-100 text-yellow-800 border border-yellow-200", icon: Clock },
    requires_changes: { text: "דורש תיקונים", color: "bg-red-100 text-red-800 border border-red-200", icon: AlertTriangle },
    approved: { text: "מאושר", color: "bg-green-100 text-green-800 border border-green-200", icon: CheckCircle2 },
  };
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      {Icon && <Icon className="w-3 h-3" />}
      {config.text}
    </Badge>
  );
};

export default function WeeklyReportClientView({ client, manager, isCycleActive = false, cycleReports = [], onReportUpdate }) {
  const [reports, setReports] = useState(cycleReports);
  const [loading, setLoading] = useState(false); // Used for submission state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newReportContent, setNewReportContent] = useState("");
  const [isImprovingWithAI, setIsImprovingWithAI] = useState(false);
  const [showImprovementDialog, setShowImprovementDialog] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [improvedContent, setImprovedContent] = useState("");

  useEffect(() => {
    setReports(cycleReports);
    const activeReportInCycle = cycleReports.find(r => r.status === 'pending_approval' || r.status === 'approved' || r.status === 'requires_changes');
    if (activeReportInCycle) {
      setShowCreateForm(false);
      setNewReportContent(activeReportInCycle.status === 'requires_changes' ? activeReportInCycle.final_content : "");
    } else {
      setShowCreateForm(true);
      setNewReportContent("");
    }
  }, [cycleReports]);

  const handleImproveWithAI = async () => {
    if (!newReportContent.trim()) {
      alert("אנא כתב תוכן לדוח לפני השיפור");
      return;
    }
    setIsImprovingWithAI(true);
    setOriginalContent(newReportContent);
    try {
      const { InvokeLLM } = await import('@/api/integrations');
      const improved = await InvokeLLM({
        prompt: `אתה עוזר מקצועי לכתיבת דוחות שבועיים קצרים ומקצועיים למנהל קמפיינים דיגיטליים.
הנה הדוח הנוכחי עבור הלקוח "${client.name}":
${newReportContent}
אנא שפר את הדוח בהתאם לקריטריונים הבאים:
1. דוח קצר ומקצועי המתאים לשליחה בווצאפ
2. מבנה ברור עם נקודות מרכזיות
3. שפר את הנוסח והבהירות
4. הדגש הישגים ותוצאות חשובות
5. שמור על טון מקצועי וידידותי
6. הקפד על עברית נכונה
7. בלי כוכביות, סלאשים או כל מארקדאון אחר
8. בלי פתיחה וסגירה - הגש רק את הדוח עצמו
החזר רק את הדוח המשופר בעברית, ללא הקדמה או סיכום נוסף:`,
        add_context_from_internet: false
      });
      setImprovedContent(improved);
      setShowImprovementDialog(true);
    } catch (error) {
      console.error("Error improving report with AI:", error);
      alert("שגיאה בשיפור הדוח. אנא נסה שוב.");
    } finally {
      setIsImprovingWithAI(false);
    }
  };

  const handleUseImprovedContent = () => {
    setNewReportContent(improvedContent);
    setShowImprovementDialog(false);
    setOriginalContent("");
    setImprovedContent("");
  };

  const handleKeepOriginal = () => {
    setShowImprovementDialog(false);
    setOriginalContent("");
    setImprovedContent("");
  };

  const handleSubmitReport = async () => {
    if (!newReportContent.trim()) {
      alert("אנא הזן תוכן לדוח לפני השליחה");
      return;
    }
    setLoading(true);
    const reportToUpdate = reports.find(r => r.status === 'requires_changes' || r.status === 'pending_approval');
    
    try {
      if (reportToUpdate) {
        await base44.entities.WeeklyReport.update(reportToUpdate.id, {
          final_content: newReportContent.trim(),
          status: 'pending_approval',
          version: (reportToUpdate.version || 0) + 1
        });
      } else {
        await base44.entities.WeeklyReport.create({
          campaign_manager_id: manager.id,
          client_id: client.id,
          report_date: new Date().toISOString().split('T')[0],
          final_content: newReportContent.trim(),
          status: 'pending_approval',
          version: 1
        });
      }
      
      if(onReportUpdate) {
        onReportUpdate();
      }
      alert("הדוח נשלח לאישור בהצלחה!");
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("שגיאה בשליחת הדוח. אנא נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const activeReport = reports.find(r => r.status === 'pending_approval' || r.status === 'approved' || r.status === 'requires_changes');
  const requiresChangesReport = reports.find(r => r.status === 'requires_changes');

  const copyReportText = (text) => {
    navigator.clipboard.writeText(text);
    alert("הדוח הועתק ללוח!");
  };

  if (!isCycleActive) {
    return (
        <AccordionItem value={client.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg opacity-50">
            <AccordionTrigger className="p-6">
                <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-semibold text-lg">{client.name}</span>
                    <Badge variant="outline">יש להתחיל סבב דוחות</Badge>
                </div>
            </AccordionTrigger>
        </AccordionItem>
    );
  }

  return (
    <AccordionItem value={client.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg">
      <AccordionTrigger className="p-6">
        <div className="flex justify-between items-center w-full pr-4">
          <span className="font-semibold text-lg">{client.name}</span>
          {activeReport ? getStatusBadge(activeReport.status) : <Badge variant="outline">מוכן לדיווח</Badge>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-6 space-y-6">
        {!activeReport && !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2"/>
              צור דוח חדש עבור {client.name}
            </Button>
        )}

        {activeReport && !showCreateForm && (
          <Card className={`${activeReport.status === 'approved' ? 'bg-green-50 border-green-200' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  דוח אחרון
                  {getStatusBadge(activeReport.status)}
                </CardTitle>
                {activeReport.status === 'approved' && (
                  <Button 
                    onClick={() => copyReportText(activeReport.final_content)} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    העתק דוח
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{activeReport.final_content}</p>
              {activeReport.status === 'requires_changes' && activeReport.admin_notes && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">הערות מהמנהל:</h4>
                  <p className="text-red-700">{activeReport.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showCreateForm && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {requiresChangesReport ? "עריכת דוח לפי הערות המנהל" : "יצירת דוח שבועי חדש"}
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {client.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {requiresChangesReport && requiresChangesReport.admin_notes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    הערות מהמנהל לתיקון:
                  </h4>
                  <p className="text-red-700 whitespace-pre-wrap">{requiresChangesReport.admin_notes}</p>
                </div>
              )}
              <Textarea
                placeholder="כתב כאן את הדוח השבועי עבור הלקוח..."
                value={newReportContent}
                onChange={(e) => setNewReportContent(e.target.value)}
                className="min-h-[300px] text-right"
                dir="rtl"
              />
              <div className="flex justify-between items-center gap-4">
                <div className="flex gap-3">
                  <Button
                    onClick={handleImproveWithAI}
                    disabled={isImprovingWithAI || !newReportContent.trim()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isImprovingWithAI ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        משפר דוח...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                        </svg>
                        שפר דוח עם AI
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateForm(false);
                    }}
                    variant="outline"
                  >
                    ביטול
                  </Button>
                </div>
                <Button
                  onClick={handleSubmitReport}
                  disabled={loading || !newReportContent.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'שולח דוח...' : 'שלח דוח לאישור'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Dialog open={showImprovementDialog} onOpenChange={setShowImprovementDialog}>
          <DialogContent className="max-w-6xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">השוואת דוחות - בחר את הגרסה המועדפת</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-slate-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  הדוח המקורי
                </h3>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="whitespace-pre-wrap text-sm text-slate-700 max-h-96 overflow-y-auto">
                      {originalContent}
                    </div>
                  </CardContent>
                </Card>
                <Button
                  onClick={handleKeepOriginal}
                  variant="outline"
                  className="w-full"
                >
                  השאר את הדוח המקורי
                </Button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-700 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                  הדוח המשופר עם AI
                </h3>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="whitespace-pre-wrap text-sm text-slate-700 max-h-96 overflow-y-auto">
                      {improvedContent}
                    </div>
                  </CardContent>
                </Card>
                <Button
                  onClick={handleUseImprovedContent}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  השתמש בדוח המשופר
                </Button>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={handleKeepOriginal}>
                ביטול
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AccordionContent>
    </AccordionItem>
  );
}

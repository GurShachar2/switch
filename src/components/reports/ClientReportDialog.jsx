import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { InvokeLLM } from "@/api/integrations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MessageSquare, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { he } from "date-fns/locale";

const jsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "סיכום קצר של 2-3 משפטים על ביצועי הלקוח.",
    },
    positives: {
      type: "array",
      items: { type: "string" },
      description: "3-4 נקודות חוזק או הצלחות מהדוחות.",
    },
    opportunities: {
      type: "array",
      items: { type: "string" },
      description: "3-4 הזדמנויות לשיפור או המלצות לפעולה.",
    },
  },
  required: ["summary", "positives", "opportunities"],
};

export default function ClientReportDialog({ client, manager, onClose }) {
  const [reports, setReports] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeReports = async () => {
      if (!client || !manager) return;

      try {
        const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const fetchedReports = await base44.entities.ClientDailyReport.filter({
          client_id: client.id,
          report_date: { ">=": sevenDaysAgo },
        }, "-report_date");

        setReports(fetchedReports);

        if (fetchedReports.length === 0) {
          setAnalysis({ error: "לא נמצאו דוחות אחרונים לניתוח." });
          setLoading(false);
          return;
        }

        const reportsContext = fetchedReports.map(r => 
          `תאריך: ${r.report_date}, משימות שהושלמו: ${r.tasks_completed}/${r.total_tasks}, הערות מנהל קמפיין: ${r.notes || "אין"}`
        ).join("\n");
        
        const treatmentNotesContext = fetchedReports
          .filter(r => r.treatment_notes)
          .map(r => `בתאריך ${r.report_date} ניתנה הנחיית מנהל: ${r.treatment_notes}`)
          .join("\n");

        let prompt = `
          אתה יועץ מומחה לשיווק דיגיטלי. נתח את הדוחות היומיים הבאים עבור הלקוח "${client.name}" שמנוהל על ידי "${manager.name}".
          הדוחות מהשבוע האחרון:
          ${reportsContext}
          
          ${treatmentNotesContext ? `
          שים לב במיוחד להנחיות ודרכי טיפול שניתנו על ידי ההנהלה. התייחס אליהן בניתוח ובהמלצות שלך:
          ${treatmentNotesContext}
          ` : ""}

          ספק ניתוח קצר ותמציתי בפורמט JSON. התמקד במגמות, הצלחות והזדמנויות לשיפור.
        `;

        const response = await InvokeLLM({
          prompt: prompt,
          response_json_schema: jsonSchema,
        });

        setAnalysis(response);
      } catch (error) {
        console.error("Error analyzing reports:", error);
        setAnalysis({ error: "שגיאה בניתוח הדוחות. נסה שנית מאוחר יותר." });
      } finally {
        setLoading(false);
      }
    };

    analyzeReports();
  }, [client, manager]);

  const treatmentNotes = reports.filter(r => r.treatment_notes && r.treatment_notes.trim() !== "");

  return (
    <Dialog open={true} onOpenChange={onClose} dir="rtl">
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ניתוח דוח מתקדם - {client.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="mt-4 text-slate-600">מנתח דוחות... זה עשוי לקחת מספר שניות...</p>
            </div>
          )}

          {!loading && analysis && !analysis.error && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  סיכום מנהלים
                </h3>
                <p className="text-slate-700 bg-blue-50 p-4 rounded-lg border border-blue-200">{analysis.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    נקודות לחיוב
                  </h3>
                  <ul className="list-disc pr-5 space-y-2 text-slate-700">
                    {analysis.positives?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                    הזדמנויות והמלצות
                  </h3>
                  <ul className="list-disc pr-5 space-y-2 text-slate-700">
                    {analysis.opportunities?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>

              {treatmentNotes.length > 0 && (
                <div className="pt-4 border-t">
                   <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                    דרכי טיפול מההנהלה
                  </h3>
                  <div className="space-y-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
                    {treatmentNotes.map(note => (
                      <div key={note.id}>
                        <p className="text-sm text-purple-800 whitespace-pre-wrap">{note.treatment_notes}</p>
                        <p className="text-xs text-purple-600 mt-1">
                          (מתאריך {format(new Date(note.report_date), "d/M/yy", { locale: he })})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && analysis?.error && (
            <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
              {analysis.error}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">סגירה</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
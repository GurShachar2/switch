import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, X } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";

export default function ClientStatusDialog({ client, onUpdate, onClose }) {
  const [pauseDate, setPauseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [useSavedDays, setUseSavedDays] = useState(true);
  const [resumeDate, setResumeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  if (!client) return null;

  const handlePause = () => {
    const pauseDateObj = new Date(pauseDate);
    let savedDays = 0;
    
    // חישוב ימים שמורים: מתאריך ההקפאה עד תאריך החשבונית הבאה
    if (client.next_billing_date) {
      const nextBillingDate = new Date(client.next_billing_date);
      
      // אם תאריך ההקפאה לפני תאריך החשבונית הבאה
      if (pauseDateObj < nextBillingDate) {
        // חשב כמה ימים נשארו מהיום שאחרי ההקפאה עד החשבונית הבאה
        const dayAfterPause = addDays(pauseDateObj, 1);
        savedDays = differenceInDays(nextBillingDate, dayAfterPause) + 1;
        savedDays = Math.max(0, savedDays); // ודא שזה לא שלילי
      }
    }

    onUpdate({
      status: "paused",
      pause_date: pauseDate,
      resume_date: null,
      saved_days: savedDays
    });
  };

  const handleResume = () => {
    const resumeDateObj = new Date(resumeDate);
    let nextBillingDate;
    
    if (useSavedDays && client.saved_days > 0) {
      // השתמש בימים השמורים - החשבונית הבאה היא תאריך החזרה + ימים שמורים
      nextBillingDate = addDays(resumeDateObj, client.saved_days);
    } else {
      // התחל מחדש - החשבונית הבאה היא חודש מתאריך החזרה
      nextBillingDate = new Date(resumeDateObj);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    onUpdate({
      status: "active",
      resume_date: resumeDate,
      saved_days: useSavedDays ? 0 : client.saved_days,
      next_billing_date: format(nextBillingDate, "yyyy-MM-dd")
    });
  };

  // חישוב ימים שמורים לתצוגה מקדימה
  const calculatePreviewSavedDays = () => {
    if (!client.next_billing_date) return 0;
    
    const pauseDateObj = new Date(pauseDate);
    const nextBillingDate = new Date(client.next_billing_date);
    
    if (pauseDateObj < nextBillingDate) {
      const dayAfterPause = addDays(pauseDateObj, 1);
      return Math.max(0, differenceInDays(nextBillingDate, dayAfterPause) + 1);
    }
    return 0;
  };

  const isPaused = client.status === 'paused';

  return (
    <Dialog open={!!client} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPaused ? (
              <>
                <Play className="w-5 h-5 text-green-600" />
                חזרה לפעילות - {client.name}
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 text-orange-600" />
                הקפאת לקוח - {client.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isPaused ? (
            // Resume client
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-800 mb-2">
                  לקוח זה בהקפאה מתאריך {format(new Date(client.pause_date), "d/M/yyyy", { locale: he })}
                </p>
                {client.saved_days > 0 && (
                  <p className="text-sm text-orange-700">
                    ימים שמורים: {client.saved_days}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume_date">תאריך חזרה לפעילות</Label>
                <Input
                  id="resume_date"
                  type="date"
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                />
              </div>

              {client.saved_days > 0 && (
                <div className="flex items-start space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="use_saved_days"
                    checked={useSavedDays}
                    onCheckedChange={setUseSavedDays}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="use_saved_days" className="text-sm font-medium">
                      השתמש בימים השמורים ({client.saved_days} ימים)
                    </Label>
                    <p className="text-xs text-slate-600">
                      {useSavedDays 
                        ? `החשבונית הבאה תצא ב-${format(addDays(new Date(resumeDate), client.saved_days), "d/M/yyyy", { locale: he })}`
                        : "החשבונית הבאה תצא בעוד חודש מתאריך החזרה"
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  ביטול
                </Button>
                <Button 
                  onClick={handleResume}
                  className="bg-green-600 hover:bg-green-700"
                >
                  החזר לפעילות
                </Button>
              </div>
            </div>
          ) : (
            // Pause client
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pause_date">תאריך הקפאה</Label>
                <Input
                  id="pause_date"
                  type="date"
                  value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                />
              </div>

              {/* תצוגה מקדימה של ימים שמורים */}
              {client.next_billing_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    תצוגה מקדימה
                  </p>
                  <p className="text-sm text-blue-700">
                    חשבונית הבאה מתוכננת ל: {format(new Date(client.next_billing_date), "d/M/yyyy", { locale: he })}
                    <br />
                    ימים שיישמרו: <strong>{calculatePreviewSavedDays()} ימים</strong>
                  </p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  הימים השמורים מחושבים מהיום שאחרי תאריך ההקפאה ועד לתאריך החשבונית הבאה.
                  כאשר הלקוח יחזור לפעילות, ניתן יהיה לבחור להשתמש בימים השמורים.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  ביטול
                </Button>
                <Button 
                  onClick={handlePause}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  הקפא לקוח
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
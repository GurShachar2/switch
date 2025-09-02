import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCheck, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function ManagerChangeDialog({ 
  client, 
  managers, 
  onUpdate, 
  onClose 
}) {
  const [newManagerId, setNewManagerId] = useState(client?.campaign_manager_id || "");
  const [changeDate, setChangeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  if (!client) return null;

  const currentManager = managers.find(m => m.id === client.campaign_manager_id);
  const newManager = managers.find(m => m.id === newManagerId);

  const handleConfirm = () => {
    if (newManagerId && newManagerId !== client.campaign_manager_id) {
      onUpdate({
        newManagerId,
        changeDate,
        oldManagerId: client.campaign_manager_id
      });
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            החלפת מנהל קמפיינים - {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">
              מנהל קמפיינים נוכחי: {currentManager?.name || "לא נמצא"}
            </p>
            <p className="text-sm text-blue-700">
              המערכת תיצור רשומת היסטוריה ותחשב תשלומים מדויקים לכל מנהל בהתאם לימי העבודה
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_manager">מנהל קמפיינים חדש</Label>
              <Select value={newManagerId} onValueChange={setNewManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מנהל קמפיינים חדש" />
                </SelectTrigger>
                <SelectContent>
                  {managers.filter(m => m.id !== client.campaign_manager_id).map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                תאריך החלפה
              </Label>
              <Input
                id="change_date"
                type="date"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
              />
              <p className="text-sm text-slate-500">
                המנהל הישן יקבל תשלום עד לתאריך זה, והמנהל החדש מהתאריך הזה ואילך
              </p>
            </div>
          </div>

          {newManager && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">
                מנהל חדש: {newManager.name}
              </p>
              <p className="text-sm text-green-700">
                תעריף: ₪{client.platforms_count === 2 ? newManager.rate_dual_platform : newManager.rate_single_platform} 
                ({client.platforms_count === 1 ? "פלטפורמה אחת" : "2 פלטפורמות"})
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!newManagerId || newManagerId === client.campaign_manager_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              בצע החלפה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
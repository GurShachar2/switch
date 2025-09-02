
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { format, addMonths } from "date-fns";

export default function ClientForm({ client, managers, onSave, onCancel }) {
  const [formData, setFormData] = useState(client || {
    name: "",
    company: "",
    campaign_manager_id: "",
    platforms_count: 1,
    monthly_retainer: "",
    join_date: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const saveData = {
        ...formData,
        monthly_retainer: parseFloat(formData.monthly_retainer) || 0,
        platforms_count: parseInt(formData.platforms_count) || 1,
    };

    // Calculate next_billing_date only for new clients or if join_date changed.
    // For simplicity, we recalculate it on every save.
    const joinDate = new Date(formData.join_date);
    const today = new Date();
    
    // Clear time part for accurate date comparison
    const joinDateOnly = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let nextBillingDate;

    if (joinDateOnly > todayOnly) {
        // If join date is in the future, first bill is on the join date.
        nextBillingDate = joinDate;
    } else {
        // If join date is today or in the past, find the next billing "anniversary".
        const joinDay = joinDate.getDate();
        let potentialBillingDate = new Date(today.getFullYear(), today.getMonth(), joinDay);
        
        if (potentialBillingDate < todayOnly) {
            // If this month's billing day has already passed, set it for next month.
            potentialBillingDate = addMonths(potentialBillingDate, 1);
        }
        nextBillingDate = potentialBillingDate;
    }
    
    saveData.next_billing_date = format(nextBillingDate, "yyyy-MM-dd");

    if (!client) {
      saveData.saved_days = 0;
    }
    
    onSave(saveData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">
            {client ? "עריכת לקוח" : "הוספת לקוח חדש"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">שם הלקוח *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="הזן שם הלקוח"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">שם החברה</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="שם החברה (אופציונלי)"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager">מנהל קמפיינים *</Label>
                <Select
                  value={formData.campaign_manager_id}
                  onValueChange={(value) => handleChange("campaign_manager_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מנהל קמפיינים" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platforms">כמות פלטפורמות</Label>
                <Select
                  value={formData.platforms_count.toString()}
                  onValueChange={(value) => handleChange("platforms_count", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר כמות פלטפורמות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">פלטפורמה אחת</SelectItem>
                    <SelectItem value="2">2 פלטפורמות</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retainer">ריטיינר חודשי (₪) *</Label>
                <Input
                  id="retainer"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_retainer}
                  onChange={(e) => handleChange("monthly_retainer", e.target.value)}
                  placeholder="0.00"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join_date">תאריך הצטרפות *</Label>
                <Input
                  id="join_date"
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => handleChange("join_date", e.target.value)}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="paused">בהקפאה</SelectItem>
                    <SelectItem value="left">עזב</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="הערות נוספות על הלקוח"
                className="h-24 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="hover:bg-slate-50"
              >
                <X className="w-4 h-4 mr-2" />
                ביטול
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {client ? "עדכן" : "שמור"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

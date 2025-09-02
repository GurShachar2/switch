import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { format } from "date-fns";

export default function TaskForm({ task, managers, onSave, onCancel }) {
  const [formData, setFormData] = useState(task || {
    campaign_manager_id: "",
    task_name: "",
    task_description: "",
    deadline: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // Default: 3 days from now
    status: "pending"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
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
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">
            {task ? "עריכת משימה" : "יצירת משימה חדשה"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="task_name">שם המשימה *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => handleChange("task_name", e.target.value)}
                  placeholder="הזן שם המשימה"
                  required
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
                <Label htmlFor="deadline">דד ליין *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleChange("deadline", e.target.value)}
                  required
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
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="in_progress">בתהליך</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_description">תיאור המשימה</Label>
              <Textarea
                id="task_description"
                value={formData.task_description}
                onChange={(e) => handleChange("task_description", e.target.value)}
                placeholder="תאר את המשימה בפירוט..."
                className="h-24"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                <X className="w-4 h-4 mr-2" />
                ביטול
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {task ? "עדכן משימה" : "צור משימה"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
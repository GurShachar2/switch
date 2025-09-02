import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Save, X, Calendar } from "lucide-react";

export default function TaskForm({ task, clients, onSave, onCancel }) {
  const [formData, setFormData] = useState(task || {
    title: "",
    description: "",
    type: "general",
    client_id: "",
    status: "active",
    frequency: "daily",
    scheduled_date: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = { ...formData };

    // אם המשימה כללית, אל תשמור client_id
    if (formData.type === 'general') {
      delete saveData.client_id;
    }

    // אם המשימה יומית, אל תשמור scheduled_date
    if (formData.frequency === 'daily') {
      delete saveData.scheduled_date;
    }

    onSave(saveData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // אם משנים לכללית, אפס את ה-client_id
      if (field === 'type' && value === 'general') {
        updated.client_id = "";
      }

      // אם משנים ליומית, אפס את ה-scheduled_date
      if (field === 'frequency' && value === 'daily') {
        updated.scheduled_date = "";
      }

      return updated;
    });
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
            {task ? "עריכת משימה" : "הוספת משימה חדשה"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">כותרת המשימה *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="הזן כותרת המשימה"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">סוג המשימה *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג משימה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">משימה כללית</SelectItem>
                    <SelectItem value="client_specific">משימה פר לקוח</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'client_specific' && (
                <div className="space-y-2">
                  <Label htmlFor="client_id">לקוח *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => handleChange("client_id", value)}
                    required={formData.type === 'client_specific'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.company && `- ${client.company}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="frequency">תדירות *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => handleChange("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תדירות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">יומית</SelectItem>
                    <SelectItem value="one_time">חד פעמית</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'one_time' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    תאריך מתוכנן *
                  </Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange("scheduled_date", e.target.value)}
                    required={formData.frequency === 'one_time'}
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

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
                    <SelectItem value="active">פעילה</SelectItem>
                    <SelectItem value="inactive">לא פעילה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור המשימה</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="תאר את המשימה (אופציונלי)"
                className="h-24 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.type === 'general' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">משימה כללית</p>
                <p className="text-sm text-blue-700">
                  משימה זו תופיע לכל מנהלי הקמפיינים בצ'קליסט היומי שלהם
                  {formData.frequency === 'one_time' && formData.scheduled_date && 
                    ` בתאריך ${new Date(formData.scheduled_date).toLocaleDateString('he-IL')}.`}
                  {formData.frequency === 'daily' && '.'}
                </p>
              </div>
            )}

            {formData.type === 'client_specific' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800 font-medium mb-2">משימה פר לקוח</p>
                <p className="text-sm text-purple-700">
                  משימה זו תופיע רק למנהל הקמפיינים של הלקוח הנבחר
                  {formData.frequency === 'one_time' && formData.scheduled_date && 
                    ` בתאריך ${new Date(formData.scheduled_date).toLocaleDateString('he-IL')}.`}
                  {formData.frequency === 'daily' && '.'}
                </p>
              </div>
            )}

            {formData.frequency === 'one_time' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800 font-medium mb-2">משימה חד פעמית</p>
                <p className="text-sm text-orange-700">
                  משימה זו תופיע רק פעם אחת בתאריך שנבחר, ואחר כך תוסר אוטומטית מהצ'קליסט.
                </p>
              </div>
            )}

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
                {task ? "עדכן" : "שמור"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
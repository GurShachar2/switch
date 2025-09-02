import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";

export default function CampaignManagerForm({ manager, onSave, onCancel }) {
  const [formData, setFormData] = useState(manager || {
    name: "",
    email: "",
    phone: "",
    rate_single_platform: "",
    rate_dual_platform: "",
    vat_type: "exempt",
    status: "active"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      rate_single_platform: parseFloat(formData.rate_single_platform) || 0,
      rate_dual_platform: parseFloat(formData.rate_dual_platform) || 0
    });
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
            {manager ? "עריכת מנהל קמפיינים" : "הוספת מנהל קמפיינים חדש"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="הזן שם מלא"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">כתובת מייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">מספר טלפון</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="050-1234567"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_type">סוג עוסק *</Label>
                <Select
                  value={formData.vat_type}
                  onValueChange={(value) => handleChange("vat_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג עוסק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exempt">עוסק פטור</SelectItem>
                    <SelectItem value="registered">עוסק מורשה</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate_single">תעריף פלטפורמה אחת (₪) *</Label>
                <Input
                  id="rate_single"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate_single_platform}
                  onChange={(e) => handleChange("rate_single_platform", e.target.value)}
                  placeholder="0.00"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate_dual">תעריף 2 פלטפורמות (₪) *</Label>
                <Input
                  id="rate_dual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate_dual_platform}
                  onChange={(e) => handleChange("rate_dual_platform", e.target.value)}
                  placeholder="0.00"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.vat_type === 'registered' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">עוסק מורשה</p>
                <p className="text-sm text-blue-700">
                  למנהל קמפיינים זה יתווסף מע"מ בשיעור 17% לכל תשלום.
                  הוא יידרש להפיק חשבונית מס עם מע"מ.
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
                {manager ? "עדכן" : "שמור"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
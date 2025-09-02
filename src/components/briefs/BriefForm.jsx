import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Save, X, Plus, Trash2, Users } from "lucide-react";
import { format } from "date-fns";

export default function BriefForm({ brief, managers, clients, onSave, onCancel }) {
  const [formData, setFormData] = useState(brief || {
    campaign_manager_id: "",
    campaign_name: "",
    client_id: "",
    deadline: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // Default: 1 week from now
    copy_link: "",
    creatives_link: "",
    landing_page_link: "",
    campaign_type: "conversion_leads",
    conversion_definition: "",
    daily_budget: "",
    additional_instructions: "",
    status: "pending"
  });

  const [audiences, setAudiences] = useState([
    {
      audience_name: "",
      audience_settings: "",
      budget_limitations: ""
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = {
      brief: {
        ...formData,
        daily_budget: parseFloat(formData.daily_budget) || 0
      },
      audiences: audiences.filter(audience => audience.audience_name.trim() !== "")
    };

    // If not conversion_leads, don't save conversion_definition
    if (formData.campaign_type !== 'conversion_leads') {
      delete saveData.brief.conversion_definition;
    }

    onSave(saveData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAudience = () => {
    setAudiences(prev => [...prev, {
      audience_name: "",
      audience_settings: "",
      budget_limitations: ""
    }]);
  };

  const removeAudience = (index) => {
    setAudiences(prev => prev.filter((_, i) => i !== index));
  };

  const updateAudience = (index, field, value) => {
    setAudiences(prev => prev.map((audience, i) => 
      i === index ? { ...audience, [field]: value } : audience
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">
            {brief ? "עריכת בריף קמפיין" : "יצירת בריף קמפיין חדש"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="campaign_name">שם הקמפיין *</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => handleChange("campaign_name", e.target.value)}
                  placeholder="הזן שם הקמפיין"
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
                <Label htmlFor="client">לקוח *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange("client_id", value)}
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
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="copy_link">לינק לקופי</Label>
                <Input
                  id="copy_link"
                  type="url"
                  value={formData.copy_link}
                  onChange={(e) => handleChange("copy_link", e.target.value)}
                  placeholder="https://"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creatives_link">לינק לקרייאטיבים</Label>
                <Input
                  id="creatives_link"
                  type="url"
                  value={formData.creatives_link}
                  onChange={(e) => handleChange("creatives_link", e.target.value)}
                  placeholder="https://"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landing_page_link">לינק לדף נחיתה</Label>
                <Input
                  id="landing_page_link"
                  type="url"
                  value={formData.landing_page_link}
                  onChange={(e) => handleChange("landing_page_link", e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>

            {/* Campaign Type and Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="campaign_type">סוג הקמפיין *</Label>
                <Select
                  value={formData.campaign_type}
                  onValueChange={(value) => handleChange("campaign_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג קמפיין" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversion_leads">המרות לידים</SelectItem>
                    <SelectItem value="lead_form">טופס לידים</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily_budget">תקציב יומי (₪) *</Label>
                <Input
                  id="daily_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_budget}
                  onChange={(e) => handleChange("daily_budget", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Conversion Definition */}
            {formData.campaign_type === 'conversion_leads' && (
              <div className="space-y-2">
                <Label htmlFor="conversion_definition">הגדרת ההמרה *</Label>
                <Textarea
                  id="conversion_definition"
                  value={formData.conversion_definition}
                  onChange={(e) => handleChange("conversion_definition", e.target.value)}
                  placeholder="תאר את ההמרה שצריך להגדיר (לדוגמה: רכישה, הרשמה, הורדת אפליקציה וכו')"
                  required={formData.campaign_type === 'conversion_leads'}
                  className="h-20"
                />
              </div>
            )}

            {/* Audiences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  קהלים
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAudience}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף קהל
                </Button>
              </div>

              <div className="space-y-4">
                {audiences.map((audience, index) => (
                  <Card key={index} className="bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">קהל {index + 1}</h4>
                        {audiences.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAudience(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`audience_name_${index}`}>שם הקהל</Label>
                          <Input
                            id={`audience_name_${index}`}
                            value={audience.audience_name}
                            onChange={(e) => updateAudience(index, "audience_name", e.target.value)}
                            placeholder="לדוגמה: קהל בסיס"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`audience_settings_${index}`}>הגדרות הקהל</Label>
                          <Input
                            id={`audience_settings_${index}`}
                            value={audience.audience_settings}
                            onChange={(e) => updateAudience(index, "audience_settings", e.target.value)}
                            placeholder="לדוגמה: גילאי 25-45, אזור המרכז"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`budget_limitations_${index}`}>הגבלות תקציב</Label>
                          <Input
                            id={`budget_limitations_${index}`}
                            value={audience.budget_limitations}
                            onChange={(e) => updateAudience(index, "budget_limitations", e.target.value)}
                            placeholder="לדוגמה: 50% מהתקציב"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Additional Instructions */}
            <div className="space-y-2">
              <Label htmlFor="additional_instructions">הנחיות נוספות</Label>
              <Textarea
                id="additional_instructions"
                value={formData.additional_instructions}
                onChange={(e) => handleChange("additional_instructions", e.target.value)}
                placeholder="הערות, הנחיות מיוחדות או דרישות נוספות לקמפיין..."
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
                className="bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {brief ? "עדכן בריף" : "צור בריף"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
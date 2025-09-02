import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, CheckSquare, ArrowUpCircle, ArrowDownCircle, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ConfirmationDialog from "../components/ui/ConfirmationDialog";

const categoryConfig = {
  technical: { text: "טכני", color: "bg-blue-100 text-blue-800" },
  content: { text: "תוכן", color: "bg-green-100 text-green-800" },
  targeting: { text: "מיקוד", color: "bg-purple-100 text-purple-800" },
  budget: { text: "תקציב", color: "bg-orange-100 text-orange-800" },
  general: { text: "כללי", color: "bg-gray-100 text-gray-800" }
};

export default function BriefVerificationChecks() {
  const [checks, setChecks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);
  const [checkToDelete, setCheckToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    is_active: true
  });

  useEffect(() => {
    loadChecks();
  }, []);

  const loadChecks = async () => {
    try {
      const data = await base44.entities.BriefVerificationCheck.list("order_index");
      setChecks(data);
    } catch (error) {
      console.error("Error loading checks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const checkData = {
        ...formData,
        order_index: editingCheck ? editingCheck.order_index : Math.max(0, ...checks.map(c => c.order_index)) + 1
      };

      if (editingCheck) {
        await base44.entities.BriefVerificationCheck.update(editingCheck.id, checkData);
      } else {
        await base44.entities.BriefVerificationCheck.create(checkData);
      }

      setShowForm(false);
      setEditingCheck(null);
      setFormData({
        title: "",
        description: "",
        category: "general",
        is_active: true
      });
      loadChecks();
    } catch (error) {
      console.error("Error saving check:", error);
      alert("שגיאה בשמירת הבדיקה");
    }
  };

  const handleEdit = (check) => {
    setEditingCheck(check);
    setFormData({
      title: check.title,
      description: check.description || "",
      category: check.category || "general",
      is_active: check.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (checkToDelete) {
      try {
        await base44.entities.BriefVerificationCheck.delete(checkToDelete.id);
        setCheckToDelete(null);
        loadChecks();
      } catch (error) {
        console.error("Error deleting check:", error);
        alert("שגיאה במחיקת הבדיקה");
      }
    }
  };

  const moveCheck = async (checkId, direction) => {
    const currentIndex = checks.findIndex(c => c.id === checkId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= checks.length) return;

    try {
      const currentCheck = checks[currentIndex];
      const targetCheck = checks[newIndex];

      await Promise.all([
        base44.entities.BriefVerificationCheck.update(currentCheck.id, { order_index: targetCheck.order_index }),
        base44.entities.BriefVerificationCheck.update(targetCheck.id, { order_index: currentCheck.order_index })
      ]);

      loadChecks();
    } catch (error) {
      console.error("Error moving check:", error);
      alert("שגיאה בהזזת הבדיקה");
    }
  };

  const toggleActive = async (checkId, isActive) => {
    try {
      await base44.entities.BriefVerificationCheck.update(checkId, { is_active: !isActive });
      loadChecks();
    } catch (error) {
      console.error("Error toggling active status:", error);
      alert("שגיאה בעדכון סטטוס הבדיקה");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24"></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            ניהול בדיקות דאבל צ'ק
          </h1>
          <p className="text-slate-600 mt-1">רשימת הבדיקות שמנהלי קמפיינים צריכים לאשר לאחר השקת בריף</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-purple-600 hover:bg-purple-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף בדיקה חדשה
        </Button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {checks.map((check, index) => (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={`${check.is_active ? 'bg-white' : 'bg-gray-50 opacity-75'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCheck(check.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCheck(check.id, 'down')}
                          disabled={index === checks.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-3">
                          <CheckSquare className="w-5 h-5 text-purple-600" />
                          {check.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={categoryConfig[check.category]?.color || categoryConfig.general.color}>
                            {categoryConfig[check.category]?.text || categoryConfig.general.text}
                          </Badge>
                          <Badge variant={check.is_active ? "default" : "secondary"}>
                            {check.is_active ? "פעיל" : "לא פעיל"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(check.id, check.is_active)}
                        className={check.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                      >
                        {check.is_active ? "השבת" : "הפעל"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(check)}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCheckToDelete(check)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {check.description && (
                  <CardContent>
                    <p className="text-slate-600">{check.description}</p>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {checks.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין בדיקות מוגדרות</h3>
          <p className="text-slate-500 mb-6">התחל בהוספת בדיקות לדאבל צ'ק</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף בדיקה ראשונה
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => {
        setShowForm(false);
        setEditingCheck(null);
        setFormData({
          title: "",
          description: "",
          category: "general",
          is_active: true
        });
      }}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingCheck ? "עריכת בדיקה" : "הוספת בדיקה חדשה"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">כותרת הבדיקה *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="לדוגמה: בדיקת פיקסל המרות"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">קטגוריה</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">טכני</SelectItem>
                  <SelectItem value="content">תוכן</SelectItem>
                  <SelectItem value="targeting">מיקוד</SelectItem>
                  <SelectItem value="budget">תקציב</SelectItem>
                  <SelectItem value="general">כללי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור מפורט</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="הוסף הסבר מפורט על מה צריך לבדוק..."
                className="h-32"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingCheck(null);
                  setFormData({
                    title: "",
                    description: "",
                    category: "general",
                    is_active: true
                  });
                }}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.title.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {editingCheck ? "עדכן" : "הוסף"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!checkToDelete}
        onOpenChange={() => setCheckToDelete(null)}
        onConfirm={handleDelete}
        title={`מחיקת בדיקה`}
        description="האם אתה בטוח שברצונך למחוק את הבדיקה הזו? פעולה זו אינה ניתנת לשחזור."
      />
    </div>
  );
}
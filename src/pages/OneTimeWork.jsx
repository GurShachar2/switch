import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, DollarSign, FileText, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import OneTimeWorkForm from "../components/onetime/OneTimeWorkForm";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

export default function OneTimeWork() {
  const [works, setWorks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [workToDelete, setWorkToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [worksData, managersData] = await Promise.all([
        base44.entities.OneTimeWork.list("-work_date"),
        base44.entities.CampaignManager.list()
      ]);
      setWorks(worksData);
      setManagers(managersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (workData) => {
    try {
      if (editingWork) {
        await base44.entities.OneTimeWork.update(editingWork.id, workData);
      } else {
        await base44.entities.OneTimeWork.create(workData);
      }
      setShowForm(false);
      setEditingWork(null);
      loadData();
    } catch (error) {
      console.error("Error saving work:", error);
    }
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWork(null);
  };

  const handleConfirmDelete = async () => {
    if (workToDelete) {
      try {
        await base44.entities.OneTimeWork.delete(workToDelete.id);
        setWorkToDelete(null);
        loadData();
      } catch (error) {
        console.error("Error deleting work:", error);
      }
    }
  };

  const getManagerName = (managerId) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : "לא נמצא";
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: "ממתין", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      approved: { text: "אושר", color: "bg-green-100 text-green-800 border-green-200" },
      paid: { text: "שולם", color: "bg-blue-100 text-blue-800 border-blue-200" }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const updateStatus = async (workId, newStatus) => {
    try {
      await base44.entities.OneTimeWork.update(workId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">עבודות חד-פעמיות</h1>
          <p className="text-slate-600 mt-1">ניהול עבודות נוספות למנהלי קמפיינים</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף עבודה חד-פעמית
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <OneTimeWorkForm
            work={editingWork}
            managers={managers}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {works.map((work) => (
            <motion.div
              key={work.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="group"
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-slate-900 mb-2">
                        {work.description}
                      </CardTitle>
                      <div className="flex gap-2 mb-2">
                        {getStatusBadge(work.status)}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(work)}
                        title="עריכה"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setWorkToDelete(work)}
                        title="מחיקה"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4" />
                    <span>{getManagerName(work.campaign_manager_id)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>תאריך: {format(new Date(work.work_date), "d/M/yyyy", { locale: he })}</span>
                  </div>

                  {work.client_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="w-4 h-4" />
                      <span>לקוח: {work.client_name}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-xl font-bold text-green-600">
                        ₪{work.amount?.toLocaleString()}
                      </span>
                    </div>
                    
                    {work.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(work.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        אשר
                      </Button>
                    )}
                    
                    {work.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(work.id, 'paid')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        סמן כשולם
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {works.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין עבודות חד-פעמיות</h3>
          <p className="text-slate-500 mb-6">התחל בהוספת העבודה החד-פעמית הראשונה</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף עבודה חד-פעמית
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={!!workToDelete}
        onOpenChange={() => setWorkToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`מחיקת עבודה חד-פעמית`}
        description="האם אתה בטוח שברצונך למחוק את העבודה החד-פעמית? פעולה זו אינה ניתנת לשחזור."
      />
    </div>
  );
}
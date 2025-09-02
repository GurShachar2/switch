
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Users, DollarSign, Mail, Phone, Trash2, ClipboardCopy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from '@/utils';

import CampaignManagerForm from "../components/managers/CampaignManagerForm";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

export default function CampaignManagers() {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [managerToDelete, setManagerToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const data = await base44.entities.CampaignManager.list("-created_date");
      setManagers(data);
    } catch (error) {
      console.error("Error loading managers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (managerData) => {
    try {
      if (editingManager) {
        await base44.entities.CampaignManager.update(editingManager.id, managerData);
      } else {
        await base44.entities.CampaignManager.create(managerData);
      }
      setShowForm(false);
      setEditingManager(null);
      loadManagers();
    } catch (error) {
      console.error("Error saving manager:", error);
    }
  };

  const handleEdit = (manager) => {
    setEditingManager(manager);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingManager(null);
  };

  const handleConfirmDelete = async () => {
    if (managerToDelete) {
      try {
        await base44.entities.CampaignManager.delete(managerToDelete.id);
        setManagerToDelete(null);
        loadManagers();
      } catch (error) {
        console.error("Failed to delete manager:", error);
      }
    }
  };

  const copyManagerLink = (managerId) => {
    const url = `${window.location.origin}${createPageUrl(`ManagerPaymentView?id=${managerId}`)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(managerId);
    setTimeout(() => setCopiedLink(null), 2000);
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
          <h1 className="text-3xl font-bold text-slate-900">מנהלי קמפיינים</h1>
          <p className="text-slate-600 mt-1">ניהול צוות מנהלי הקמפיינים ותעריפיהם</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף מנהל קמפיינים
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <CampaignManagerForm
            manager={editingManager}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {managers.map((manager) => (
            <motion.div
              key={manager.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="group"
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-slate-900 mb-2">
                        {manager.name}
                      </CardTitle>
                      <Badge 
                        variant={manager.status === 'active' ? 'default' : 'secondary'}
                        className={manager.status === 'active' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {manager.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                       <div className="mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600"
                            onClick={() => copyManagerLink(manager.id)}
                          >
                            <ClipboardCopy className="w-3 h-3 ml-1" />
                            {copiedLink === manager.id ? 'הועתק!' : 'העתק קישור לדוח'}
                          </Button>
                        </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(manager)}
                        className="text-slate-600 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagerToDelete(manager)}
                        className="text-slate-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {manager.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{manager.email}</span>
                    </div>
                  )}
                  
                  {manager.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{manager.phone}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-slate-500">פלטפורמה אחת</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        ₪{manager.rate_single_platform?.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-slate-500">2 פלטפורמות</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        ₪{manager.rate_dual_platform?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {managers.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין מנהלי קמפיינים</h3>
          <p className="text-slate-500 mb-6">התחל בהוספת מנהל הקמפיינים הראשון</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף מנהל קמפיינים
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={!!managerToDelete}
        onOpenChange={() => setManagerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`מחיקת ${managerToDelete?.name}`}
        description="האם אתה בטוח שברצונך למחוק את מנהל הקמפיינים? לקוחות המשויכים אליו יצטרכו שיוך חדש. פעולה זו אינה ניתנת לשחזור."
      />
    </div>
  );
}

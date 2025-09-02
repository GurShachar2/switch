
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckSquare, Users, User, Repeat, Star, Calendar } from "lucide-react"; // Added Calendar import
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns"; // Added format import
import { he } from "date-fns/locale"; // Added he locale import

import TaskForm from "../components/tasks/TaskForm";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, clientsData] = await Promise.all([
        base44.entities.Task.list("-created_date"),
        base44.entities.Client.list()
      ]);
      setTasks(tasksData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (taskData) => {
    try {
      if (editingTask) {
        await base44.entities.Task.update(editingTask.id, taskData);
      } else {
        await base44.entities.Task.create(taskData);
      }
      setShowForm(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const handleConfirmDelete = async () => {
    if (taskToDelete) {
      try {
        await base44.entities.Task.delete(taskToDelete.id);
        setTaskToDelete(null);
        loadData();
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const toggleStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await base44.entities.Task.update(taskId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "לקוח לא נמצא";
  };

  const getTypeBadge = (type) => {
    return type === 'general' ? (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Users className="w-3 h-3 mr-1" />
        כללית
      </Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
        <User className="w-3 h-3 mr-1" />
        פר לקוח
      </Badge>
    );
  };
  
  const getFrequencyBadge = (frequency) => {
    return frequency === 'daily' ? (
      <Badge className="bg-sky-100 text-sky-800 border-sky-200">
        <Repeat className="w-3 h-3 mr-1" />
        יומית
      </Badge>
    ) : (
      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
        <Star className="w-3 h-3 mr-1" />
        חד פעמית
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">פעילה</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">לא פעילה</Badge>
    );
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
          <h1 className="text-3xl font-bold text-slate-900">ניהול משימות יומיות</h1>
          <p className="text-slate-600 mt-1">יצירה וניהול משימות לצ'קליסט יומי של מנהלי קמפיינים</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף משימה חדשה
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editingTask}
            clients={clients}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
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
                        {task.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {getTypeBadge(task.type)}
                        {getStatusBadge(task.status)}
                        {getFrequencyBadge(task.frequency)}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(task)}
                        title="עריכה"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(task.id, task.status)}
                        title={task.status === 'active' ? 'השבת' : 'הפעל'}
                      >
                        <CheckSquare className={`w-4 h-4 ${task.status === 'active' ? 'text-orange-600' : 'text-green-600'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTaskToDelete(task)}
                        title="מחיקה"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {task.description && (
                    <p className="text-sm text-slate-600">{task.description}</p>
                  )}
                  
                  {task.type === 'client_specific' && task.client_id && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-800">
                        לקוח: {getClientName(task.client_id)}
                      </p>
                    </div>
                  )}

                  {task.frequency === 'one_time' && task.scheduled_date && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        מתוכננת ל: {format(new Date(task.scheduled_date), "d/M/yyyy", { locale: he })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין משימות</h3>
          <p className="text-slate-500 mb-6">התחל ביצירת המשימה הראשונה לצ'קליסט היומי</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף משימה חדשה
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={!!taskToDelete}
        onOpenChange={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`מחיקת משימה`}
        description="האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו אינה ניתנת לשחזור."
      />
    </div>
  );
}

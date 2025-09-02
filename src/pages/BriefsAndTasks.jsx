
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  CheckSquare,
  Calendar,
  User,
  Building2,
  DollarSign,
  Users,
  Target,
  Link,
  Clock,
  Edit,
  Trash2,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import BriefForm from "../components/briefs/BriefForm";
import TaskForm from "../components/briefs/TaskForm";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

export default function BriefsAndTasks() {
  const [briefs, setBriefs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingBrief, setEditingBrief] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("briefs");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [briefsData, tasksData, managersData, clientsData] = await Promise.all([
        base44.entities.Brief.list("-created_date"),
        base44.entities.ProjectTask.list("-created_date"),
        base44.entities.CampaignManager.list(),
        base44.entities.Client.list()
      ]);

      setBriefs(briefsData);
      setTasks(tasksData);
      setManagers(managersData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrief = async (briefData) => {
    try {
      if (editingBrief) {
        await base44.entities.Brief.update(editingBrief.id, briefData.brief);
      } else {
        const savedBrief = await base44.entities.Brief.create(briefData.brief);

        // Create audiences
        if (briefData.audiences && briefData.audiences.length > 0) {
          await Promise.all(
            briefData.audiences.map(audience =>
              base44.entities.BriefAudience.create({
                ...audience,
                brief_id: savedBrief.id
              })
            )
          );
        }
      }

      setShowBriefForm(false);
      setEditingBrief(null);
      loadData();
    } catch (error) {
      console.error("Error saving brief:", error);
      alert("שגיאה בשמירת הבריף. נסה שנית.");
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await base44.entities.ProjectTask.update(editingTask.id, taskData);
      } else {
        await base44.entities.ProjectTask.create(taskData);
      }

      setShowTaskForm(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("שגיאה בשמירת המשימה. נסה שנית.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'brief') {
        // Delete audiences first
        const audiences = await base44.entities.BriefAudience.filter({ brief_id: itemToDelete.id });
        await Promise.all(audiences.map(audience => base44.entities.BriefAudience.delete(audience.id)));

        await base44.entities.Brief.delete(itemToDelete.id);
      } else {
        await base44.entities.ProjectTask.delete(itemToDelete.id);
      }

      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("שגיאה במחיקה. נסה שנית.");
    }
  };

  const getManagerName = (managerId) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : "לא נמצא";
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "לא נמצא";
  };

  const getStatusBadge = (status, type = "brief") => {
    const statusConfig = {
      pending: { text: "ממתין", color: "bg-yellow-100 text-yellow-800" },
      in_progress: { text: "בתהליך", color: "bg-blue-100 text-blue-800" },
      live: { text: "באוויר", color: "bg-green-100 text-green-800" },
      completed: { text: "הושלם", color: "bg-gray-100 text-gray-800" }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getCampaignTypeBadge = (type) => {
    const typeConfig = {
      conversion_leads: { text: "המרות לידים", color: "bg-purple-100 text-purple-800", icon: Target },
      lead_form: { text: "טופס לידים", color: "bg-indigo-100 text-indigo-800", icon: FileText },
      other: { text: "אחר", color: "bg-gray-100 text-gray-800", icon: CheckSquare }
    };

    const config = typeConfig[type] || typeConfig.other;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Separate completed items from active ones
  const activeBriefs = briefs.filter(b => b.status !== 'completed');
  const completedBriefs = briefs.filter(b => b.status === 'completed');
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

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
          <h1 className="text-3xl font-bold text-slate-900">בריפים ומשימות</h1>
          <p className="text-slate-600 mt-1">ניהול בריפי קמפיינים ומשימות למנהלי קמפיינים</p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowTaskForm(true)}
            className="bg-green-600 hover:bg-green-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            משימה חדשה
          </Button>
          <Button
            onClick={() => setShowBriefForm(true)}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            בריף חדש
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("briefs")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "briefs"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          בריפים ({activeBriefs.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "tasks"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckSquare className="w-4 h-4 inline mr-2" />
          משימות ({activeTasks.length})
        </button>
      </div>

      {/* Forms */}
      <AnimatePresence>
        {showBriefForm && (
          <BriefForm
            brief={editingBrief}
            managers={managers}
            clients={clients}
            onSave={handleSaveBrief}
            onCancel={() => {
              setShowBriefForm(false);
              setEditingBrief(null);
            }}
          />
        )}

        {showTaskForm && (
          <TaskForm
            task={editingTask}
            managers={managers}
            onSave={handleSaveTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      {activeTab === "briefs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {activeBriefs.map((brief) => (
                <motion.div
                  key={brief.id}
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
                            {brief.campaign_name}
                          </CardTitle>
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {getStatusBadge(brief.status)}
                            {getCampaignTypeBadge(brief.campaign_type)}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingBrief(brief);
                              setShowBriefForm(true);
                            }}
                            title="עריכה"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setItemToDelete({ ...brief, type: 'brief' })}
                            title="מחיקה"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span>{getManagerName(brief.campaign_manager_id)}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span>{getClientName(brief.client_id)}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>דד ליין: {format(new Date(brief.deadline), "d/M/yyyy", { locale: he })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>תקציב יומי: ₪{brief.daily_budget?.toLocaleString()}</span>
                        </div>
                      </div>

                      {brief.conversion_definition && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-purple-800 mb-1">הגדרת המרה:</p>
                          <p className="text-sm text-purple-700">{brief.conversion_definition}</p>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {brief.copy_link && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={brief.copy_link} target="_blank" rel="noopener noreferrer">
                              <Link className="w-3 h-3 mr-1" />
                              קופי
                            </a>
                          </Button>
                        )}
                        {brief.creatives_link && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={brief.creatives_link} target="_blank" rel="noopener noreferrer">
                              <Link className="w-3 h-3 mr-1" />
                              קרייאטיבים
                            </a>
                          </Button>
                        )}
                        {brief.landing_page_link && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={brief.landing_page_link} target="_blank" rel="noopener noreferrer">
                              <Link className="w-3 h-3 mr-1" />
                              דף נחיתה
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeBriefs.length === 0 && (
              <div className="col-span-full text-center py-16">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">אין בריפים פעילים</h3>
                <p className="text-slate-500 mb-6">התחל ביצירת הבריף הראשון</p>
                <Button
                  onClick={() => setShowBriefForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  צור בריף חדש
                </Button>
              </div>
            )}
          </div>

          {completedBriefs.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="completed-briefs">
                <AccordionTrigger className="text-lg font-semibold text-slate-700 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    היסטוריית בריפים ({completedBriefs.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {completedBriefs.map((brief) => (
                      <Card key={brief.id} className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-bold text-slate-700">
                            {brief.campaign_name}
                          </CardTitle>
                          <div className="flex gap-2">
                            {getStatusBadge(brief.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{getManagerName(brief.campaign_manager_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{getClientName(brief.client_id)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {activeTasks.map((task) => (
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
                            {task.task_name}
                          </CardTitle>
                          <div className="flex gap-2 mb-2">
                            {getStatusBadge(task.status, "task")}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTask(task);
                              setShowTaskForm(true);
                            }}
                            title="עריכה"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setItemToDelete({ ...task, type: 'task' })}
                            title="מחיקה"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span>{getManagerName(task.campaign_manager_id)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>דד ליין: {format(new Date(task.deadline), "d/M/yyyy", { locale: he })}</span>
                        </div>
                      </div>

                      {task.task_description && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-sm text-slate-700">{task.task_description}</p>
                        </div>
                      )}

                      {task.completion_notes && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-800 mb-1">הערות סיום:</p>
                          <p className="text-sm text-green-700">{task.completion_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeTasks.length === 0 && (
              <div className="col-span-full text-center py-16">
                <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">אין משימות פעילות</h3>
                <p className="text-slate-500 mb-6">התחל ביצירת המשימה הראשונה</p>
                <Button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  צור משימה חדשה
                </Button>
              </div>
            )}
          </div>

          {completedTasks.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="completed-tasks">
                <AccordionTrigger className="text-lg font-semibold text-slate-700 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    היסטוריית משימות ({completedTasks.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {completedTasks.map((task) => (
                      <Card key={task.id} className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-bold text-slate-700">
                            {task.task_name}
                          </CardTitle>
                          <div className="flex gap-2">
                            {getStatusBadge(task.status, "task")}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-600">
                           <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{getManagerName(task.campaign_manager_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>דד ליין: {format(new Date(task.deadline), "d/M/yyyy", { locale: he })}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={`מחיקת ${itemToDelete?.type === 'brief' ? 'בריף' : 'משימה'}`}
        description={`האם אתה בטוח שברצונך למחוק את ה${itemToDelete?.type === 'brief' ? 'בריף' : 'משימה'}? פעולה זו אינה ניתנת לשחזור.`}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckSquare, Square, User, Building2, Calendar, MessageSquare, TrendingUp, CheckCircle2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import ClientReportDialog from "../reports/ClientReportDialog";

// Treatment Notes Component
const TreatmentNotes = ({ clientId }) => {
  const [latestTreatmentNote, setLatestTreatmentNote] = useState(null);
  
  useEffect(() => {
    const fetchTreatmentNotes = async () => {
      try {
        const recentReports = await base44.entities.ClientDailyReport.filter({
          client_id: clientId,
          treatment_notes: { "!=": null }
        }, "-report_date", 1);
        
        if (recentReports.length > 0 && recentReports[0].treatment_notes) {
          setLatestTreatmentNote(recentReports[0]);
        }
      } catch (error) {
        console.error("Error fetching treatment notes:", error);
      }
    };
    
    fetchTreatmentNotes();
  }, [clientId]);

  if (!latestTreatmentNote) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <h4 className="font-medium text-purple-900 flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4" />
        הנחיות מההנהלה
      </h4>
      <p className="text-purple-800 whitespace-pre-wrap text-sm">{latestTreatmentNote.treatment_notes}</p>
      <p className="text-xs text-purple-600 mt-2">
        עודכן: {format(new Date(latestTreatmentNote.report_date), "d/M/yyyy", { locale: he })}
      </p>
    </div>
  );
};

export default function DailyChecklist({ manager }) {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [taskCompletions, setTaskCompletions] = useState({});
  const [clientNotes, setClientNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedClientForAnalysis, setSelectedClientForAnalysis] = useState(null);
  const [checklistClient, setChecklistClient] = useState(null);

  const loadData = useCallback(async () => {
    if (!manager?.id) return;
    
    try {
      const [tasksData, clientsData, reportsData] = await Promise.all([
        base44.entities.Task.filter({ status: 'active' }),
        base44.entities.Client.filter({ 
          campaign_manager_id: manager.id,
          status: { $in: ['active', 'paused'] }
        }),
        base44.entities.ClientDailyReport.filter({
          campaign_manager_id: manager.id,
          report_date: format(new Date(), "yyyy-MM-dd")
        })
      ]);

      setTasks(tasksData);
      setClients(clientsData);

      const today = format(new Date(), "yyyy-MM-dd");
      const todayTasks = [];
      const completions = {};
      const notes = {};

      clientsData.forEach(client => {
        const generalTasks = tasksData.filter(task => 
          task.type === 'general' && 
          (task.frequency === 'daily' || 
           (task.frequency === 'one_time' && task.scheduled_date === today))
        );
        generalTasks.forEach(task => {
          const key = `${task.id}-${client.id}`;
          todayTasks.push({ ...task, clientId: client.id, key });
        });

        const clientTasks = tasksData.filter(task => 
          task.type === 'client_specific' && 
          task.client_id === client.id &&
          (task.frequency === 'daily' || 
           (task.frequency === 'one_time' && task.scheduled_date === today))
        );
        clientTasks.forEach(task => {
          const key = `${task.id}-${client.id}`;
          todayTasks.push({ ...task, clientId: client.id, key });
        });

        const existingReport = reportsData.find(r => r.client_id === client.id);
        if (existingReport) {
          notes[client.id] = existingReport.notes || "";
        }
      });

      const completionData = await base44.entities.TaskCompletion.filter({
        campaign_manager_id: manager.id,
        completion_date: today
      });
      completionData.forEach(completion => {
        const key = `${completion.task_id}-${completion.client_id}`;
        completions[key] = completion.completed;
      });

      setDailyTasks(todayTasks);
      setTaskCompletions(completions);
      setClientNotes(notes);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [manager?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTaskToggle = async (task, completed) => {
    const key = task.key;
    const today = format(new Date(), "yyyy-MM-dd");
    
    try {
      const existingCompletion = await base44.entities.TaskCompletion.filter({
        task_id: task.id,
        campaign_manager_id: manager.id,
        client_id: task.clientId,
        completion_date: today
      });

      if (existingCompletion.length > 0) {
        await base44.entities.TaskCompletion.update(existingCompletion[0].id, { completed });
      } else {
        await base44.entities.TaskCompletion.create({
          task_id: task.id,
          campaign_manager_id: manager.id,
          client_id: task.clientId,
          completion_date: today,
          completed
        });
      }
      setTaskCompletions(prev => ({ ...prev, [key]: completed }));
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  const handleNotesChange = (clientId, notes) => {
    setClientNotes(prev => ({ ...prev, [clientId]: notes }));
  };

  const submitDailyReport = async (clientId) => {
    const clientTasks = dailyTasks.filter(task => task.clientId === clientId);
    const completedTasks = clientTasks.filter(task => taskCompletions[task.key]);
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      const existingReports = await base44.entities.ClientDailyReport.filter({
        campaign_manager_id: manager.id,
        client_id: clientId,
        report_date: today
      });

      const reportData = {
        campaign_manager_id: manager.id,
        client_id: clientId,
        report_date: today,
        notes: clientNotes[clientId] || "",
        tasks_completed: completedTasks.length,
        total_tasks: clientTasks.length,
        submitted_at: new Date().toISOString()
      };

      if (existingReports.length > 0) {
        await base44.entities.ClientDailyReport.update(existingReports[0].id, reportData);
      } else {
        await base44.entities.ClientDailyReport.create(reportData);
      }
      alert("הדוח נשלח בהצלחה!");
      setChecklistClient(null); // Close dialog on submit
      loadData();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("שגיאה בשליחת הדוח");
    }
  };

  const getCompletionRate = (clientId) => {
    const clientTasks = dailyTasks.filter(task => task.clientId === clientId);
    if (clientTasks.length === 0) return 0;
    const completedTasks = clientTasks.filter(task => taskCompletions[task.key]);
    return Math.round((completedTasks.length / clientTasks.length) * 100);
  };

  const handleAnalyzeClient = (e, client) => {
    e.stopPropagation();
    setSelectedClientForAnalysis(client);
  };
  
  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">צ'קליסט יומי</h1>
        <p className="text-slate-600">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: he })}
        </p>
        <p className="text-sm text-slate-500 mt-1">מנהל: {manager.name}</p>
      </div>

      <div className="space-y-4">
        {clients.map(client => {
          const clientTaskList = dailyTasks.filter(task => task.clientId === client.id) || [];
          const completionRate = getCompletionRate(client.id);
          const hasSubmitted = clientNotes[client.id] !== undefined;

          return (
            <Card 
              key={client.id} 
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setChecklistClient(client)}
            >
              <CardHeader className="bg-gradient-to-l from-slate-50 to-blue-50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {client.name}
                      {client.company && <span className="text-sm text-slate-600">- {client.company}</span>}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                        <CheckSquare className="w-3 h-3 mr-1" />
                        {clientTaskList.filter(task => taskCompletions[task.key]).length}/{clientTaskList.length} משימות
                      </Badge>
                      <Badge className={completionRate === 100 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                        {completionRate}% הושלם
                      </Badge>
                      {hasSubmitted && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          דוח נשלח
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAnalyzeClient(e, client)}
                      className="text-blue-600 hover:bg-blue-100"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      ניתוח דוח מתקדם
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
      
      {clients.length === 0 && (
        <div className="text-center py-16">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין לקוחות פעילים</h3>
          <p className="text-slate-500">לא נמצאו לקוחות המשויכים אליך כרגע</p>
        </div>
      )}

      {/* Checklist Dialog */}
      <Dialog open={!!checklistClient} onOpenChange={() => setChecklistClient(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>צ'קליסט יומי - {checklistClient?.name}</DialogTitle>
            <DialogDescription>
              {checklistClient?.company && <p>{checklistClient.company}</p>}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {checklistClient && (
              <>
                {(dailyTasks.filter(task => task.clientId === checklistClient.id) || []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800">משימות היום:</h4>
                    {(dailyTasks.filter(task => task.clientId === checklistClient.id) || []).map(task => {
                      const isCompleted = taskCompletions[task.key] || false;
                      return (
                        <div key={task.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={(checked) => handleTaskToggle(task, checked)}
                          />
                          <div className="flex-1">
                            <span className={`font-medium ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                            )}
                          </div>
                          {task.frequency === 'one_time' && (
                            <Badge variant="outline" className="text-xs">
                              חד פעמי
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="font-medium text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    הערות ומסקנות יום (אופציונלי)
                  </h4>
                  <Textarea
                    placeholder="האם היו בעיות? שינויים? מסקנות? כל מידע רלוונטי..."
                    value={clientNotes[checklistClient.id] || ""}
                    onChange={(e) => handleNotesChange(checklistClient.id, e.target.value)}
                    className="h-24"
                  />
                </div>

                <TreatmentNotes clientId={checklistClient.id} />

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button 
                    onClick={() => submitDailyReport(checklistClient.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    שלח דוח יומי
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Analysis Dialog */}
      {selectedClientForAnalysis && (
        <ClientReportDialog
          client={selectedClientForAnalysis}
          manager={manager}
          onClose={() => setSelectedClientForAnalysis(null)}
        />
      )}
    </div>
  );
}
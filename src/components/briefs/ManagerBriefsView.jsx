
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea"; // New import
import { Label } from "@/components/ui/label"; // New import
import { FileText, CheckSquare, Calendar, Building2, DollarSign, Target, Link as LinkIcon, History, Loader2, ShieldCheck, Square } from "lucide-react"; // Updated lucide-react imports
import { format } from "date-fns";
import { he } from "date-fns/locale";

// Global status configuration for both briefs and tasks (where applicable)
const statusConfig = {
  pending: { text: "ממתין", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { text: "בביצוע", color: "bg-blue-100 text-blue-800" },
  live: { text: "באוויר", color: "bg-green-100 text-green-800" },
  completed: { text: "הושלם", color: "bg-purple-100 text-purple-800" },
};

const getStatusBadge = (status) => {
  const config = statusConfig[status] || statusConfig.pending;
  return <Badge className={`${config.color} border-transparent`}>{config.text}</Badge>;
};

// Function to create clickable links from text
const LinkableText = ({ text }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (
    <p
      className="text-sm text-slate-600 whitespace-pre-wrap"
      dangerouslySetInnerHTML={{
        __html: text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'),
      }}
    />
  );
};

export default function ManagerBriefsView({ manager }) {
  const [briefs, setBriefs] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null); // State for the task details dialog

  const [verificationChecks, setVerificationChecks] = useState([]); // New state for verification checks
  const [verifyingBrief, setVerifyingBrief] = useState(null); // State for brief being verified
  const [checkedItems, setCheckedItems] = useState({}); // State for checked verification items
  const [verificationNotes, setVerificationNotes] = useState(""); // State for verification notes
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false); // State for submission loading

  useEffect(() => {
    if (manager?.id) {
      loadData(manager.id);
    }
  }, [manager]);

  const loadData = async (managerId) => {
    try {
      const [briefsData, tasksData, clientsData, checksData] = await Promise.all([
        base44.entities.Brief.filter({ campaign_manager_id: managerId }),
        base44.entities.ProjectTask.filter({ campaign_manager_id: managerId }),
        base44.entities.Client.list(),
        base44.entities.BriefVerificationCheck.filter({ is_active: true }, "order_index") // Fetch verification checks
      ]);

      // Sort data by created_date, newest first
      setBriefs(briefsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setProjectTasks(tasksData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setClients(clientsData.reduce((acc, client) => ({ ...acc, [client.id]: client }), {}));
      setVerificationChecks(checksData);
    } catch (error) {
      console.error("Error loading manager's data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    return clients[clientId]?.name || "לא נמצא";
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
      <Badge className={`${config.color} flex items-center`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await base44.entities.ProjectTask.update(taskId, { status: newStatus });
      loadData(manager.id); // Reload data to ensure full sync
    } catch (error) {
      console.error("Failed to update task status", error);
      alert("שגיאה בעדכון סטטוס המשימה");
    }
  };

  const handleBriefStatusChange = async (brief, newStatus) => {
    if (newStatus === 'live' && !brief.launch_verified) {
      // If brief is going live and not yet verified, open verification dialog
      setCheckedItems({}); // Reset checks
      setVerificationNotes(""); // Reset notes
      setVerifyingBrief(brief);
    } else {
      // Directly update status for other cases or if already verified
      try {
        await base44.entities.Brief.update(brief.id, { status: newStatus });
        loadData(manager.id); // Reload data
      } catch (error) {
        console.error("Failed to update brief status", error);
        alert("שגיאה בעדכון סטטוס הבריף");
      }
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verifyingBrief) return;

    const allChecked = verificationChecks.every(check => checkedItems[check.id]);
    if (!allChecked) {
      alert("יש לסמן את כל סעיפי הבדיקה לפני האישור.");
      return;
    }

    setIsSubmittingVerification(true);
    try {
      await base44.entities.Brief.update(verifyingBrief.id, {
        status: 'live',
        launch_verified: true,
        verification_notes: verificationNotes
      });
      setVerifyingBrief(null); // Close dialog
      loadData(manager.id); // Reload data to reflect changes
    } catch (error) {
      console.error("Failed to submit verification", error);
      alert("שגיאה באישור הבדיקה");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  // Filter tasks into active and completed
  const activeTasks = projectTasks.filter(task => task.status !== 'completed');
  const completedTasks = projectTasks.filter(task => task.status === 'completed');

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-slate-600">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Briefs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            בריפים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {briefs.length > 0 ? briefs.map(brief => (
              <div key={brief.id} className="p-4 border rounded-lg shadow-sm bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900">{brief.campaign_name}</h3>
                    <p className="text-sm text-slate-600">{getClientName(brief.client_id)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(brief.status)}
                      {brief.launch_verified && (
                        <Badge className="bg-teal-100 text-teal-800 border-transparent">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          דאבל צ'ק בוצע
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-[150px]">
                    <Select
                      value={brief.status}
                      onValueChange={(newStatus) => handleBriefStatusChange(brief, newStatus)}
                      disabled={brief.status === 'live' && !brief.launch_verified}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="שנה סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">ממתין</SelectItem>
                        <SelectItem value="in_progress">בביצוע</SelectItem>
                        <SelectItem value="live">באוויר</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                      </SelectContent>
                    </Select>
                    {brief.status === 'live' && !brief.launch_verified && (
                      <p className="text-xs text-orange-600 mt-1">נדרש דאבל צ'ק</p>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-4">אין בריפים.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-600" />
            משימות נוספות ({activeTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeTasks.length > 0 ? activeTasks.map(task => (
              <div key={task.id} className="p-4 border rounded-lg shadow-sm bg-white hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900">{task.task_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>דד-ליין: {format(new Date(task.deadline), 'd/M/yyyy', { locale: he })}</span>
                    </div>
                    {task.brief_id && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <FileText className="w-4 h-4" />
                        <span>בריף: {briefs.find(b => b.id === task.brief_id)?.campaign_name || "לא נמצא"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <Select
                      value={task.status}
                      onValueChange={(newStatus) => handleTaskStatusChange(task.id, newStatus)}
                    >
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="בחר סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">ממתין</SelectItem>
                        <SelectItem value="in_progress">בביצוע</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTask(task)}
                      className="w-full sm:w-auto"
                    >
                      פתח פרטים
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-4">אין משימות פעילות.</p>
            )}
          </div>

          {completedTasks.length > 0 && (
            <Accordion type="single" collapsible className="mt-6">
              <AccordionItem value="completed-tasks">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <History className="w-5 h-5"/>
                    משימות שהושלמו ({completedTasks.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-4">
                    {completedTasks.map(task => (
                       <div key={task.id} className="p-3 border rounded-lg bg-slate-50">
                         <div className="flex justify-between items-center">
                           <p className="font-medium text-slate-700">{task.task_name}</p>
                           <div className="flex items-center gap-2">
                            {getStatusBadge(task.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTask(task)}
                            >
                              צפה בפרטים
                            </Button>
                           </div>
                         </div>
                       </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedTask?.task_name}</DialogTitle>
            <DialogDescription>
              פרטי המשימה המלאים.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">סטטוס</h4>
              {getStatusBadge(selectedTask?.status)}
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">דד-ליין</h4>
              <p className="text-slate-600">{selectedTask ? format(new Date(selectedTask.deadline), 'd MMMM yyyy', { locale: he }) : ''}</p>
            </div>
            {selectedTask?.task_description && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">תיאור המשימה</h4>
                <LinkableText text={selectedTask?.task_description} />
              </div>
            )}
            {selectedTask?.completion_notes && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">הערות לסיום</h4>
                <LinkableText text={selectedTask?.completion_notes} />
              </div>
            )}
             {selectedTask?.brief_id && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">בריף קשור</h4>
                <p className="text-slate-600">{briefs.find(b => b.id === selectedTask.brief_id)?.campaign_name || "לא נמצא"}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={!!verifyingBrief} onOpenChange={() => setVerifyingBrief(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600"/>
              דאבל צ'ק לפני עלייה לאוויר
            </DialogTitle>
            <DialogDescription>
              עבור הבריף: <strong>{verifyingBrief?.campaign_name}</strong>. אנא ודא שכל הסעיפים בוצעו כראוי.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {verificationChecks.map(check => (
              <div key={check.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                <button
                  onClick={() => setCheckedItems(prev => ({...prev, [check.id]: !prev[check.id]}))}
                  className="mt-1 flex-shrink-0"
                >
                  {checkedItems[check.id] ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <div>
                  <p className="font-medium text-slate-900">{check.title}</p>
                  {check.description && <p className="text-sm text-slate-500 mt-1">{check.description}</p>}
                </div>
              </div>
            ))}
            <div className="space-y-2 pt-4">
              <Label htmlFor="verification_notes">הערות נוספות (אופציונלי)</Label>
              <Textarea
                id="verification_notes"
                placeholder="הוסף הערות במידת הצורך..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setVerifyingBrief(null)}>
              ביטול
            </Button>
            <Button
              onClick={handleVerificationSubmit}
              disabled={isSubmittingVerification || verificationChecks.some(check => !checkedItems[check.id])}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmittingVerification ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "אשר עלייה לאוויר"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

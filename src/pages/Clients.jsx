
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Users, Play, Pause, Calendar, Trash2, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays } from "date-fns"; // Added subDays
import { he } from "date-fns/locale";

import ClientForm from "../components/clients/ClientForm";
import ClientStatusDialog from "../components/clients/ClientStatusDialog";
import ManagerChangeDialog from "../components/clients/ManagerChangeDialog";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [statusDialogClient, setStatusDialogClient] = useState(null);
  const [managerChangeClient, setManagerChangeClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, managersData] = await Promise.all([
        base44.entities.Client.list("-created_date"),
        base44.entities.CampaignManager.list()
      ]);
      setClients(clientsData);
      setManagers(managersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (clientData) => {
    try {
      let savedClient;
      if (editingClient) {
        // --- START OF NEW LOGIC ---
        // Check if the number of platforms has changed
        const platformCountChanged = editingClient.platforms_count !== clientData.platforms_count;

        if (platformCountChanged) {
          const changeDate = new Date();
          
          // 1. Find and close the current active history record for the client's current manager
          // The current manager is from editingClient because that's the manager assigned BEFORE the save operation
          const activeHistory = await base44.entities.ClientManagerHistory.filter({
            client_id: editingClient.id,
            campaign_manager_id: editingClient.campaign_manager_id,
            end_date: null
          });

          if (activeHistory.length > 0) {
            await base44.entities.ClientManagerHistory.update(activeHistory[0].id, {
              end_date: format(subDays(changeDate, 1), "yyyy-MM-dd") // End one day before the change
            });
          }

          // 2. Create a new history record with the new platform count for the current manager
          // The manager ID remains the same, but the platform count changes
          await base44.entities.ClientManagerHistory.create({
            client_id: editingClient.id,
            campaign_manager_id: editingClient.campaign_manager_id, // Manager doesn't change here, only platforms
            start_date: format(changeDate, "yyyy-MM-dd"), // Start date is today
            platforms_count: clientData.platforms_count // Use the new platform count
          });
        }
        // --- END OF NEW LOGIC ---

        await base44.entities.Client.update(editingClient.id, clientData);
        savedClient = { ...editingClient, ...clientData }; // This line was missing, added for consistency but might not be strictly needed
      } else {
        savedClient = await base44.entities.Client.create(clientData);
        // Create initial history record for new client
        await base44.entities.ClientManagerHistory.create({
          client_id: savedClient.id,
          campaign_manager_id: clientData.campaign_manager_id,
          start_date: clientData.join_date,
          platforms_count: clientData.platforms_count
        });
      }
      setShowForm(false);
      setEditingClient(null);
      loadData();
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleStatusChange = (client) => {
    setStatusDialogClient(client);
  };

  const handleStatusUpdate = async (updates) => {
    try {
      await base44.entities.Client.update(statusDialogClient.id, updates);
      setStatusDialogClient(null);
      loadData();
    } catch (error) {
      console.error("Error updating client status:", error);
    }
  };

  const handleManagerChange = async ({ newManagerId, changeDate, oldManagerId }) => {
    try {
      // Update client's current manager
      await base44.entities.Client.update(managerChangeClient.id, {
        campaign_manager_id: newManagerId
      });

      // Close old manager's history record
      const existingHistory = await base44.entities.ClientManagerHistory.filter({
        client_id: managerChangeClient.id,
        campaign_manager_id: oldManagerId,
        end_date: null
      });

      if (existingHistory.length > 0) {
        await base44.entities.ClientManagerHistory.update(existingHistory[0].id, {
          end_date: changeDate // This date is provided by the dialog, usually today
        });
      }

      // Create new manager's history record
      await base44.entities.ClientManagerHistory.create({
        client_id: managerChangeClient.id,
        campaign_manager_id: newManagerId,
        start_date: changeDate,
        platforms_count: managerChangeClient.platforms_count
      });

      setManagerChangeClient(null);
      loadData();
    } catch (error) {
      console.error("Error changing manager:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      try {
        // Delete client and related history
        await Promise.all([
          base44.entities.Client.delete(clientToDelete.id),
          // Delete history records
          base44.entities.ClientManagerHistory.filter({ client_id: clientToDelete.id })
            .then(history => Promise.all(history.map(h => base44.entities.ClientManagerHistory.delete(h.id))))
        ]);
        setClientToDelete(null);
        loadData();
      } catch (error) {
        console.error("Error deleting client:", error);
      }
    }
  };

  const getManagerName = (managerId) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : "לא נמצא";
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: "פעיל", color: "bg-green-100 text-green-800 border-green-200" },
      paused: { text: "בהקפאה", color: "bg-orange-100 text-orange-800 border-orange-200" },
      left: { text: "עזב", color: "bg-red-100 text-red-800 border-red-200" }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.color}>{config.text}</Badge>;
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
          <h1 className="text-3xl font-bold text-slate-900">לקוחות</h1>
          <p className="text-slate-600 mt-1">ניהול לקוחות, ריטיינר והקפאות</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף לקוח
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <ClientForm
            client={editingClient}
            managers={managers}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {clients.map((client) => (
            <motion.div
              key={client.id}
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
                        {client.name}
                      </CardTitle>
                      {client.company && (
                        <p className="text-sm text-slate-600 mb-2">{client.company}</p>
                      )}
                      <div className="flex gap-2">
                        {getStatusBadge(client.status)}
                        <Badge variant="outline" className="text-xs">
                          {client.platforms_count === 1 ? "פלטפורמה אחת" : "2 פלטפורמות"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        title="עריכה"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagerChangeClient(client)}
                        title="החלף מנהל קמפיינים"
                      >
                        <UserCheck className="w-4 h-4 text-blue-600" />
                      </Button>
                      {client.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(client)}
                          title="החזר לפעילות"
                        >
                          <Play className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {client.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(client)}
                          title="הקפאה"
                        >
                          <Pause className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setClientToDelete(client)}
                        title="מחיקה"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-600">
                    <strong>מנהל קמפיינים:</strong> {getManagerName(client.campaign_manager_id)}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">ריטיינר חודשי:</span>
                    <span className="font-bold text-slate-900">
                      ₪{client.monthly_retainer?.toLocaleString()}
                    </span>
                  </div>

                  {client.join_date && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>הצטרף: {format(new Date(client.join_date), "d/M/yyyy", { locale: he })}</span>
                    </div>
                  )}

                  {client.status === 'paused' && client.saved_days > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-orange-800">
                        ימים שמורים: {client.saved_days}
                      </p>
                    </div>
                  )}

                  {client.next_billing_date && client.status === 'active' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800">
                        חשבונית הבאה: {format(new Date(client.next_billing_date), "d/M/yyyy", { locale: he })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {clients.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין לקוחות</h3>
          <p className="text-slate-500 mb-6">התחל בהוספת הלקוח הראשון</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף לקוח
          </Button>
        </div>
      )}

      <ClientStatusDialog
        client={statusDialogClient}
        onUpdate={handleStatusUpdate}
        onClose={() => setStatusDialogClient(null)}
      />

      <ManagerChangeDialog
        client={managerChangeClient}
        managers={managers}
        onUpdate={handleManagerChange}
        onClose={() => setManagerChangeClient(null)}
      />

      <ConfirmationDialog
        open={!!clientToDelete}
        onOpenChange={() => setClientToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`מחיקת ${clientToDelete?.name}`}
        description="האם אתה בטוח שברצונך למחוק את הלקוח? כל הנתונים שלו יימחקו לצמיתות. פעולה זו אינה ניתנת לשחזור."
      />
    </div>
  );
}

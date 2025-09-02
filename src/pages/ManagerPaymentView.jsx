
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  Download, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  FileText,
  User,
  Building2,
  Target,
  AlertCircle,
  Eye,
  CheckSquare,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import DailyChecklist from "../components/tasks/DailyChecklist";
import ManagerBriefsView from "../components/briefs/ManagerBriefsView";
import WeeklyReportWindow from "../components/reports/WeeklyReportWindow";

export default function ManagerPaymentView() {
  const [manager, setManager] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState("checklist");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const managerId = urlParams.get('id');
    
    if (managerId) {
      loadManagerData(managerId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadManagerData = async (managerId) => {
    try {
      const [managerData, paymentsData] = await Promise.all([
        base44.entities.CampaignManager.filter({ id: managerId }),
        base44.entities.Payment.filter({ campaign_manager_id: managerId }, "-payment_date")
      ]);

      if (managerData.length > 0) {
        setManager(managerData[0]);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error("Error loading manager data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (paymentId, file) => {
    setUploadingReceipt(paymentId);
    
    try {
      const { file_url } = await UploadFile({ file });
      
      await base44.entities.Payment.update(paymentId, {
        receipt_url: file_url,
        receipt_uploaded_date: format(new Date(), "yyyy-MM-dd"),
        status: 'completed'
      });

      loadManagerData(manager.id);
      alert("הקבלה הועלתה בהצלחה!");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      alert("שגיאה בהעלאת הקבלה. נסה שנית.");
    } finally {
      setUploadingReceipt(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      paid: { text: "שולם - יש להעלות קבלה", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
      completed: { text: "הושלם", color: "bg-green-100 text-green-800", icon: CheckCircle }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">מנהל קמפיינים לא נמצא</h1>
          <p className="text-slate-600">הקישור אינו תקין או שהמנהל לא קיים במערכת</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                שלום {manager.name}
              </h1>
              <p className="text-slate-600 mt-1">עמוד אישי למעקב תשלומים ומשימות</p>
              {manager.email && (
                <p className="text-sm text-slate-500 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {manager.email}
                  </span>
                </p>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-slate-600">Switch Marketing</div>
              <div className="text-xs text-slate-500">מערכת ניהול תשלומים</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 rtl:space-x-reverse">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "checklist"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <CheckSquare className="w-4 h-4 inline ml-2" />
              צ'קליסט יומי
            </button>
            <button
              onClick={() => setActiveTab("briefs")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "briefs"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Target className="w-4 h-4 inline ml-2" />
              בריפים ומשימות
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "reports"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <FileText className="w-4 h-4 inline ml-2" />
              דוחות שבועיים
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "payments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <DollarSign className="w-4 h-4 inline ml-2" />
              תשלומים ({payments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "checklist" && <DailyChecklist manager={manager} />}
        
        {activeTab === "briefs" && <ManagerBriefsView manager={manager} />}

        {activeTab === "reports" && <WeeklyReportWindow manager={manager} />}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">היסטוריית תשלומים</h2>
              <p className="text-slate-600">מעקב אחר כל התשלומים שבוצעו עבורך</p>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">אין תשלומים</h3>
                <p className="text-slate-500">טרם בוצעו תשלומים עבורך</p>
              </div>
            ) : (
              <div className="space-y-6">
                {payments.map(payment => (
                  <Card key={payment.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-l from-slate-50 to-green-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-600" />
                            {format(new Date(payment.payment_month + "-01"), "MMMM yyyy", { locale: he })}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2">
                            {getStatusBadge(payment.status)}
                            <span className="text-sm text-slate-600">
                              תאריך תשלום: {format(new Date(payment.payment_date), "d/M/yyyy", { locale: he })}
                            </span>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-green-600">
                            ₪{payment.total_amount?.toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-600">
                            בסיס: ₪{payment.base_amount?.toLocaleString()}
                            {payment.vat_amount > 0 && ` + מע"מ: ₪${payment.vat_amount?.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 pt-6">
                      {/* Payment Details */}
                      {payment.details && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            פירוט התשלום
                          </h4>
                          <div className="space-y-2">
                            {JSON.parse(payment.details).clients?.map((client, index) => (
                              <div key={index} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                                <div>
                                  <span className="font-medium">{client.name}</span>
                                  {client.company && <span className="text-slate-500"> - {client.company}</span>}
                                  <div className="text-xs text-slate-500">
                                    {client.platforms} פלטפורמה{client.platforms > 1 ? 'ות' : ''} • {client.workingDays} ימי עבודה
                                  </div>
                                </div>
                                <span className="font-bold text-green-600">
                                  ₪{client.payment?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {JSON.parse(payment.details).oneTimeWorks?.map((work, index) => (
                              <div key={`work-${index}`} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 bg-purple-50 px-2 py-1 rounded">
                                <div>
                                  <span className="font-medium text-purple-800">עבודה חד-פעמית</span>
                                  <div className="text-xs text-purple-600">{work.description}</div>
                                </div>
                                <span className="font-bold text-purple-600">
                                  ₪{work.amount?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Receipt Upload/View */}
                      {payment.status === 'paid' && !payment.receipt_url && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            העלאת חשבונית/קבלה
                          </h4>
                          <p className="text-blue-800 mb-4 text-sm">
                            על מנת להשלים את התהליך, יש להעלות חשבונית או קבלה עבור התשלום.
                          </p>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleReceiptUpload(payment.id, file);
                              }
                            }}
                            disabled={uploadingReceipt === payment.id}
                            className="mb-2"
                          />
                          {uploadingReceipt === payment.id && (
                            <p className="text-blue-600 text-sm flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              מעלה קובץ...
                            </p>
                          )}
                        </div>
                      )}

                      {payment.receipt_url && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            קבלה הועלתה בהצלחה
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="text-green-800 text-sm">
                              הועלתה בתאריך: {format(new Date(payment.receipt_uploaded_date), "d/M/yyyy", { locale: he })}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(payment.receipt_url, '_blank')}
                                className="text-green-600 hover:bg-green-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                צפה בקבלה
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = payment.receipt_url;
                                  link.download = `receipt-${payment.payment_month}.pdf`;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-blue-600 hover:bg-blue-100"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                הורד
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

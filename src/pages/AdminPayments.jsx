
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  Send, 
  CheckCircle, 
  Clock, 
  Calculator,
  XCircle,
  Download,
  Eye
} from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInDays, min, max, subDays } from "date-fns";
import { he } from "date-fns/locale";
import { createPageUrl } from '@/utils';

export default function AdminPayments() {
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [oneTimeWorks, setOneTimeWorks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (managers.length > 0) {
      calculatePayments();
    }
  }, [selectedMonth, managers, clients, history, oneTimeWorks, payments]);

  const loadData = async () => {
    try {
      const [managersData, clientsData, historyData, oneTimeData, paymentsData] = await Promise.all([
        base44.entities.CampaignManager.list(),
        base44.entities.Client.list(),
        base44.entities.ClientManagerHistory.list(),
        base44.entities.OneTimeWork.list(),
        base44.entities.Payment.list()
      ]);
      
      setManagers(managersData);
      setClients(clientsData);
      setHistory(historyData);
      setOneTimeWorks(oneTimeData);
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePayments = () => {
    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = monthEnd.getDate();
    
    const results = managers.map(manager => {
      let baseAmount = 0;
      const clientDetails = [];

      // Calculate regular client payments
      const managerHistory = history.filter(h => h.campaign_manager_id === manager.id);
      
      managerHistory.forEach(historyRecord => {
        const client = clients.find(c => c.id === historyRecord.client_id);
        if (!client) return;

        const historyStart = new Date(historyRecord.start_date);
        const historyEnd = historyRecord.end_date ? new Date(historyRecord.end_date) : new Date();
        
        let overlapStart = max([historyStart, monthStart]);
        let overlapEnd = min([historyEnd, monthEnd]);
        
        // Handle pause and resume logic - same as PaymentCalculator
        if (client.pause_date) {
          const pauseDate = new Date(client.pause_date);
          
          if (client.status === 'paused') {
            if (pauseDate <= overlapStart) {
              return;
            }
            const lastWorkDay = subDays(pauseDate, 1);
            overlapEnd = min([overlapEnd, lastWorkDay]);
          } else if (client.status === 'active' && client.resume_date) {
            const resumeDate = new Date(client.resume_date);
            
            if (pauseDate <= overlapStart && resumeDate > overlapEnd) {
              return;
            }
            
            if (pauseDate <= overlapStart && resumeDate <= overlapEnd) {
              overlapStart = max([resumeDate, overlapStart]);
            }
            
            if (pauseDate >= overlapStart && pauseDate <= overlapEnd && resumeDate > overlapEnd) {
              const lastWorkDay = subDays(pauseDate, 1);
              overlapEnd = min([overlapEnd, lastWorkDay]);
            }
            
            if (pauseDate >= overlapStart && resumeDate <= overlapEnd) {
              // Handle split period like in PaymentCalculator
              const beforePauseEnd = subDays(pauseDate, 1);
              if (overlapStart <= beforePauseEnd) {
                const workingDaysBefore = differenceInDays(beforePauseEnd, overlapStart) + 1;
                if (workingDaysBefore > 0) {
                  const rate = historyRecord.platforms_count === 2 ? 
                    manager.rate_dual_platform : 
                    manager.rate_single_platform;
                  
                  const dailyRate = rate / daysInMonth;
                  const periodPayment = dailyRate * workingDaysBefore;
                  baseAmount += periodPayment;
                  
                  const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
                  if (existingClientIndex >= 0) {
                    clientDetails[existingClientIndex].workingDays += workingDaysBefore;
                    clientDetails[existingClientIndex].payment += periodPayment;
                  } else {
                    clientDetails.push({
                      clientId: client.id,
                      name: client.name,
                      company: client.company,
                      platforms: historyRecord.platforms_count,
                      rate: rate,
                      workingDays: workingDaysBefore,
                      payment: periodPayment,
                      status: client.status
                    });
                  }
                }
              }
              
              if (resumeDate <= overlapEnd) {
                const workingDaysAfter = differenceInDays(overlapEnd, resumeDate) + 1;
                if (workingDaysAfter > 0) {
                  const rate = historyRecord.platforms_count === 2 ? 
                    manager.rate_dual_platform : 
                    manager.rate_single_platform;
                  
                  const dailyRate = rate / daysInMonth;
                  const periodPayment = dailyRate * workingDaysAfter;
                  baseAmount += periodPayment;
                  
                  const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
                  if (existingClientIndex >= 0) {
                    clientDetails[existingClientIndex].workingDays += workingDaysAfter;
                    clientDetails[existingClientIndex].payment += periodPayment;
                  } else {
                    clientDetails.push({
                      clientId: client.id,
                      name: client.name,
                      company: client.company,
                      platforms: historyRecord.platforms_count,
                      rate: rate,
                      workingDays: workingDaysAfter,
                      payment: periodPayment,
                      status: client.status
                    });
                  }
                }
              }
              return;
            }
          }
        }

        if (overlapStart <= overlapEnd) {
          const workingDays = differenceInDays(overlapEnd, overlapStart) + 1;
          
          if (workingDays <= 0) { // Ensure working days are positive
            return;
          }
          
          if (client.status === 'left' && client.pause_date && new Date(client.pause_date) < overlapStart) {
            return;
          }
          
          const rate = historyRecord.platforms_count === 2 ? 
            manager.rate_dual_platform : 
            manager.rate_single_platform;
          
          const dailyRate = rate / daysInMonth;
          const periodPayment = dailyRate * workingDays;
          
          baseAmount += periodPayment;
          
          const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
          
          if (existingClientIndex >= 0) {
            clientDetails[existingClientIndex].workingDays += workingDays;
            clientDetails[existingClientIndex].payment += periodPayment;
          } else {
            clientDetails.push({
              clientId: client.id,
              name: client.name,
              company: client.company,
              platforms: historyRecord.platforms_count,
              rate: rate,
              workingDays: workingDays,
              payment: periodPayment,
              status: client.status
            });
          }
        }
      });

      // Add one-time works
      const managerOneTimeWorks = oneTimeWorks.filter(work => {
        if (work.campaign_manager_id !== manager.id) return false;
        const workDate = new Date(work.work_date);
        return workDate >= monthStart && workDate <= monthEnd && 
               (work.status === 'approved' || work.status === 'paid' || work.status === 'completed');
      });

      const oneTimeTotal = managerOneTimeWorks.reduce((sum, work) => sum + (work.amount || 0), 0);
      baseAmount += oneTimeTotal;

      // Calculate VAT and total
      const vatAmount = manager.vat_type === 'registered' ? baseAmount * 0.17 : 0;
      const totalAmount = baseAmount + vatAmount;

      // Find existing payment record for this month
      const existingPayment = payments.find(p => 
        p.campaign_manager_id === manager.id && 
        p.payment_month === selectedMonth
      );

      return {
        manager,
        baseAmount,
        vatAmount,
        totalAmount,
        clientDetails: clientDetails.filter(cd => cd.workingDays > 0),
        oneTimeWorks: managerOneTimeWorks,
        existingPayment,
        hasWork: clientDetails.length > 0 || managerOneTimeWorks.length > 0
      };
    });

    setCalculations(results.filter(r => r.hasWork));
  };

  const handleCreatePayment = async (managerCalc) => {
    setProcessingPayment(managerCalc.manager.id);
    try {
      // 1. Prepare data for internal record
      const paymentData = {
        campaign_manager_id: managerCalc.manager.id,
        payment_month: selectedMonth,
        base_amount: managerCalc.baseAmount,
        vat_amount: managerCalc.vatAmount,
        total_amount: managerCalc.totalAmount,
        status: 'paid',
        payment_date: format(new Date(), "yyyy-MM-dd"),
        details: JSON.stringify({
          clients: managerCalc.clientDetails,
          oneTimeWorks: managerCalc.oneTimeWorks
        })
      };

      // 2. Save payment record internally
      if (managerCalc.existingPayment) {
        await base44.entities.Payment.update(managerCalc.existingPayment.id, paymentData);
      } else {
        await base44.entities.Payment.create(paymentData);
      }

      // 3. Send email notification to campaign manager
      await sendPaymentNotificationEmail(managerCalc.manager, paymentData);
      
      // 4. Refresh data
      loadData();
    } catch (error) {
      console.error("Error creating payment:", error);
      alert("שגיאה ביצירת התשלום. נסה שנית.");
    } finally {
      setProcessingPayment(null);
    }
  };

  const sendPaymentNotificationEmail = async (manager, paymentData) => {
    try {
      const managerPageUrl = `${window.location.origin}${createPageUrl(`ManagerPaymentView?id=${manager.id}`)}`;
      const monthName = format(new Date(selectedMonth + '-02'), 'MMMM yyyy', { locale: he });
      
      const emailHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>התראה על תשלום חדש</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
              direction: rtl;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .header p {
              margin: 8px 0 0;
              font-size: 16px;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #2d3748;
            }
            .payment-info {
              background: #f7fafc;
              border-right: 4px solid #4299e1;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
            }
            .payment-info h3 {
              margin: 0 0 15px;
              color: #2d3748;
              font-size: 18px;
            }
            .amount {
              font-size: 32px;
              font-weight: bold;
              color: #38a169;
              margin: 10px 0;
            }
            .details {
              font-size: 14px;
              color: #718096;
              margin-top: 8px;
            }
            .action-button {
              display: inline-block;
              background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              margin: 25px 0;
              text-align: center;
              transition: transform 0.2s;
            }
            .action-button:hover {
              transform: translateY(-2px);
            }
            .instructions {
              background: #fff5f5;
              border: 1px solid #feb2b2;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .instructions h4 {
              color: #c53030;
              margin: 0 0 10px;
              font-size: 16px;
            }
            .footer {
              background: #edf2f7;
              padding: 20px 30px;
              text-align: center;
              font-size: 14px;
              color: #718096;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin: 0 auto 15px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">₪</div>
              <h1>התראה על תשלום חדש</h1>
              <p>Switch Marketing - מערכת ניהול תשלומים</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                שלום ${manager.name},
              </div>
              
              <p>אנו שמחים להודיע לך שהתשלום עבור חודש <strong>${monthName}</strong> עובד ומועבר אליך.</p>
              
              <div class="payment-info">
                <h3>פרטי התשלום</h3>
                <div class="amount">₪${paymentData.total_amount.toFixed(2)}</div>
                <div class="details">
                  סכום בסיס: ₪${paymentData.base_amount.toFixed(2)}
                  ${paymentData.vat_amount > 0 ? `<br>מע"מ (17%): ₪${paymentData.vat_amount.toFixed(2)}` : ''}
                  <br>תאריך תשלום: ${format(new Date(paymentData.payment_date), 'd/M/yyyy', { locale: he })}
                </div>
              </div>
              
              <div class="instructions">
                <h4>פעולה נדרשת מצידך:</h4>
                <p>על מנת להשלים את התהליך, נדרש להעלות חשבונית או קבלה עבור התשלום דרך המערכת.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${managerPageUrl}" class="action-button">
                  כניסה לעמוד האישי והעלאת חשבונית
                </a>
              </div>
              
              <p>באמצעות העמוד האישי תוכל:</p>
              <ul>
                <li>לצפות בפירוט מלא של התשלום</li>
                <li>לראות את ימי העבודה לכל לקוח</li>
                <li>להעלות חשבונית או קבלה</li>
                <li>לעקוב אחר סטטוס התשלומים</li>
              </ul>
              
              <p style="margin-top: 30px; color: #718096; font-size: 14px;">
                אם יש לך שאלות או בעיות טכניות, אנא פנה אלינו.
              </p>
            </div>
            
            <div class="footer">
              <p>Switch Marketing<br>
              מערכת ניהול תשלומים מתקדמת</p>
              <p style="margin-top: 10px;">
                <small>מייל זה נשלח אוטומטיות מהמערכת</small>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await base44.integrations.Core.SendEmail({
        to: manager.email,
        subject: `תשלום חדש זמין - ${monthName} | Switch Marketing`,
        body: emailHtml,
        from_name: "Switch Marketing"
      });

      console.log(`Email sent successfully to ${manager.email}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Don't throw error to avoid breaking the payment flow
    }
  };

  const handleCancelPayment = async (paymentId) => {
    try {
        await base44.entities.Payment.update(paymentId, { status: 'pending' });
        loadData(); // Refresh data to show updated status
    } catch (error) {
        console.error("Error cancelling payment:", error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      paid: { text: "שולם, ממתין לקבלה", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      completed: { text: "הושלם (קבלה הועלתה)", color: "bg-green-100 text-green-800", icon: CheckCircle }
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

  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: he })
      });
    }
    
    return months;
  };

  if (loading) {
    return <div className="p-8"><p>טוען נתונים...</p></div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-green-600" />
            ניהול תשלומים
          </h1>
          <p className="text-slate-600 mt-1">יצירת תשלומים והפקת דוחות למנהלי קמפיינים</p>
        </div>
        
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="בחר חודש" />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      <div className="space-y-6">
        {calculations.map(calc => (
          <Card key={calc.manager.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-l from-slate-50 to-green-50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-4">
                    {calc.manager.name}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">
                      {calc.manager.vat_type === 'exempt' ? 'עוסק פטור' : 'עוסק מורשה'}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {calc.manager.email}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-600 mb-1">
                    בסיס: ₪{calc.baseAmount.toFixed(2)}
                    {calc.vatAmount > 0 && ` + מע"מ: ₪${calc.vatAmount.toFixed(2)}`}
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{calc.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4">
              {/* Payment Status and Actions */}
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  {calc.existingPayment ? getStatusBadge(calc.existingPayment.status) : getStatusBadge('pending')}
                  
                  {/* הוספת כפתורי צפייה והורדה לקבלה */}
                  {calc.existingPayment && calc.existingPayment.receipt_url && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(calc.existingPayment.receipt_url, '_blank')}
                        className="text-blue-600 hover:bg-blue-100"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        צפה בקבלה
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // יצירת קישור הורדה
                          const link = document.createElement('a');
                          link.href = calc.existingPayment.receipt_url;
                          link.download = `receipt-${calc.manager.name}-${selectedMonth}.pdf`;
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-green-600 hover:bg-green-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        הורד קבלה
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {/* Show "Cancel Payment" button if payment exists and is 'paid' */}
                  {calc.existingPayment && calc.existingPayment.status === 'paid' ? (
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelPayment(calc.existingPayment.id)}
                      >
                          <XCircle className="w-4 h-4 ml-2" />
                          בטל תשלום
                      </Button>
                  ) : 
                  // Show "Mark as Paid" button if no payment exists or if status is 'pending'
                  (!calc.existingPayment || calc.existingPayment.status === 'pending') ? (
                    <Button
                      onClick={() => handleCreatePayment(calc)}
                      disabled={processingPayment === calc.manager.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingPayment === calc.manager.id ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          מעבד...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          סמן כשולם
                        </>
                      )}
                    </Button>
                  ) : null /* Do not render button if status is 'completed' or other final state */}
                </div>
              </div>

              {/* הוספת פירוט נוסף על הקבלה אם הועלתה */}
              {calc.existingPayment && calc.existingPayment.receipt_uploaded_date && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>קבלה הועלתה:</strong> {format(new Date(calc.existingPayment.receipt_uploaded_date), "d/M/yyyy", { locale: he })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {calculations.length === 0 && (
        <div className="text-center py-16">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">אין תשלומים לחודש זה</h3>
          <p className="text-slate-500">לא נמצאו מנהלי קמפיינים עם עבודה בחודש הנבחר</p>
        </div>
      )}
    </div>
  );
}

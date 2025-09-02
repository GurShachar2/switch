
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, Download, DollarSign, Calendar, Users, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, min, max, subDays } from "date-fns";
import { he } from "date-fns/locale";

export default function PaymentCalculator() {
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [oneTimeWorks, setOneTimeWorks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const calculatePayments = useCallback(() => {
    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = monthEnd.getDate();
    const today = new Date();
    const isCurrentMonth = format(monthStart, "yyyy-MM") === format(today, "yyyy-MM");
    const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth; // If not current month, consider all days "passed"

    const results = managers.map(manager => {
      let totalPayment = 0;
      let projectedTotalPayment = 0; // הוספה של תשלום צפוי
      const clientDetails = [];

      // Find all clients this manager worked with during the month
      const managerHistory = history.filter(h => h.campaign_manager_id === manager.id);
      
      managerHistory.forEach(historyRecord => {
        const client = clients.find(c => c.id === historyRecord.client_id);
        if (!client) return;

        const historyStart = historyRecord.start_date; // Already a Date object
        const historyEnd = historyRecord.end_date ? historyRecord.end_date : new Date(); // Already a Date object or null

        // Initial overlap period with the selected month
        let overlapStart = max([historyStart, monthStart]);
        let overlapEnd = min([historyEnd, monthEnd]);
        
        // Handle pause and resume logic
        if (client.pause_date) {
          const pauseDate = client.pause_date; // Already a Date object
          
          if (client.status === 'paused') {
            // Client is currently paused - work only until pause date
            if (pauseDate <= overlapStart) {
              return; // Was paused before or at the start of the overlap period, skip
            }
            const lastWorkDay = subDays(pauseDate, 1);
            overlapEnd = min([overlapEnd, lastWorkDay]); // Cap work at day before pause
          } else if (client.status === 'active' && client.resume_date) {
            // Client was paused and resumed - handle the gap
            const resumeDate = client.resume_date; // Already a Date object
            
            // If the entire period [overlapStart, overlapEnd] is during the pause [pauseDate, resumeDate), skip
            // Example: pause 5th, resume 15th. Overlap 8th-10th (falls entirely within pause).
            if (overlapStart >= pauseDate && overlapEnd < resumeDate) {
              return;
            }
            
            // If period includes both pause and resume, we need to split the calculation
            // Example: Overlap 1st-20th. Pause 5th, Resume 15th.
            // Split into 1st-4th and 15th-20th.
            if (overlapStart < pauseDate && overlapEnd >= resumeDate) {
              // Calculate two periods: before pause and after resume
              
              // Period 1: Before pause (from overlapStart to day before pause)
              const beforePauseEnd = subDays(pauseDate, 1);
              if (overlapStart <= beforePauseEnd) { // Ensure there are actual days before pause
                const workingDaysBefore = differenceInDays(beforePauseEnd, overlapStart) + 1;
                if (workingDaysBefore > 0) {
                  const rate = historyRecord.platforms_count === 2 ? 
                    manager.rate_dual_platform : 
                    manager.rate_single_platform;
                  
                  const dailyRate = rate / daysInMonth;
                  const periodPayment = dailyRate * workingDaysBefore;
                  totalPayment += periodPayment;
                  
                  // Add to client details
                  const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
                  if (existingClientIndex >= 0) {
                    clientDetails[existingClientIndex].workingDays += workingDaysBefore;
                    clientDetails[existingClientIndex].payment += periodPayment;
                    clientDetails[existingClientIndex].periods.push({
                      start: format(overlapStart, "d/M"),
                      end: format(beforePauseEnd, "d/M"),
                      days: workingDaysBefore,
                      payment: periodPayment
                    });
                  } else {
                    clientDetails.push({
                      clientId: client.id,
                      name: client.name,
                      company: client.company,
                      platforms: historyRecord.platforms_count,
                      rate: rate,
                      workingDays: workingDaysBefore,
                      payment: periodPayment,
                      status: client.status,
                      periods: [{
                        start: format(overlapStart, "d/M"),
                        end: format(beforePauseEnd, "d/M"),
                        days: workingDaysBefore,
                        payment: periodPayment
                      }]
                    });
                  }
                }
              }
              
              // Period 2: After resume (from resumeDate to overlapEnd)
              if (resumeDate <= overlapEnd) { // Ensure there are actual days after resume
                const workingDaysAfter = differenceInDays(overlapEnd, resumeDate) + 1;
                if (workingDaysAfter > 0) {
                  const rate = historyRecord.platforms_count === 2 ? 
                    manager.rate_dual_platform : 
                    manager.rate_single_platform;
                  
                  const dailyRate = rate / daysInMonth;
                  const periodPayment = dailyRate * workingDaysAfter;
                  totalPayment += periodPayment;
                  
                  // Add to existing client details
                  const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
                  if (existingClientIndex >= 0) {
                    clientDetails[existingClientIndex].workingDays += workingDaysAfter;
                    clientDetails[existingClientIndex].payment += periodPayment;
                    clientDetails[existingClientIndex].periods.push({
                      start: format(resumeDate, "d/M"),
                      end: format(overlapEnd, "d/M"),
                      days: workingDaysAfter,
                      payment: periodPayment
                    });
                  } else {
                    clientDetails.push({
                      clientId: client.id,
                      name: client.name,
                      company: client.company,
                      platforms: historyRecord.platforms_count,
                      rate: rate,
                      workingDays: workingDaysAfter,
                      payment: periodPayment,
                      status: client.status,
                      periods: [{
                        start: format(resumeDate, "d/M"),
                        end: format(overlapEnd, "d/M"),
                        days: workingDaysAfter,
                        payment: periodPayment
                      }]
                    });
                  }
                }
              }
              return; // Skip the normal calculation below as it's handled by split logic
            }
            
            // If period started during pause, but resumed within/before end of period, adjust start
            // Example: pause 5th, resume 15th. Overlap 8th-20th -> becomes 15th-20th.
            if (overlapStart < resumeDate && overlapEnd >= resumeDate && overlapStart >= pauseDate) {
              overlapStart = max([resumeDate, overlapStart]);
            }
            
            // If period started before pause, but ends during pause, adjust end
            // Example: pause 5th, resume 15th. Overlap 1st-10th -> becomes 1st-4th.
            if (overlapStart < pauseDate && overlapEnd >= pauseDate && overlapEnd < resumeDate) {
              const lastWorkDay = subDays(pauseDate, 1);
              overlapEnd = min([overlapEnd, lastWorkDay]);
            }
          }
        }
        
        // If after all adjustments, there's a valid overlap period
        if (overlapStart <= overlapEnd) {
          // Calculate working days in the adjusted overlap period
          const workingDays = differenceInDays(overlapEnd, overlapStart) + 1;
          
          // If no working days or negative days after adjustment, skip
          if (workingDays <= 0) {
            return;
          }
          
          // Calculate payment for this period
          const rate = historyRecord.platforms_count === 2 ? 
            manager.rate_dual_platform : 
            manager.rate_single_platform;
          
          const dailyRate = rate / daysInMonth;
          const periodPayment = dailyRate * workingDays;
          
          totalPayment += periodPayment;
          
          // Check if this client is already in clientDetails for this manager
          const existingClientIndex = clientDetails.findIndex(cd => cd.clientId === client.id);
          
          if (existingClientIndex >= 0) {
            // Add to existing client record
            clientDetails[existingClientIndex].workingDays += workingDays;
            clientDetails[existingClientIndex].payment += periodPayment;
            clientDetails[existingClientIndex].periods.push({
              start: format(overlapStart, "d/M"),
              end: format(overlapEnd, "d/M"),
              days: workingDays,
              payment: periodPayment
            });
          } else {
            // Create new client record
            clientDetails.push({
              clientId: client.id,
              name: client.name,
              company: client.company,
              platforms: historyRecord.platforms_count,
              rate: rate,
              workingDays: workingDays,
              payment: periodPayment,
              status: client.status,
              periods: [{
                start: format(overlapStart, "d/M"),
                end: format(overlapEnd, "d/M"),
                days: workingDays,
                payment: periodPayment
              }]
            });
          }
        }
      });

      // Add one-time works for this manager in the selected month
      const managerOneTimeWorks = oneTimeWorks.filter(work => {
        if (work.campaign_manager_id !== manager.id) return false;
        const workDate = new Date(work.work_date);
        return workDate >= monthStart && workDate <= monthEnd && 
               (work.status === 'approved' || work.status === 'paid');
      });

      const oneTimeTotal = managerOneTimeWorks.reduce((sum, work) => sum + (work.amount || 0), 0);
      totalPayment += oneTimeTotal;

      // חישוב פרויקציה לסוף החודש
      if (isCurrentMonth) {
        // חישוב לקוחות פעילים נכון להיום (ללא תאריך סיום בהיסטוריה)
        let dailyProjectedPayment = 0;
        managerHistory.forEach(historyRecord => {
          const client = clients.find(c => c.id === historyRecord.client_id);
          if (!client) return;
          
          // Check if this client is currently active with this manager (no end_date in history and client is active)
          // Also verify if the client's status is not paused for the projection.
          const isCurrentlyActiveClient = !historyRecord.end_date && client.status === 'active';
          
          if (isCurrentlyActiveClient) {
            // Check if the current date is within the history record's active period, considering pauses/resumes
            let projectionEffectiveStart = max([historyRecord.start_date, startOfMonth(today)]);
            let projectionEffectiveEnd = min([endOfMonth(today), today]); // Up to today

            if (client.pause_date && client.pause_date <= today && client.status === 'paused') {
                // If client paused before or on today and is still paused, no projection
                return;
            } else if (client.pause_date && client.resume_date && client.pause_date <= today && client.resume_date >= today) {
                // If today is within a pause period, no projection
                return;
            }

            const rate = historyRecord.platforms_count === 2 ? 
              manager.rate_dual_platform : 
              manager.rate_single_platform;
            dailyProjectedPayment += rate / daysInMonth;
          }
        });

        const remainingDays = daysInMonth - daysPassed;
        projectedTotalPayment = totalPayment + (dailyProjectedPayment * remainingDays);
        
      } else {
        // אם זה לא החודש הנוכחי, הפרויקציה היא התשלום הסופי
        projectedTotalPayment = totalPayment;
      }

      return {
        manager,
        totalPayment,
        projectedTotalPayment, // תשלום צפוי
        isCurrentMonth,
        daysPassed,
        daysInMonth,
        clientDetails: clientDetails.filter(cd => cd.workingDays > 0),
        clientsCount: clientDetails.filter(cd => cd.workingDays > 0).length,
        oneTimeWorks: managerOneTimeWorks,
        oneTimeTotal
      };
    });

    setCalculations(results);
  }, [selectedMonth, managers, clients, history, oneTimeWorks]); // Dependencies for useCallback

  useEffect(() => {
    if (managers.length > 0 && clients.length > 0 && history.length >= 0) {
      calculatePayments();
    }
  }, [calculatePayments, managers, clients, history, oneTimeWorks]); // Dependencies for useEffect

  const loadData = async () => {
    try {
      const [managersData, clientsData, historyData, oneTimeData] = await Promise.all([
        base44.entities.CampaignManager.list(),
        base44.entities.Client.list(),
        base44.entities.ClientManagerHistory.list(),
        base44.entities.OneTimeWork.list()
      ]);
      
      // Convert date strings to Date objects immediately after fetching
      historyData.forEach(h => {
        h.start_date = new Date(h.start_date);
        if (h.end_date) h.end_date = new Date(h.end_date);
      });
      clientsData.forEach(c => {
        if (c.pause_date) c.pause_date = new Date(c.pause_date);
        if (c.resume_date) c.resume_date = new Date(c.resume_date);
      });

      setManagers(managersData);
      setClients(clientsData);
      setHistory(historyData);
      setOneTimeWorks(oneTimeData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = "מנהל קמפיינים,לקוח,חברה,פלטפורמות,תעריף,תקופות עבודה,ימי עבודה,תשלום,סטטוס\n";
    
    calculations.forEach(calc => {
      // Export only regular client details as per outline instructions to keep existing export
      calc.clientDetails.forEach(client => {
        const periods = client.periods.map(p => `${p.start}-${p.end} (${p.days} ימים)`).join('; ');
        csvContent += `"${calc.manager.name}","${client.name}","${client.company || ''}",${client.platforms},"₪${client.rate}","${periods}",${client.workingDays},"₪${client.payment.toFixed(2)}","${client.status}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-calculation-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            מחשבון תשלומים מתקדם
          </h1>
          <p className="text-slate-600 mt-1">חישוב תשלומים מדויק עם מעקב החלפות מנהלי קמפיינים</p>
        </div>
        
        <div className="flex gap-3">
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
          
          <Button 
            onClick={exportToCSV}
            variant="outline"
            disabled={calculations.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            ייצא ל-CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              מנהלי קמפיינים פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {calculations.filter(c => c.clientsCount > 0 || c.oneTimeWorks.length > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              סך תשלומים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              ₪{calculations.reduce((sum, calc) => sum + calc.totalPayment, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              חודש נבחר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-900">
              {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: he })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              עבודות חד-פעמיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              ₪{calculations.reduce((sum, calc) => sum + calc.oneTimeTotal, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details */}
      <div className="space-y-6">
        {calculations.filter(calc => calc.clientsCount > 0 || calc.oneTimeWorks.length > 0).map(calc => (
          <Card key={calc.manager.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-l from-slate-50 to-blue-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold text-slate-900">
                  {calc.manager.name}
                </CardTitle>
                <div className="text-left">
                  <div className="text-2xl font-bold text-green-600">
                    ₪{calc.totalPayment.toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {calc.clientsCount} לקוחות
                    {calc.oneTimeWorks.length > 0 && ` + ${calc.oneTimeWorks.length} עבודות חד-פעמיות`}
                  </div>
                  
                  {/* הוספת הערכת סוף חודש */}
                  {calc.isCurrentMonth && (calc.projectedTotalPayment.toFixed(2) !== calc.totalPayment.toFixed(2)) && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700 font-medium">
                        הערכה לסוף החודש:
                      </div>
                      <div className="text-lg font-bold text-blue-800">
                        ₪{calc.projectedTotalPayment.toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600">
                        (עבר {calc.daysPassed} מתוך {calc.daysInMonth} ימים)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right p-4 font-medium text-slate-700">פריט</th>
                      <th className="text-right p-4 font-medium text-slate-700">פרטים</th>
                      <th className="text-right p-4 font-medium text-slate-700">תקופה/תאריך</th>
                      <th className="text-right p-4 font-medium text-slate-700">תשלום</th>
                      <th className="text-right p-4 font-medium text-slate-700">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Regular client work */}
                    {calc.clientDetails.map((client, index) => (
                      <tr key={`client-${client.clientId}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-slate-900">{client.name}</div>
                            {client.company && (
                              <div className="text-sm text-slate-500">{client.company}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-700">
                          {client.platforms === 1 ? "פלטפורמה אחת" : "2 פלטפורמות"} | תעריף: ₪{client.rate.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {client.periods.map((period, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-600">
                                  {period.start} - {period.end} ({period.days} ימים)
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-green-600">
                          ₪{client.payment.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.status === 'active' ? 'bg-green-100 text-green-800' :
                            client.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {client.status === 'active' ? 'פעיל' :
                             client.status === 'paused' ? 'בהקפאה' : 'עזב'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* One-time works */}
                    {calc.oneTimeWorks.map((work, index) => (
                      <tr key={`work-${work.id}-${index}`} className="border-t border-slate-100 hover:bg-slate-50 bg-purple-50/30">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-purple-900">עבודה חד-פעמית</div>
                            <div className="text-sm text-purple-600">{work.description}</div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-700">
                          {work.client_name && `לקוח: ${work.client_name}`}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            <span className="text-slate-600">
                              {format(new Date(work.work_date), "d/M/yyyy")}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-purple-600">
                          ₪{work.amount?.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            work.status === 'approved' ? 'bg-green-100 text-green-800' :
                            work.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {work.status === 'approved' ? 'אושר' :
                             work.status === 'paid' ? 'שולם' : 'ממתין'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {calculations.filter(calc => calc.clientsCount > 0 || calc.oneTimeWorks.length > 0).length === 0 && (
          <div className="text-center py-16">
            <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">אין נתונים לחודש זה</h3>
            <p className="text-slate-500">לא נמצאו לקוחות או עבודות חד-פעמיות בחודש הנבחר</p>
          </div>
        )}
      </div>
    </div>
  );
}

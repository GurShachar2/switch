

import React, { useState, useEffect, Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  UserCheck,
  Calculator,
  ChevronsRight,
  ChevronsLeft,
  Menu,
  FileText,
  DollarSign,
  Loader2,
  CheckSquare,
  FileClock,
  Briefcase,
  Settings,
} from "lucide-react";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import AccessDenied from "@/components/ui/AccessDenied";

const navigationCategories = [
  {
    category: "ראשי",
    items: [
      {
        title: "דף הבית",
        url: createPageUrl("Dashboard"),
        icon: Home,
      },
    ],
  },
  {
    category: "ניהול צוות ולקוחות",
    items: [
      {
        title: "מנהלי קמפיינים",
        url: createPageUrl("CampaignManagers"),
        icon: UserCheck,
      },
      {
        title: "לקוחות",
        url: createPageUrl("Clients"),
        icon: Users,
      },
    ],
  },
  {
    category: "פרויקטים ומשימות",
    items: [
      {
        title: "בריפים ומשימות",
        url: createPageUrl("BriefsAndTasks"),
        icon: Briefcase,
      },
      {
        title: "עבודות חד-פעמיות",
        url: createPageUrl("OneTimeWork"),
        icon: FileText,
      },
      {
        title: "ניהול משימות יומיות",
        url: createPageUrl("TaskManagement"),
        icon: CheckSquare,
      },
    ],
  },
  {
    category: "הגדרות מערכת",
    items: [
      {
        title: "בדיקות דאבל צ'ק",
        url: createPageUrl("BriefVerificationChecks"),
        icon: Settings,
      },
    ],
  },
  {
    category: "דוחות",
    items: [
      {
        title: "דוחות יומיים",
        url: createPageUrl("DailyReports"),
        icon: FileText,
        key: "dailyReports"
      },
      {
        title: "דוחות שבועיים",
        url: createPageUrl("WeeklyReportsAdmin"),
        icon: FileClock,
        key: "weeklyReports"
      },
    ],
  },
  {
    category: "כספים",
    items: [
      {
        title: "ניהול תשלומים",
        url: createPageUrl("AdminPayments"),
        icon: DollarSign,
      },
      {
        title: "מחשבון תשלומים",
        url: createPageUrl("PaymentCalculator"),
        icon: Calculator,
      },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasNewDailyReports, setHasNewDailyReports] = useState(false);
  const [hasActiveWeeklyReportCycle, setHasActiveWeeklyReportCycle] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        if (user && user.role === 'admin') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setCurrentUser(null);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [location.pathname]);

  useEffect(() => {
    const checkReportsStatus = async () => {
      if (!isAuthorized) return;
      
      try {
        // בדיקה לדוחות יומיים - בודק אם יש דוחות מהיום שטרם נצפו
        const today = new Date().toISOString().split('T')[0];
        const todayReports = await base44.entities.ClientDailyReport.filter({
          report_date: today
        });
        
        // נחשב שיש דוחות "חדשים" אם יש דוחות מהיום ועדיין לא ביקרנו בעמוד הדוחות היום
        const hasVisitedDailyReportsToday = localStorage.getItem(`dailyReportsVisit_${today}`) === 'true';
        setHasNewDailyReports(todayReports.length > 0 && !hasVisitedDailyReportsToday);

        // בדיקה לדוחות שבועיים - בודק אם יש סבב פעיל
        const activeCycles = await base44.entities.ReportCycle.filter({
          status: 'active'
        });
        setHasActiveWeeklyReportCycle(activeCycles.length > 0);

      } catch (error) {
        console.error("Error checking reports status:", error);
      }
    };

    checkReportsStatus();
    
    // בדוק כל דקה
    const interval = setInterval(checkReportsStatus, 60000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  // סמן שביקרנו בעמוד הדוחות היומיים
  useEffect(() => {
    if (currentPageName === "DailyReports") {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`dailyReportsVisit_${today}`, 'true');
      setHasNewDailyReports(false);
    }
  }, [currentPageName]);

  if (currentPageName === "ManagerPaymentView") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <AccessDenied />;
  }

  const getNavItemClasses = (item) => {
    const isActive = location.pathname === item.url;
    const hasNotification = (item.key === 'dailyReports' && hasNewDailyReports) || 
                           (item.key === 'weeklyReports' && hasActiveWeeklyReportCycle);
    
    let classes = `flex items-center gap-3 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl p-3 ${
      collapsed ? 'justify-center' : ''
    }`;
    
    if (isActive) {
      classes += ' bg-blue-100 text-blue-800 shadow-sm';
    } else if (hasNotification) {
      classes += ' bg-red-50 text-red-700 hover:bg-red-100 border-r-4 border-red-500';
    } else {
      classes += ' text-slate-700';
    }
    
    return classes;
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-l border-slate-200 shadow-lg transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0964cc3a7_106131830_padded_logo.png"
              alt="Switch Marketing"
              className="w-12 h-12 object-contain flex-shrink-0"
            />
            {!collapsed && (
              <div className="transition-all duration-200">
                <h2 className="font-bold text-slate-900 text-lg whitespace-nowrap">Switch Marketing</h2>
                <p className="text-sm text-slate-600 whitespace-nowrap">מערכת ניהול תשלומים</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigationCategories.map((category) => (
              <Fragment key={category.category}>
                {!collapsed && (
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">
                    {category.category}
                  </h3>
                )}
                {category.items.map((item) => (
                  <li key={item.title}>
                    <Link
                      to={item.url}
                      title={collapsed ? item.title : undefined}
                      className={getNavItemClasses(item)}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="font-medium whitespace-nowrap">{item.title}</span>
                      )}
                      {!collapsed && item.key === 'dailyReports' && hasNewDailyReports && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-auto"></div>
                      )}
                      {!collapsed && item.key === 'weeklyReports' && hasActiveWeeklyReportCycle && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-auto"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </nav>

        {/* Toggle Button */}
        <div className="border-t border-slate-200 p-2">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center p-3"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ?
              <ChevronsLeft className="w-5 h-5 text-slate-600" /> :
              <ChevronsRight className="w-5 h-5 text-slate-600" />
            }
          </Button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0964cc3a7_106131830_padded_logo.png"
              alt="Switch Marketing"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h2 className="font-bold text-slate-900">Switch Marketing</h2>
              <p className="text-sm text-slate-600">מערכת ניהול תשלומים</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navigationCategories.map((category) => (
              <Fragment key={`mobile-${category.category}`}>
                <h3 className="text-sm font-medium text-slate-500 mb-2 mt-3 px-3">
                  {category.category}
                </h3>
                {category.items.map((item) => (
                  <li key={item.title}>
                    <Link
                      to={item.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className={getNavItemClasses(item)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                      {item.key === 'dailyReports' && hasNewDailyReports && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-auto"></div>
                      )}
                      {item.key === 'weeklyReports' && hasActiveWeeklyReportCycle && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-auto"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Unified Header for both Mobile and Desktop */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 shadow-sm flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
              {currentPageName}
            </h1>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}


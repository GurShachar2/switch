import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import CampaignManagers from "./CampaignManagers";

import Clients from "./Clients";

import PaymentCalculator from "./PaymentCalculator";

import OneTimeWork from "./OneTimeWork";

import AdminPayments from "./AdminPayments";

import ManagerPaymentView from "./ManagerPaymentView";

import TaskManagement from "./TaskManagement";

import DailyReports from "./DailyReports";

import BriefsAndTasks from "./BriefsAndTasks";

import WeeklyReportsAdmin from "./WeeklyReportsAdmin";

import BriefVerificationChecks from "./BriefVerificationChecks";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    CampaignManagers: CampaignManagers,
    
    Clients: Clients,
    
    PaymentCalculator: PaymentCalculator,
    
    OneTimeWork: OneTimeWork,
    
    AdminPayments: AdminPayments,
    
    ManagerPaymentView: ManagerPaymentView,
    
    TaskManagement: TaskManagement,
    
    DailyReports: DailyReports,
    
    BriefsAndTasks: BriefsAndTasks,
    
    WeeklyReportsAdmin: WeeklyReportsAdmin,
    
    BriefVerificationChecks: BriefVerificationChecks,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/CampaignManagers" element={<CampaignManagers />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/PaymentCalculator" element={<PaymentCalculator />} />
                
                <Route path="/OneTimeWork" element={<OneTimeWork />} />
                
                <Route path="/AdminPayments" element={<AdminPayments />} />
                
                <Route path="/ManagerPaymentView" element={<ManagerPaymentView />} />
                
                <Route path="/TaskManagement" element={<TaskManagement />} />
                
                <Route path="/DailyReports" element={<DailyReports />} />
                
                <Route path="/BriefsAndTasks" element={<BriefsAndTasks />} />
                
                <Route path="/WeeklyReportsAdmin" element={<WeeklyReportsAdmin />} />
                
                <Route path="/BriefVerificationChecks" element={<BriefVerificationChecks />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
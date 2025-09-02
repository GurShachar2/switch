import React from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils'; // הוספת הייבוא החסר

export default function AccessDenied() {
    const handleLogout = async () => {
        try {
            await User.logout();
            window.location.reload();
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback for local development or if logout fails
            window.location.href = createPageUrl('Login');
        }
    };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100 p-4" dir="rtl">
      <Card className="w-full max-w-md text-center shadow-lg border-0">
        <CardHeader>
          <div className="mx-auto bg-red-100 p-4 rounded-full">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-slate-800">
            אין לך הרשאת גישה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">
            לעמוד זה נדרשת הרשאת מנהל מערכת.
            <br />
            אם אתה סבור שמדובר בטעות, פנה למנהל המערכת.
          </p>
          <Button onClick={handleLogout} variant="destructive">
            התנתקות
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
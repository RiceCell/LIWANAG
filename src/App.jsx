import React, { useState, useEffect } from 'react';
import LandingPage from './features/LandingPage';
import RefugeMap from './features/RefugeMap';
import AuthPage from './features/AuthPage';
import ProfilePage from './features/ProfilePage';
import AlertsPage from './features/AlertsPage';
import GovConsole from './features/gov/GovConsole';
import { ReportBrownout } from './features/ReportBrownout';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './hooks/useAuth';
import { useIsStaff } from './hooks/useIsStaff';

const TAB_VIEWS = ['map', 'alerts', 'profile'];

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const { session, loading } = useAuth();
  const { isStaff, loading: staffLoading } = useIsStaff();

  const handleGetStarted = () => {
    setCurrentView(session ? 'map' : 'auth');
  };

  // If a session disappears while the person is in the app (sign-out,
  // expired token), send them back to landing instead of leaving them
  // stuck on a screen that assumes they're logged in.
  useEffect(() => {
    if (!loading && !session && (TAB_VIEWS.includes(currentView) || currentView === 'gov' || currentView === 'report')) {
      setCurrentView('landing');
    }
  }, [session, loading, currentView]);

  // Listen for the custom event the map's FAB fires to launch the
  // full-screen brownout report flow.
  useEffect(() => {
    const handleOpenReport = () => setCurrentView('report');
    window.addEventListener('open-report', handleOpenReport);
    return () => window.removeEventListener('open-report', handleOpenReport);
  }, []);

  const renderView = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center bg-slate-50 text-brand-500 font-bold">
          Loading LIWANAG...
        </div>
      );
    }

    switch (currentView) {
      case 'landing':
        return <LandingPage onGetStarted={handleGetStarted} />;
      case 'auth':
        return (
          <AuthPage
            onAuthSuccess={() => setCurrentView('map')}
            onBack={() => setCurrentView('landing')}
          />
        );
      case 'map':
      case 'alerts':
      case 'profile':
        if (!session) {
          setCurrentView('auth');
          return null;
        }
        return (
          <AppLayout onNavigate={setCurrentView} activeView={currentView} isStaff={isStaff}>
            {currentView === 'map' && <RefugeMap />}
            {currentView === 'alerts' && <AlertsPage />}
            {currentView === 'profile' && <ProfilePage isStaff={isStaff} onNavigate={setCurrentView} />}
          </AppLayout>
        );

      case 'report':
        if (!session) {
          setCurrentView('auth');
          return null;
        }
        return <ReportBrownout onBack={() => setCurrentView('map')} />;

      case 'gov':
        if (!session) {
          setCurrentView('auth');
          return null;
        }
        // Wait for the staff check to resolve before deciding anything —
        // otherwise a legitimate official would get bounced to 'map' for a
        // frame or two every time this loads, since `isStaff` starts false.
        if (staffLoading) {
          return (
            <div className="h-full flex items-center justify-center bg-slate-50 text-brand-500 font-bold">
              Checking access...
            </div>
          );
        }
        // The actual security boundary is RLS (see the migration) — this
        // redirect just stops a normal user from sitting on a screen that's
        // going to fail every write they try anyway.
        if (!isStaff) {
          setCurrentView('map');
          return null;
        }
        return <GovConsole onExit={() => setCurrentView('map')} />;
      default:
        return <LandingPage onGetStarted={handleGetStarted} />;
    }
  };

  // The LGU console is a desktop dashboard, not a phone screen, so it skips
  // the device-frame treatment entirely and renders full-bleed. Only do
  // this once we've actually confirmed staff status — otherwise a non-staff
  // user (or a legitimate official whose check hasn't resolved yet) would
  // briefly get the full-bleed frame around an empty/redirecting screen.
  const isGovView = currentView === 'gov' && isStaff && !staffLoading;

  if (isGovView) {
    return <div className="min-h-screen w-full bg-slate-50">{renderView()}</div>;
  }

  // This is a phone-first PWA. On an actual phone it fills the real
  // viewport edge-to-edge, same as before. On a wider (desktop/tablet)
  // viewport it renders inside a fixed-size device frame instead of
  // stretching full-bleed — `transform` on the frame also makes it the
  // containing block for every `fixed`-positioned element inside (the
  // status island, sheets, account menu, bottom nav), so they stay pinned
  // to the frame's edges instead of the browser window's.
  return (
    <div className="min-h-screen w-full bg-slate-200 sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="relative w-full h-screen overflow-hidden transform bg-white sm:h-[844px] sm:max-w-[420px] sm:rounded-[2.75rem] sm:shadow-2xl sm:ring-[10px] sm:ring-slate-900">
        {renderView()}
      </div>
    </div>
  );
}
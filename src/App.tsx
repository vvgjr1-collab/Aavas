import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { AuthContainer } from './components/AuthContainer';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [showHomePage, setShowHomePage] = useState(true);
  const [currentRole, setCurrentRole] = useState<'tenant' | 'landlord' | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('signup');

  const getBackgroundClass = () => {
    if (currentRole === 'landlord') {
      return 'min-h-screen bg-gradient-to-br from-[#f4eedf] via-[#faf7f0] to-[#2e3a8c]/10 flex items-center justify-center p-4';
    } else if (currentRole === 'tenant') {
      return 'min-h-screen bg-gradient-to-br from-[#2C7A7B]/10 via-background to-[#FFFBDE]/20 flex items-center justify-center p-4';
    }
    return 'min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4';
  };

  const handleGetStarted = () => {
    setAuthView('signup');
    setShowHomePage(false);
  };

  const handleSignIn = () => {
    setAuthView('login');
    setShowHomePage(false);
  };

  const handleBackToHome = () => {
    setShowHomePage(true);
  };

  if (showHomePage) {
    return (
      <>
        <HomePage onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
        <Toaster />
      </>
    );
  }

  return (
    <div className={getBackgroundClass()}>
      <AuthContainer onRoleChange={setCurrentRole} initialView={authView} onBackToHome={handleBackToHome} />
      <Toaster />
    </div>
  );
}
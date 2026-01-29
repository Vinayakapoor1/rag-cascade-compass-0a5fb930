import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LogIn,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsPopover } from '@/components/NotificationsPopover';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, isAdmin, isDepartmentHead, signOut, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[700px] h-[700px] -top-[350px] -right-[250px] animate-float" />
        <div className="gradient-orb w-[500px] h-[500px] top-1/2 -left-[250px]" style={{ animationDelay: '-3s' }} />
        <div className="gradient-orb w-[400px] h-[400px] bottom-[10%] right-[20%]" style={{ animationDelay: '-5s' }} />
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-50 w-full border-b border-border/30 overflow-visible">
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container flex h-16 items-center justify-between">
          {/* Left side: Logo + Portfolio nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center group">
              <img
                src="/images/klarity-logo-full.png"
                alt="KlaRity by Infosec Ventures"
                className="h-12 w-auto transition-all duration-300 group-hover:brightness-110"
              />
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                  location.pathname === '/'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span>Portfolio</span>
              </Link>
            </nav>
          </div>

          {/* Theme Toggle + Auth Controls */}
          <div className="flex items-center gap-3">
            {user && <NotificationsPopover />}
            <ThemeToggle />
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    {/* Department Head: Enter Data Button */}
                    {isDepartmentHead && !isAdmin && (
                      <Link to="/data">
                        <Button variant="outline" size="sm" className="glass-card hover-glow border-primary/20 text-foreground">
                          <Settings className="h-4 w-4 sm:mr-2 text-foreground" />
                          <span className="hidden sm:inline">Enter Data</span>
                        </Button>
                      </Link>
                    )}

                    {/* Admin: Unified Dashboard Button */}
                    {isAdmin && (
                      <Link to="/admin">
                        <Button variant="outline" size="sm" className="glass-card hover-glow border-primary/20 bg-primary/10 hover:bg-primary/20 text-foreground">
                          <Settings className="h-4 w-4 sm:mr-2 text-foreground" />
                          <span className="hidden sm:inline">Admin Dashboard</span>
                        </Button>
                      </Link>
                    )}

                    {/* User Menu with Email and Sign Out */}
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-muted/50 transition-colors px-2"
                      >
                        <LogOut className="h-4 w-4 text-foreground" />
                      </Button>

                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="glass-card border border-border/50 rounded-lg shadow-lg p-3 space-y-2">
                          <div className="px-2 py-1.5 border-b border-border/30">
                            <p className="text-xs text-muted-foreground">Signed in as</p>
                            <p className="text-sm font-medium truncate">{user.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={signOut}
                            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link to="/auth">
                    <Button size="sm" className="hover-glow shadow-lg shadow-primary/30">
                      <LogIn className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-border/30 py-10 mt-auto">
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground">
          <img
            src="/images/klarity-logo-full.png"
            alt="KlaRity by Infosec Ventures"
            className="h-10 w-auto opacity-50 transition-opacity hover:opacity-80"
          />
          <p className="text-xs font-medium">© 2026 All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
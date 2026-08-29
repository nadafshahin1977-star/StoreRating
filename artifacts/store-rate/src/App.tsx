import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { AdminOverview, AdminStores, AdminUsers, AuthPage, OwnerDashboardPage, SettingsPage, StoreDiscovery } from "@/pages/store-rate-pages";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={AuthPage} />
    <Route path="/admin" component={AdminOverview} />
    <Route path="/admin/users" component={AdminUsers} />
    <Route path="/admin/stores" component={AdminStores} />
    <Route path="/stores" component={StoreDiscovery} />
    <Route path="/owner" component={OwnerDashboardPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function TokenBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem("store-rate-token");
      if (!token) return nativeFetch(input, init);
      const headers = new Headers(init?.headers);
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return nativeFetch(input, { ...init, headers });
    };
    return () => { window.fetch = nativeFetch; };
  }, []);
  return null;
}

function App() {
  return <QueryClientProvider client={queryClient}><TokenBridge /><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Wifi, WifiOff, RefreshCw, Loader2, CheckCircle2, XCircle,
  Clock, ArrowDownToLine, Eye, EyeOff, ShieldCheck
} from 'lucide-react';

interface TradovateAccount {
  id: number;
  name: string;
  nickname?: string;
}

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt: string | null;
  accounts: TradovateAccount[];
  errorMessage: string | null;
}

export const TradovateIntegration = () => {
  // ─── Connection state ─────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    lastSyncAt: null,
    accounts: [],
    errorMessage: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [selectedTradovateAccount, setSelectedTradovateAccount] = useState<string>('all');
  const [lastSyncResult, setLastSyncResult] = useState<{ tradesAdded: number; duplicatesSkipped: number } | null>(null);

  // ─── Credential form state ────────────────────────────────
  const [tvUsername, setTvUsername] = useState('');
  const [tvPassword, setTvPassword] = useState('');
  const [tvEnvironment, setTvEnvironment] = useState<'demo' | 'live'>('demo');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Fetch connection status ──────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('tradovate-status', {
        method: 'POST',
      });

      if (response.error) {
        console.error('Error fetching status:', response.error);
        return;
      }

      const data = response.data;
      setConnectionStatus({
        status: data.status || 'disconnected',
        lastSyncAt: data.lastSyncAt || null,
        accounts: data.accounts || [],
        errorMessage: data.errorMessage || null,
      });
    } catch (error) {
      console.error('Error fetching Tradovate status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ─── Connect with user credentials ────────────────────────
  const handleConnect = async () => {
    if (!tvUsername.trim() || !tvPassword.trim()) {
      toast.error('Ingresa tu usuario y contraseña de Tradovate.');
      return;
    }

    try {
      setIsConnecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión no válida. Inicia sesión nuevamente.');
        return;
      }

      const response = await supabase.functions.invoke('tradovate-connect', {
        body: {
          username: tvUsername.trim(),
          password: tvPassword,
          environment: tvEnvironment,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error de conexión');
      }

      const data = response.data;

      if (data.error) {
        toast.error(data.error);
        setConnectionStatus(prev => ({
          ...prev,
          status: 'error',
          errorMessage: data.error,
        }));
        return;
      }

      // Clear credentials from memory after successful connection
      setTvUsername('');
      setTvPassword('');
      setShowPassword(false);

      toast.success('¡Conectado con Tradovate exitosamente!');
      setConnectionStatus({
        status: 'connected',
        lastSyncAt: connectionStatus.lastSyncAt,
        accounts: data.accounts || [],
        errorMessage: null,
      });
    } catch (error: any) {
      toast.error(error.message || 'Error al conectar con Tradovate');
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error.message,
      }));
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('tradovate_connections')
        .delete()
        .eq('user_id', user.id);

      setConnectionStatus({
        status: 'disconnected',
        lastSyncAt: null,
        accounts: [],
        errorMessage: null,
      });
      setLastSyncResult(null);
      toast.success('Desconectado de Tradovate');
    } catch (error: any) {
      toast.error('Error al desconectar');
    }
  };

  // ─── Sync ─────────────────────────────────────────────────
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setLastSyncResult(null);

      const body: any = {};
      if (selectedTradovateAccount && selectedTradovateAccount !== 'all') {
        body.tradovateAccountId = parseInt(selectedTradovateAccount);
      }

      const response = await supabase.functions.invoke('tradovate-sync', {
        body,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error de sincronización');
      }

      const data = response.data;

      if (data.error) {
        // If token expired, refresh status and show reconnect message
        if (data.tokenExpired) {
          await fetchStatus();
          toast.error('Token expirado. Reconecta tu cuenta.');
          return;
        }
        toast.error(data.error);
        return;
      }

      setLastSyncResult({
        tradesAdded: data.tradesAdded || 0,
        duplicatesSkipped: data.duplicatesSkipped || 0,
      });

      if (data.tradesAdded > 0) {
        toast.success(`${data.tradesAdded} trade(s) importado(s) exitosamente`);
      } else {
        toast.info(data.message || 'No hay nuevos trades para importar');
      }

      await fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isConnected = connectionStatus.status === 'connected';
  const isError = connectionStatus.status === 'error';

  // ─── Loading ──────────────────────────────────────────────
  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando estado...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ Connection Status Card ═══ */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
        {/* Status glow */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${
            isConnected ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-zinc-500'
          }`}
        />

        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : isError
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-zinc-500/15 text-zinc-400'
                }`}
              >
                {isConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                {isConnected && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Tradovate</CardTitle>
                <CardDescription className="text-xs">
                  Apex Trader Funding
                </CardDescription>
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isError
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400' : isError ? 'bg-red-400' : 'bg-zinc-400'
                }`}
              />
              {isConnected ? 'Conectado' : isError ? 'Error' : 'Desconectado'}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error message */}
          {isError && connectionStatus.errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{connectionStatus.errorMessage}</p>
            </div>
          )}

          {/* ═══ Credential Form (when disconnected) ═══ */}
          {!isConnected && (
            <div className="space-y-4 p-4 rounded-lg border border-border/40 bg-muted/10">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">
                  Tus credenciales se envían de forma segura al servidor y nunca se almacenan.
                </span>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="tv-username" className="text-sm">Usuario de Tradovate</Label>
                <Input
                  id="tv-username"
                  type="text"
                  placeholder="Tu usuario de Tradovate"
                  value={tvUsername}
                  onChange={(e) => setTvUsername(e.target.value)}
                  disabled={isConnecting}
                  autoComplete="off"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="tv-password" className="text-sm">Contraseña de Tradovate</Label>
                <div className="relative">
                  <Input
                    id="tv-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña de Tradovate"
                    value={tvPassword}
                    onChange={(e) => setTvPassword(e.target.value)}
                    disabled={isConnecting}
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Environment selector */}
              <div className="space-y-1.5">
                <Label className="text-sm">Entorno</Label>
                <Select
                  value={tvEnvironment}
                  onValueChange={(v) => setTvEnvironment(v as 'demo' | 'live')}
                  disabled={isConnecting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo (Simulación)</SelectItem>
                    <SelectItem value="live">Live (Producción)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Connect button */}
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !tvUsername.trim() || !tvPassword.trim()}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                {isConnecting ? 'Conectando...' : 'Conectar con Tradovate'}
              </Button>
            </div>
          )}

          {/* Connected state: disconnect button + last sync */}
          {isConnected && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <WifiOff className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Última sincronización: {formatDate(connectionStatus.lastSyncAt)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ Sync Panel (only when connected) ═══ */}
      {isConnected && (
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Sincronizar Trades</CardTitle>
                <CardDescription className="text-xs">
                  Importa tus operaciones automáticamente desde Tradovate
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Account selector */}
            {connectionStatus.accounts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cuenta de Tradovate</Label>
                <Select value={selectedTradovateAccount} onValueChange={setSelectedTradovateAccount}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar cuenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {connectionStatus.accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.nickname || account.name} (ID: {account.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sync button */}
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full gap-2"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Ahora
                </>
              )}
            </Button>

            {/* Sync progress */}
            {isSyncing && (
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Obteniendo fills y reconstruyendo trades...
                </p>
              </div>
            )}

            {/* Sync result */}
            {lastSyncResult && !isSyncing && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-300">
                    Sincronización completada
                  </p>
                  <div className="flex gap-4 text-xs text-emerald-300/80">
                    <span>{lastSyncResult.tradesAdded} trade(s) importado(s)</span>
                    {lastSyncResult.duplicatesSkipped > 0 && (
                      <span>{lastSyncResult.duplicatesSkipped} duplicado(s) omitido(s)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help text when disconnected */}
      {!isConnected && !isError && (
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-muted-foreground/60">
            Tus credenciales se usan una sola vez para obtener un token de acceso. No se almacenan.
          </p>
        </div>
      )}
    </div>
  );
};

export default TradovateIntegration;

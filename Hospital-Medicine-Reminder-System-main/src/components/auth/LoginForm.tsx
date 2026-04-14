import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity,
  ArrowLeft,
  LogIn, 
  AlertCircle, 
  Loader2, 
  UserPlus, 
  ShieldCheck,
  Stethoscope,
  KeyRound,
  CircleCheck,
} from 'lucide-react';
import { authApi, wardsApi } from '@/services/api';
import { useAuthStore } from '@/store/useStore';
import { toast } from 'sonner';
import type { UserRole, Ward } from '@/types';

export function LoginForm({ onBack }: { onBack?: () => void }) {
  const storeLogin = useAuthStore((state) => state.login);

  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('nurse');
  const [ward, setWard] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const fetchWards = async () => {
      const resp = await wardsApi.getAll();
      if (resp.success && resp.data) {
        setWards(resp.data);
      }
    };

    fetchWards();
  }, []);

  const wardOptions = useMemo(() => {
    return wards.map((item) => ({ value: item.name, label: item.name }));
  }, [wards]);

  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const validate = () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid hospital email address.');
      return false;
    }

    if (authTab === 'signup') {
      if (password.length < 8) {
        setError('Password must contain at least 8 characters.');
        return false;
      }

      if (!name.trim()) {
        setError('Full name is required.');
        return false;
      }

      if (!licenseNumber.trim()) {
        setError('Professional license number is required.');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (authTab === 'login') {
        const response = await authApi.login({ email, password });
        if (response.success && response.data) {
          storeLogin(response.data.user, response.data.token);
          toast.success('Signed in successfully.');
        } else {
          setError(response.error || 'Sign in failed. Please verify your credentials.');
        }
      } else {
        const response = await authApi.signUp({ 
          email, 
          password, 
          name, 
          role, 
          ward, 
          licenseNumber,
          employeeId,
          phone,
          speciality
        });

        if (response.success && response.data) {
          toast.success('Registration successful. Signing you in...');

          const loginResponse = await authApi.login({ email, password });
          if (loginResponse.success && loginResponse.data) {
            storeLogin(loginResponse.data.user, loginResponse.data.token);
            toast.success('Welcome to MediSync Pro.');
          } else {
            setAuthTab('login');
            toast.info('Account created. Please sign in to continue.');
          }
        } else {
          const message = response.error || 'Registration failed. Please verify your details.';
          setError(message);

          if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('already registered')) {
            setAuthTab('login');
          }
        }
      }
    } catch {
      setError('Unable to contact the authentication service. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      setError('Enter your hospital email first, then request a reset link.');
      return;
    }

    setIsResettingPassword(true);
    setError(null);

    try {
      const response = await authApi.requestPasswordReset(email);
      if (response.success) {
        toast.success('Password reset link sent. Check your email.');
      } else {
        setError(response.error || 'Unable to send reset link. Try again.');
      }
    } catch {
      setError('Unable to contact the authentication service. Try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="relative hidden overflow-hidden bg-[#0d1b2a] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #38bdf8 0%, transparent 30%), radial-gradient(circle at 80% 0%, #22d3ee 0%, transparent 35%), radial-gradient(circle at 50% 100%, #60a5fa 0%, transparent 30%)' }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/20">
                <Stethoscope className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <p className="font-['Space_Grotesk'] text-lg font-bold tracking-tight">MediSync Pro</p>
                <p className="text-xs text-slate-300">Clinical Operations Platform</p>
              </div>
            </div>

            <div className="mt-14 space-y-6">
              <h1 className="font-['Space_Grotesk'] text-5xl font-bold leading-tight">
                Built for
                <br />
                modern
                <br />
                hospital teams.
              </h1>
              <p className="max-w-md text-slate-300">
                Secure medication workflows, real-time visibility, and role-based access for doctors, nurses, and administrators.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-3">
            {[
              { icon: ShieldCheck, title: 'End-to-End Security', desc: 'Role-aware access with auditable clinical actions' },
              { icon: Activity, title: 'Operational Visibility', desc: 'Track doses, alerts, and escalations in one view' },
              { icon: CircleCheck, title: 'Reliable Workflow', desc: 'Designed for high-pressure ward environments' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4">
                <item.icon className="mt-0.5 h-5 w-5 text-cyan-300" />
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-slate-300">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-slate-900">
                  {authTab === 'login' ? 'Sign in' : 'Create account'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {authTab === 'login' ? 'Access your clinical dashboard securely.' : 'Register your professional profile to continue.'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="h-9 px-3 text-slate-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>

            <Tabs
              value={authTab}
              onValueChange={(value) => {
                setAuthTab(value as 'login' | 'signup');
                setError(null);
              }}
            >
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="login" className="font-medium">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="font-medium">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <TabsContent value="login" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Hospital Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.com"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleForgotPassword}
                      disabled={isLoading || isResettingPassword}
                      className="h-auto px-0 text-sm font-medium text-slate-600"
                    >
                      {isResettingPassword ? 'Sending reset link...' : 'Forgot password?'}
                    </Button>
                  </div>

                  <Button type="submit" disabled={isLoading} className="h-11 w-full">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full legal name"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-email">Hospital Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hospital.com"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="head_nurse">Head Nurse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ward / Department (Optional)</Label>
                      <Select value={ward} onValueChange={setWard}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ward or department" />
                        </SelectTrigger>
                        <SelectContent>
                          {wardOptions.length > 0 ? (
                            wardOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="general">General Ward</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">Leave this blank if your ward or department does not need to be recorded.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-license">License Number</Label>
                      <Input
                        id="signup-license"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="MED-123456"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-speciality">Speciality</Label>
                      <Input
                        id="signup-speciality"
                        value={speciality}
                        onChange={(e) => setSpeciality(e.target.value)}
                        placeholder="Optional"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-employee-id">Employee ID</Label>
                      <Input
                        id="signup-employee-id"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="HOSP-00991"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 90000 00000"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="h-11 w-full">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>
                </TabsContent>
              </form>
            </Tabs>

            <p className="mt-6 text-center text-xs text-slate-400">
              By continuing, you agree to your hospital security and access policies.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

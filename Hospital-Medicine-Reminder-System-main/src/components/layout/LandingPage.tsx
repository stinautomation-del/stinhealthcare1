import { ArrowRight, Bell, Building2, Clock3, Hospital, Shield, Stethoscope, UserCheck } from 'lucide-react';

export const LandingPage = ({ onLoginClick }: { onLoginClick: () => void }) => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0ea5e9] text-white shadow-lg shadow-sky-200">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-slate-900">MediSync Pro</p>
              <p className="text-xs text-slate-500">Medication Workflow Platform</p>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-sky-600">Features</a>
            <a href="#security" className="transition-colors hover:text-sky-600">Security</a>
            <a href="#ops" className="transition-colors hover:text-sky-600">Operations</a>
          </div>

          <button
            onClick={onLoginClick}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Staff Sign In
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main>
        <section className="relative px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-10%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-sky-200/55 blur-3xl" />
            <div className="absolute bottom-[-12%] left-[-5%] h-[25rem] w-[25rem] rounded-full bg-cyan-200/60 blur-3xl" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                Live medication operations
              </div>

              <h1 className="font-['Space_Grotesk'] text-5xl font-bold leading-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Clinical precision
                <br />
                at shift speed.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                Coordinate dose schedules, acknowledgements, patient notifications, and escalation handling from one secure workflow built for hospital teams.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={onLoginClick}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
                >
                  Open Staff Portal
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Explore Platform
                </a>
              </div>

              <div id="ops" className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Dose Events / Day', value: '10k+' },
                  { label: 'Escalation SLA', value: '< 3 min' },
                  { label: 'Team Coverage', value: '24/7' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-sky-100 to-cyan-100 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2670&auto=format&fit=crop"
                  alt="Clinical operations dashboard"
                  className="h-[460px] w-full rounded-2xl object-cover"
                />
                <div className="absolute left-8 top-8 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Today</p>
                  <p className="text-lg font-semibold text-slate-900">92% on-time acknowledgements</p>
                </div>
                <div className="absolute bottom-8 right-8 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
                  <p className="text-sm font-semibold">Escalation monitoring active</p>
                  <p className="text-xs text-slate-300">Auto-alerts to on-call teams</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-slate-200 bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-12 max-w-3xl">
              <h2 className="font-['Space_Grotesk'] text-4xl font-bold text-slate-900">A platform designed for clinical reality</h2>
              <p className="mt-3 text-lg text-slate-600">Every workflow is tuned for speed, accountability, and patient safety.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: Clock3,
                  title: 'Time-Critical Scheduling',
                  desc: 'Dose timelines aligned to prescribed windows with clear nurse actions.',
                },
                {
                  icon: Bell,
                  title: 'Escalation-Ready Alerts',
                  desc: 'Immediate routing of missed-dose events to the right on-call role.',
                },
                {
                  icon: UserCheck,
                  title: 'Shift Handover Clarity',
                  desc: 'Shared context across nurses, doctors, and supervisors during transitions.',
                },
                {
                  icon: Building2,
                  title: 'Multi-Ward Operations',
                  desc: 'Track teams, beds, and medication compliance across departments.',
                },
              ].map((feature, i) => (
                <article key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                  <feature.icon className="h-8 w-8 text-sky-600" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-slate-600">{feature.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

      <section id="security" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div>
            <h2 className="font-['Space_Grotesk'] text-4xl font-bold text-slate-900">Security and compliance first</h2>
            <p className="mt-4 text-lg text-slate-600">
              Protect patient data with role-aware access, strict policy control, and end-to-end encrypted communication pathways.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                'Role-based clinical access',
                'Audit trail for critical actions',
                'Managed auth lifecycle',
                'Production-ready policy model',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-slate-700">
                  <Shield className="h-4 w-4 text-sky-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-slate-100">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Clinical readiness</p>
            <h3 className="mt-3 text-2xl font-semibold">Start your shift with confidence</h3>
            <p className="mt-3 text-slate-300">
              Access the portal to review reminders, acknowledge doses, and keep escalation response inside target SLA.
            </p>
            <button
              onClick={onLoginClick}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600"
            >
              Go To Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Hospital className="h-4 w-4" />
            <span>MediSync Pro</span>
          </div>
          <p>© 2026 MediSync Healthcare Solutions</p>
        </div>
      </footer>
    </div>
  );
};


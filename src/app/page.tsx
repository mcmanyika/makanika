import Link from "next/link";
import { Wrench, Shield, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-lg">
            M
          </div>
          <span className="text-xl font-bold">Makanika</span>
        </div>
        <Link href="/login">
          <Button variant="outlineDark">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Auto Repair Shop SaaS
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          Run your shop. Delight your customers.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Repair orders, estimates, invoices, appointments, and customer
          communication — built for American independent auto repair shops.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outlineDark">
              Create account
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Wrench,
              title: "Repair orders",
              desc: "Job cards from intake to pickup",
            },
            {
              icon: CreditCard,
              title: "Stripe payments",
              desc: "Secure checkout and payment links",
            },
            {
              icon: MessageSquare,
              title: "Messaging",
              desc: "Keep customers in the loop",
            },
            {
              icon: Shield,
              title: "Role-based access",
              desc: "Admin, mechanic, and customer roles",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-left"
            >
              <Icon className="mb-4 h-8 w-8 text-blue-400" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

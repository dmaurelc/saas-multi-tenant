'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                <span className="font-bold text-lg">S</span>
              </div>
              <span className="font-semibold text-lg">SaaS Multi</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-slate-600 hover:text-black transition-colors"
              >
                Features
              </a>
              <a
                href="#verticals"
                className="text-sm text-slate-600 hover:text-black transition-colors"
              >
                Verticals
              </a>
              <a
                href="#pricing"
                className="text-sm text-slate-600 hover:text-black transition-colors"
              >
                Pricing
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm text-slate-600 hover:text-black transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
        {/* Grid Pattern Background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Animated Gradient Blobs */}
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-linear-to-br from-blue-500/20 via-slate-500/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-linear-to-tr from-slate-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '6s', animationDelay: '2s' }}
        />

        {/* Glowing orb that follows mouse */}
        <div
          className="fixed w-64 h-64 bg-slate-400/10 rounded-full blur-3xl pointer-events-none transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 128}px, ${mousePosition.y - 128}px)`,
          }}
        />

        {/* Floating elements */}
        <div
          className="absolute top-1/4 left-10 w-20 h-20 border border-slate-200 rounded-2xl rotate-12 animate-float"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="absolute top-1/3 right-20 w-12 h-12 bg-slate-100 rounded-full animate-float"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-16 h-16 border border-slate-200 rounded-lg rotate-45 animate-float"
          style={{ animationDelay: '2s' }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge with glow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm mb-8 relative group">
              <div className="absolute inset-0 rounded-full bg-slate-400/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse relative" />
              <span className="text-sm text-slate-600 relative">v1.0.0 now available</span>
            </div>

            {/* Heading with gradient and glow */}
            <div className="relative">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                Build your SaaS.
                <br />
                <span className="text-slate-400">Ship faster.</span>
              </h1>
              {/* Text glow effect */}
              <div
                className="absolute -inset-4 bg-linear-to-r from-slate-400/10 via-slate-500/10 to-blue-500/10 blur-3xl opacity-50"
                style={{
                  transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
                }}
              />
            </div>

            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto">
              Multi-tenant platform with authentication, payments, and analytics. Everything you
              need to launch the next big thing.
            </p>

            {/* CTA Buttons with glow */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="group relative inline-flex items-center justify-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-slate-800 transition-all hover:scale-105"
              >
                <div className="absolute inset-0 rounded-full bg-linear-to-r from-slate-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                <span className="relative">Start building</span>
                <svg
                  className="w-4 h-4 relative group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/auth/login"
                className="group relative inline-flex items-center justify-center px-8 py-4 rounded-full font-medium border border-slate-300 hover:border-black hover:bg-black hover:text-white transition-all"
              >
                <span className="relative">View demo</span>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 pt-16 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-6">Powering next-gen companies</p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {['Acme', 'Stripe', 'Vercel', 'Linear'].map((company, i) => (
                  <span
                    key={i}
                    className="font-semibold text-lg text-slate-400 hover:text-black transition-colors cursor-default"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <span className="text-xs tracking-widest uppercase">Scroll</span>
            <div className="w-5 h-8 border-2 border-slate-300 rounded-full flex justify-center pt-1">
              <div className="w-1 h-2 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 bg-slate-50 relative">
        {/* Decorative line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-linear-to-b from-transparent via-slate-300 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mx-auto mb-20 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Everything you need.
              <br />
              <span className="text-slate-400">Nothing you don't.</span>
            </h2>
            <p className="text-xl text-slate-600">
              Build faster with our complete platform. All the features you need, none of the
              complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
                title: 'Authentication',
                desc: 'Magic links, OAuth, and JWT. Security built-in from day one.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                ),
                title: 'Multi-Tenant',
                desc: 'True multi-tenancy with Row-Level Security. Complete isolation.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                ),
                title: 'Payments',
                desc: 'Stripe, Transbank, MercadoPago. One integration, global coverage.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                ),
                title: 'Notifications',
                desc: 'In-app and email with user preferences. Keep users engaged.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                ),
                title: 'Analytics',
                desc: 'Real-time dashboards and KPI tracking. Know your numbers.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ),
                title: 'Team',
                desc: 'Invite members, manage roles. Built for teams from the start.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white p-8 rounded-2xl border border-slate-200 hover:border-black hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Unified glow effect */}
                <div className="absolute inset-0 bg-linear-to-br from-slate-100/50 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-xl mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-slate-100/50 to-transparent rounded-bl-3xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticals */}
      <section id="verticals" className="py-32 relative">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              One platform.
              <br />
              <span className="text-slate-400">Many industries.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                ),
                name: 'eCommerce',
                desc: 'Stores, inventory, orders, and payments.',
                status: '2025',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                ),
                name: 'Services',
                desc: 'Booking, scheduling, and appointments.',
                status: '2025',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                ),
                name: 'Real Estate',
                desc: 'Listings, tenants, and rent collection.',
                status: '2025',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                ),
                name: 'Restaurants',
                desc: 'Menus, reservations, and deliveries.',
                status: '2025',
              },
            ].map((v, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-3xl bg-slate-50 hover:bg-black hover:text-white transition-all duration-500 overflow-hidden"
              >
                {/* Unified glow */}
                <div className="absolute inset-0 bg-linear-to-br from-slate-200/50 via-blue-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 bg-white rounded-2xl group-hover:bg-white/10 transition-colors duration-500">
                      {v.icon}
                    </div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-200 group-hover:bg-white/20 transition-colors duration-500">
                      {v.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">{v.name}</h3>
                  <p className="text-slate-600 group-hover:text-slate-300 transition-colors duration-500">
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Simple pricing.
              <br />
              <span className="text-slate-400">No surprises.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '0',
                period: 'forever',
                features: ['1 user', '100 records', 'Core auth', 'Basic dashboard'],
                cta: 'Get started',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '29.000',
                period: '/month',
                features: [
                  '5 users',
                  '1,000 records',
                  'All Free features',
                  'Payments',
                  'Notifications',
                  'Priority support',
                ],
                cta: 'Start trial',
                highlight: true,
              },
              {
                name: 'Business',
                price: '79.000',
                period: '/month',
                features: [
                  '25 users',
                  '10,000 records',
                  'All Pro features',
                  'Advanced analytics',
                  'Custom integrations',
                  'Dedicated support',
                ],
                cta: 'Contact sales',
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`group relative p-8 rounded-3xl transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-black text-white shadow-2xl shadow-black/20 scale-105'
                    : 'bg-white border border-slate-200 hover:border-black hover:shadow-xl'
                }`}
              >
                {/* Unified glow for highlighted plan */}
                {plan.highlight && (
                  <div className="absolute inset-0 bg-linear-to-br from-slate-600/20 via-blue-500/10 to-transparent rounded-3xl blur-2xl" />
                )}

                <div className="relative">
                  <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span
                      className={`text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {plan.period}
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-3 text-sm">
                        <svg
                          className="w-5 h-5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/register"
                    className={`block text-center py-4 rounded-xl font-medium transition-all ${
                      plan.highlight
                        ? 'bg-white text-black hover:bg-slate-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-200/50 via-transparent to-transparent" />

        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to build?</h2>
          <p className="text-xl text-slate-600 mb-10">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/auth/register"
            className="group relative inline-flex items-center justify-center gap-3 bg-black text-white px-10 py-5 rounded-full font-medium text-lg hover:bg-slate-800 transition-all hover:scale-105"
          >
            {/* Unified glow effect */}
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-slate-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <span className="relative">Get started free</span>
            <svg
              className="w-5 h-5 relative group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white text-black flex items-center justify-center">
                  <span className="font-bold text-lg">S</span>
                </div>
                <span className="font-semibold text-lg">SaaS Multi</span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed">
                Build, launch, and scale your SaaS with our multi-tenant platform. Everything you
                need, nothing you don't.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#verticals" className="hover:text-white transition-colors">
                    Verticals
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
            <p>© {new Date().getFullYear()} SaaS Multi-Tenant</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Shield, TrendingUp, Lock, CheckCircle, Zap, Eye } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl" />

        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">ZKP Ledger</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Login
              </Link>
              <Link
                href="/register"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Prove Your Metrics
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Without Revealing Them
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              The first privacy-preserving platform for startups and investors.
              Prove your traction with zero-knowledge proofs, not spreadsheets.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register?role=founder"
                className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
              >
                <span className="flex items-center justify-center gap-2">
                  I'm a Founder
                  <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition" />
                </span>
              </Link>
              <Link
                href="/register?role=investor"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold text-lg transition border border-white/20"
              >
                <span className="flex items-center justify-center gap-2">
                  I'm an Investor
                  <Eye className="w-5 h-5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Privacy-First Fundraising
          </h2>
          <p className="text-gray-400 text-lg">
            Built on cryptographic proofs, not trust
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Zero-Knowledge Proofs
            </h3>
            <p className="text-gray-400">
              Prove "users &gt; 100K" without revealing you have exactly 127K users.
              Cryptographically verified, mathematically sound.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Blockchain Anchored
            </h3>
            <p className="text-gray-400">
              Every proof is anchored on-chain. Immutable, verifiable, and
              auditable by anyone, anytime.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Instant Verification
            </h3>
            <p className="text-gray-400">
              Investors see verified metrics instantly. No more waiting for
              due diligence. Trust, but verify—cryptographically.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Startups Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Featured Startups
          </h2>
          <p className="text-gray-400 text-lg">
            Real companies proving real metrics with zero-knowledge proofs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Startup Card 1 */}
          <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">TechFlow AI</h3>
                <p className="text-sm text-gray-400">AI Infrastructure</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">ZK Verified</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Building next-gen AI infrastructure for enterprise applications
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Users</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; 100K</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Revenue</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; $1M ARR</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Startup Card 2 */}
          <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">DataVault</h3>
                <p className="text-sm text-gray-400">Privacy Tech</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">ZK Verified</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Secure data storage with cryptographic guarantees
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Growth Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; 20% MoM</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Customers</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; 500</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Startup Card 3 */}
          <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition hover:shadow-xl hover:shadow-purple-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">CloudScale</h3>
                <p className="text-sm text-gray-400">DevOps Platform</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">ZK Verified</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Automated deployment and scaling for modern applications
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Active Users</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; 50K</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Deployments</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">&gt; 1M/mo</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Founders Submit Metrics
                </h3>
                <p className="text-gray-400">
                  Upload your traction data. Set thresholds you want to prove (e.g., "revenue &gt; $1M").
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  ZK Proof Generated
                </h3>
                <p className="text-gray-400">
                  Our system generates a cryptographic proof using Groth16. The actual value stays encrypted.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Investors Verify
                </h3>
                <p className="text-gray-400">
                  Investors see "✓ ZK Verified" badges. Click to view the on-chain proof. No spreadsheets needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/30">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Raise with Privacy?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the future of fundraising. Prove your metrics, protect your data.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-purple-500/50"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>© 2024 ZKP Ledger. Built with zero-knowledge proofs.</p>
        </div>
      </footer>
    </div>
  );
}

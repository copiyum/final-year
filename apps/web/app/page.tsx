'use client';

import Link from 'next/link';
import { Shield, TrendingUp, Eye, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import { LockIcon, CubeIcon, ZapIcon } from '@/components/icons';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      {/* Hero Section */}
      <div
        className="relative w-full bg-black overflow-hidden min-h-screen flex flex-col group"
        onMouseMove={(e) => {
          const { left, top } = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - left}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - top}px`);
        }}
      >
        {/* Animated Background Grid - Base Layer */}
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
          animate={{
            backgroundPosition: ["0px 0px", "-24px -24px"]
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "linear"
          }}
        />

        {/* Hover Spotlight Grid - Reveal Layer */}
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5_1px,transparent_1px),linear-gradient(to_bottom,#4f46e5_1px,transparent_1px)] bg-[size:24px_24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            maskImage: `radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
            WebkitMaskImage: `radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
          }}
          animate={{
            backgroundPosition: ["0px 0px", "-24px -24px"]
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "linear"
          }}
        />

        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>

        <nav className="relative container mx-auto px-6 py-6 flex items-center justify-between z-50">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-white" />
            <span className="text-xl font-bold text-white tracking-tight">ZKP Ledger</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
              Login
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-full font-medium transition-colors text-sm"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <div className="relative z-20 container mx-auto px-6 flex-grow flex flex-col justify-center items-center text-center -mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm mb-8 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            New: Investor API is now live
            <ArrowRight className="w-4 h-4" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter"
          >
            Prove Your Metrics
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 to-zinc-500">
              Without Revealing Them
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            The first privacy-preserving platform for startups and investors.
            Prove your traction with zero-knowledge proofs, not spreadsheets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/register?role=founder"
              className="group px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              I'm a Founder
              <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/register?role=investor"
              className="px-8 py-4 bg-black border border-zinc-800 hover:border-zinc-600 text-white rounded-full font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              I'm an Investor
              <Eye className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-6 py-24 bg-black border-t border-zinc-900">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Privacy-First Fundraising
          </h2>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Built on cryptographic proofs, not trust. We use zero-knowledge proofs to verify metrics without revealing the underlying data.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group p-8 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 rounded-3xl transition-all hover:bg-zinc-900/50"
          >
            <div className="w-16 h-16 mb-6 relative">
              <LockIcon className="w-full h-full drop-shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Zero-Knowledge Proofs
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Prove "users &gt; 100K" without revealing you have exactly 127K users.
              Cryptographically verified, mathematically sound.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group p-8 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 rounded-3xl transition-all hover:bg-zinc-900/50"
          >
            <div className="w-16 h-16 mb-6 relative">
              <CubeIcon className="w-full h-full drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Blockchain Anchored
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Every proof is anchored on-chain. Immutable, verifiable, and
              auditable by anyone, anytime.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group p-8 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 rounded-3xl transition-all hover:bg-zinc-900/50"
          >
            <div className="w-16 h-16 mb-6 relative">
              <ZapIcon className="w-full h-full drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Instant Verification
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Investors see verified metrics instantly. No more waiting for
              due diligence. Trust, but verify—cryptographically.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Featured Startups Section */}
      <div className="relative z-10 container mx-auto px-6 py-24 bg-black border-t border-zinc-900">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Trusted by Industry Leaders
          </h2>
          <p className="text-zinc-500 text-lg">
            Real companies proving real metrics with zero-knowledge proofs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Startup Card 1 */}
          <div className="group p-6 bg-zinc-900/20 border border-zinc-800 hover:border-zinc-600 transition-all rounded-2xl hover:bg-zinc-900/40">
            {/* Content same as before but wrapped if needed, keeping simple for now */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">TechFlow AI</h3>
                <p className="text-sm text-zinc-500">AI Infrastructure</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold">ZK Verified</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Users</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; 100K</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Revenue</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; $1M ARR</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>
          {/* Startup Card 2 */}
          <div className="group p-6 bg-zinc-900/20 border border-zinc-800 hover:border-zinc-600 transition-all rounded-2xl hover:bg-zinc-900/40">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">DataVault</h3>
                <p className="text-sm text-zinc-500">Privacy Tech</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold">ZK Verified</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Growth Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; 20% MoM</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Customers</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; 500</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Startup Card 3 */}
          <div className="group p-6 bg-zinc-900/20 border border-zinc-800 hover:border-zinc-600 transition-all rounded-2xl hover:bg-zinc-900/40">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">CloudScale</h3>
                <p className="text-sm text-zinc-500">DevOps Platform</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold">ZK Verified</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Active Users</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; 50K</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-black/50 rounded-lg border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <span className="text-zinc-400">Deployments</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">&gt; 1M/mo</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 container mx-auto px-6 py-24 bg-black border-t border-zinc-900" ref={containerRef}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-16 text-center tracking-tight">
            How It Works
          </h2>

          <div className="relative space-y-24">
            {/* Animated Vertical Line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-zinc-800 md:left-1/2 md:-ml-px overflow-hidden">
              <motion.div
                style={{ height: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]) }}
                className="w-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]"
              />
            </div>

            <TimelineItem
              number="1"
              title="Founders Submit Metrics"
              description="Upload your traction data. Set thresholds you want to prove (e.g., 'revenue > $1M')."
              align="left"
            />

            <TimelineItem
              number="2"
              title="ZK Proof Generated"
              description="Our system generates a cryptographic proof using Groth16. The actual value stays encrypted."
              align="right"
              highlight
            />

            <TimelineItem
              number="3"
              title="Investors Verify"
              description="Investors see '✓ ZK Verified' badges. Click to view the on-chain proof. No spreadsheets needed."
              align="left"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-6 py-24 bg-black border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center bg-zinc-900/30 rounded-3xl p-16 border border-zinc-800">
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Ready to Raise with Privacy?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join the future of fundraising. Prove your metrics, protect your data.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-white text-black hover:bg-zinc-200 rounded-full font-semibold text-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 py-12 bg-black">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-white" />
              <span className="text-lg font-bold text-white tracking-tight">ZKP Ledger</span>
            </div>
            <div className="flex space-x-8 text-sm text-zinc-500">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
            </div>
          </div>
          <div className="mt-8 text-center md:text-left text-zinc-600 text-sm">
            <p>© 2024 ZKP Ledger. Built with zero-knowledge proofs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TimelineItem({ number, title, description, align, highlight = false }: { number: string, title: string, description: string, align: 'left' | 'right', highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col md:flex-row gap-8 items-center"
    >
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border z-10 md:absolute md:left-1/2 md:-ml-6 ${highlight ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5)]' : 'bg-black text-white border-zinc-700'}`}>
        {number}
      </div>

      <div className={`md:w-1/2 ${align === 'left' ? 'md:text-right md:pr-16 md:mr-auto' : 'md:text-left md:pl-16 md:ml-auto'}`}>
        <h3 className="text-2xl font-bold text-white mb-2">
          {title}
        </h3>
        <p className="text-zinc-400 leading-relaxed text-lg">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

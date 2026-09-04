import React, { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Home,
  Shield,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import logoImage from "../assets/a50520d040d7cd75938aa9ef0a9e11b29117b932.png";

interface HomePageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/** The house entrance: rise a little, fade in, decelerate. */
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/** Children of a stagger container inherit `rise` and arrive in sequence. */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const inViewOnce = { once: true, amount: 0.05 } as const;

/**
 * A figure that counts up the first time it is scrolled into view. Static for
 * anyone who has asked the OS to reduce motion.
 */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, to]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

export function HomePage({ onGetStarted, onSignIn }: HomePageProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // The hero art drifts up and dims slightly as the page moves under it.
  const artY = useTransform(scrollY, [0, 600], [0, -70]);
  const artOpacity = useTransform(scrollY, [0, 520], [1, 0.35]);

  const features = [
    {
      icon: Home,
      title: "Property Management",
      description:
        "Seamlessly manage multiple properties and tenants in one place",
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description:
        "Track rent payments with secure and transparent transactions",
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Stay informed with instant notifications and updates",
    },
    {
      icon: Users,
      title: "Easy Communication",
      description: "Connect with landlords or tenants effortlessly",
    },
  ];

  const benefits = [
    "Digital lease agreements",
    "Complaint tracking system",
    "Utility management",
    "Payment reminders",
    "Property maintenance logs",
    "Document storage",
  ];

  const stats = [
    { to: 10, suffix: "K+", label: "Properties" },
    { to: 25, suffix: "K+", label: "Users" },
    { to: 98, suffix: "%", label: "Satisfaction" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b1f] text-white">
      {/* Ambient light. Three out-of-focus colour fields drifting behind the
          page - the depth that a flat brand-colour fill cannot give. */}
      <div className="ambient fixed" aria-hidden>
        <div className="ambient-blob animate-aurora h-[46rem] w-[46rem] -top-56 -left-40 bg-[#2e3a8c] opacity-60" />
        <div
          className="ambient-blob animate-aurora h-[38rem] w-[38rem] top-[30%] -right-40 bg-[#4abdac] opacity-25"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="ambient-blob animate-aurora h-[34rem] w-[34rem] bottom-0 left-[20%] bg-[#ff914d] opacity-[0.18]"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      {/* Navigation. Transparent over the top of the page, then it frosts and
          grows a hairline once content starts sliding underneath it. */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50"
      >
        <div
          className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled
              ? "bg-[#080b1f]/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/10"
              : "bg-transparent border-b border-transparent"
          }`}
        >
          <nav className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <motion.img
                src={logoImage}
                alt="Aavas Logo"
                className="h-10"
                whileHover={{ scale: 1.06, rotate: -3 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
              />
              <span className="text-xl font-aavas tracking-tight">Aavas</span>
            </div>
            <Button
              onClick={onSignIn}
              variant="outline"
              className="rounded-full material-dark bg-white/10 text-white hover:bg-white/20"
            >
              Sign In
            </Button>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-4 pt-14 pb-24 lg:pt-20 lg:pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={rise} className="inline-block">
              <span className="material-dark inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-white/85">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4abdac] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4abdac]" />
                </span>
                India&rsquo;s modern rental platform
              </span>
            </motion.div>

            <motion.h1
              variants={rise}
              className="text-5xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance lg:text-7xl"
            >
              Simplify your
              <br />
              <span className="gradient-text bg-gradient-to-r from-[#f4eedf] via-[#9fe3d9] to-[#4abdac]">
                rental experience
              </span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="max-w-xl text-lg leading-relaxed text-white/65 lg:text-xl"
            >
              Connect landlords and tenants on a unified platform. Manage
              properties, track payments, and communicate seamlessly&mdash;all
              in one place.
            </motion.p>

            <motion.div variants={rise} className="flex flex-wrap gap-3">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="group rounded-full bg-white text-[#2e3a8c] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.6)] hover:bg-white"
              >
                Get Started
                <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full material-dark bg-white/10 text-white hover:bg-white/20"
              >
                Learn More
              </Button>
            </motion.div>

            <motion.dl
              variants={rise}
              className="grid max-w-lg grid-cols-3 gap-8 border-t border-white/10 pt-8"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
                    <CountUp to={stat.to} suffix={stat.suffix} />
                  </dd>
                  <p className="mt-1 text-sm text-white/50">{stat.label}</p>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* Hero art: the mark floating on its own pool of light. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ y: artY, opacity: artOpacity }}
            className="relative hidden items-center justify-center lg:flex"
          >
            <div className="absolute h-80 w-80 rounded-full bg-gradient-to-br from-[#4abdac]/40 to-[#f4eedf]/20 blur-[80px]" />
            <div className="material-dark relative grid h-[26rem] w-[26rem] place-items-center rounded-[3rem] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
              <motion.img
                src={logoImage}
                alt=""
                aria-hidden
                className="h-56 drop-shadow-2xl"
                animate={{ y: [0, -14, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 border-t border-white/[0.07] bg-white/[0.02]">
        <div className="container mx-auto px-4 py-24">
          <motion.div
            variants={rise}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <h2 className="text-4xl font-semibold tracking-[-0.03em] lg:text-5xl">
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Powerful features for both landlords and tenants
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={rise}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className="material-dark group rounded-3xl p-7 transition-colors duration-300 hover:bg-white/[0.14]"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#4abdac] to-[#f4eedf] shadow-lg transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6">
                  <feature.icon className="h-6 w-6 text-[#1b2350]" />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.02em]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 container mx-auto px-4 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
            className="space-y-6"
          >
            <motion.h2
              variants={rise}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl font-semibold tracking-[-0.03em] lg:text-5xl"
            >
              Built for India&rsquo;s{" "}
              <span className="gradient-text bg-gradient-to-r from-[#f4eedf] to-[#4abdac]">
                rental market
              </span>
            </motion.h2>
            <motion.p
              variants={rise}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl text-lg leading-relaxed text-white/60"
            >
              Designed specifically for Indian landlords and tenants, with the
              features that matter most in the local rental ecosystem.
            </motion.p>
            <motion.div
              variants={rise}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button
                onClick={onGetStarted}
                size="lg"
                className="rounded-full bg-gradient-to-r from-[#4abdac] to-[#a9e5da] text-[#1b2350] hover:opacity-95"
              >
                Start Your Journey
              </Button>
            </motion.div>
          </motion.div>

          <motion.ul
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {benefits.map((benefit) => (
              <motion.li
                key={benefit}
                variants={rise}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 4 }}
                className="material-dark flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors duration-300 hover:bg-white/[0.14]"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4abdac]" />
                <span className="text-sm text-white/85">{benefit}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative z-10 container mx-auto px-4 pb-24">
        <motion.div
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={inViewOnce}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="material-dark relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center"
        >
          <div
            className="ambient-blob absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 bg-[#4abdac] opacity-25"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-4xl font-semibold tracking-[-0.03em] lg:text-5xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
              Join thousands of landlords and tenants who trust Aavas for their
              rental needs.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="mt-8 rounded-full bg-white text-[#2e3a8c] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.6)] hover:bg-white"
            >
              Create Free Account
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.07] py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-white/50 md:flex-row">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="" aria-hidden className="h-6" />
            <span className="font-aavas">
              &copy; 2025 Aavas. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((item) => (
              <button
                key={item}
                className="-mx-2 rounded-lg px-2 py-3 transition-colors duration-200 hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

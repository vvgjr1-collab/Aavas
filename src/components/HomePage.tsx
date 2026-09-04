import React from "react";
import { motion } from "motion/react";
import {
  Building2,
  Home,
  Shield,
  Clock,
  ChevronRight,
  CheckCircle2,
  Users,
  Star,
  TrendingUp,
  Menu,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import logoImage from "../assets/a50520d040d7cd75938aa9ef0a9e11b29117b932.png";

interface HomePageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function HomePage({
  onGetStarted,
  onSignIn,
}: HomePageProps) {
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
      description:
        "Stay informed with instant notifications and updates",
    },
    {
      icon: Users,
      title: "Easy Communication",
      description:
        "Connect with landlords or tenants effortlessly",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2e3a8c] via-[#1e2870] to-[#0f1540] text-white overflow-hidden">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-16"
        >
          <div className="flex items-center gap-3">
            <motion.img
              src={logoImage}
              alt="Aavas Logo"
              className="h-12"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <span className="text-2xl font-aavas">Aavas</span>
          </div>
          <Button
            onClick={onSignIn}
            variant="outline"
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            Sign In
          </Button>
        </motion.nav>

        {/* Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="inline-block">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm"
              >
                ✨ India's Modern Rental Platform
              </motion.div>
            </div>

            <h1 className="text-5xl lg:text-6xl leading-tight">
              Simplify Your{" "}
              <span className="bg-gradient-to-r from-[#f4eedf] to-[#4abdac] bg-clip-text text-transparent">
                Rental Experience
              </span>
            </h1>

            <p className="text-xl text-white/80 leading-relaxed">
              Connect landlords and tenants on a unified
              platform. Manage properties, track payments, and
              communicate seamlessly—all in one place.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="bg-white text-[#2e3a8c] hover:bg-white/90 group"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
              <div>
                <div className="text-3xl">10K+</div>
                <div className="text-white/60 text-sm">
                  Properties
                </div>
              </div>
              <div>
                <div className="text-3xl">25K+</div>
                <div className="text-white/60 text-sm">
                  Users
                </div>
              </div>
              <div>
                <div className="text-3xl">98%</div>
                <div className="text-white/60 text-sm">
                  Satisfaction
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Logo showcase */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-r from-[#4abdac]/20 to-[#f4eedf]/20 blur-3xl rounded-full"
              />
              <motion.img
                src={logoImage}
                alt="Aavas Logo"
                className="relative h-80 drop-shadow-2xl"
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl mb-4">
              Everything You Need
            </h2>
            <p className="text-white/70 text-lg">
              Powerful features for both landlords and tenants
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group"
              >
                <div className="h-12 w-12 bg-gradient-to-br from-[#4abdac] to-[#f4eedf] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-[#2e3a8c]" />
                </div>
                <h3 className="text-xl mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/60">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl">
              Built for India's{" "}
              <span className="bg-gradient-to-r from-[#f4eedf] to-[#4abdac] bg-clip-text text-transparent">
                Rental Market
              </span>
            </h2>
            <p className="text-white/70 text-lg">
              Designed specifically for Indian landlords and
              tenants with features that matter most in the
              local rental ecosystem.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-gradient-to-r from-[#4abdac] to-[#f4eedf] text-[#2e3a8c] hover:opacity-90"
            >
              Start Your Journey
            </Button>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-[#4abdac] flex-shrink-0" />
                <span className="text-sm">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-[#4abdac]/20 to-[#f4eedf]/20 backdrop-blur-sm border border-white/20 rounded-3xl p-12 text-center"
        >
          <h2 className="text-4xl mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of landlords and tenants who trust
            Aavas for their rental needs.
          </p>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-white text-[#2e3a8c] hover:bg-white/90"
          >
            Create Free Account
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <img
                src={logoImage}
                alt="Aavas"
                className="h-6"
              />
              <span className="font-aavas">
                © 2025 Aavas. All rights reserved.
              </span>
            </div>
            <div className="flex gap-6">
              <button className="hover:text-white transition-colors">
                Privacy
              </button>
              <button className="hover:text-white transition-colors">
                Terms
              </button>
              <button className="hover:text-white transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
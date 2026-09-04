import React from 'react';
import { motion } from 'motion/react';
import { Home, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import logoImage from '../assets/9916df943b90f5078a96ced9635c98fd96bc1655.png';

interface RoleSelectionProps {
  userName: string;
  onRoleSelect: (role: 'tenant' | 'landlord') => void;
  onBack: () => void;
}

export function RoleSelection({ userName, onRoleSelect, onBack }: RoleSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
      </motion.div>
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <img src={logoImage} alt="Aavas" className="h-12" />
          <span className="text-3xl font-aavas">Aavas</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-semibold mb-3"
        >
          Welcome, {userName}!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg text-muted-foreground"
        >
          Choose how you'd like to use our platform
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tenant Option */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="group cursor-pointer"
          onClick={() => onRoleSelect('tenant')}
        >
          <Card className="h-full border-2 border-transparent hover:border-[#2C7A7B]/50 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-br from-[#FFFBDE]/30 to-[#f4eedf]/50 dark:from-[#2C7A7B]/20 dark:to-[#2C7A7B]/10">
            <CardHeader className="text-center pb-6">
              <motion.div
                className="w-20 h-20 bg-[#2C7A7B] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#234E52] transition-colors duration-300"
                whileHover={{ rotate: 10 }}
              >
                <Home className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl text-[#2C7A7B] dark:text-[#3D9B9D]">
                I'm a tenant
              </CardTitle>
              <CardDescription className="text-lg">
                Manage your dream rental home
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tenant-accent-dark)' }}></div>
                  <span>Communicate with your landlord</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tenant-accent-dark)' }}></div>
                  <span>Register complaints</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tenant-accent-dark)' }}></div>
                  <span>Pay rent on time</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tenant-accent-dark)' }}></div>
                  <span>Book services in an instant</span>
                </li>
              </ul>
              
              <div className="pt-4">
                <Button 
                  className="w-full bg-[#2C7A7B] hover:bg-[#234E52] text-white group-hover:translate-x-1 transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoleSelect('tenant');
                  }}
                >
                  Continue as Tenant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Landlord Option */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="group cursor-pointer"
          onClick={() => onRoleSelect('landlord')}
        >
          <Card className="h-full border-2 border-transparent hover:border-[#2e3a8c]/50 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-br from-[#f4eedf]/30 to-[#f4eedf]/50 dark:from-[#2e3a8c]/20 dark:to-[#2e3a8c]/10">
            <CardHeader className="text-center pb-6">
              <motion.div
                className="w-20 h-20 bg-[#2e3a8c] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#1f2861] transition-colors duration-300"
                whileHover={{ rotate: -10 }}
              >
                <Building2 className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl text-[#2e3a8c] dark:text-[#4a5bb0]">
                I want to manage my properties
              </CardTitle>
              <CardDescription className="text-lg">
                Manage your rental properties
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#ff914d] rounded-full"></div>
                  <span>Address complaints</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#ff914d] rounded-full"></div>
                  <span>Manage rent</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#ff914d] rounded-full"></div>
                  <span>Manage utilities</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#ff914d] rounded-full"></div>
                  <span>Keep track of your properties wellbeing</span>
                </li>
              </ul>
              
              <div className="pt-4">
                <Button 
                  className="w-full bg-[#2e3a8c] hover:bg-[#1f2861] text-white group-hover:translate-x-1 transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoleSelect('landlord');
                  }}
                >
                  Continue as Landlord
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-center mt-8"
      >
        <p className="text-sm text-muted-foreground">
          Don't worry, you can always switch between roles in your account settings
        </p>
      </motion.div>
    </motion.div>
  );
}
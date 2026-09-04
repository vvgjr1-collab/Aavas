import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, User, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import logoImage from '../assets/9916df943b90f5078a96ced9635c98fd96bc1655.png';
import { toast } from 'sonner';

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface SignUpFormProps {
  onSwitchToLogin: () => void;
  onAuthSuccess: (data: { name: string; email: string }) => void;
  onBack?: () => void;
  onGuestLogin?: () => void;
}

export function SignUpForm({ onSwitchToLogin, onAuthSuccess, onBack, onGuestLogin }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<SignUpFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const watchedFields = watch();
  const password = watch('password');

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setSignupError('');
    
    // Simulate API call
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Mock validation - reject if email already exists
          if (data.email === 'demo@exists.com') {
            reject(new Error('Email already exists'));
          } else {
            resolve(data);
          }
        }, 1500);
      });
      
      // Success - pass user data to parent
      onAuthSuccess({ name: data.name, email: data.email });
    } catch (error) {
      setSignupError('Email already exists. Please try a different email or sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto relative"
    >
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onBack}
          className="absolute -top-16 left-0 flex items-center gap-2 text-[#2e3a8c] hover:text-[#2e3a8c]/80 transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Home</span>
        </motion.button>
      )}
      <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-3 mx-auto mb-4"
          >
            <img src={logoImage} alt="Aavas" className="h-12" />
            <span className="text-3xl font-aavas">Aavas</span>
          </motion.div>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Enter your information to create your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {signupError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{signupError}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: 'Full name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      className={`pl-10 transition-all duration-200 ${
                        errors.name ? 'border-destructive focus:border-destructive' : ''
                      } ${watchedFields.name ? 'border-primary' : ''}`}
                    />
                  )}
                />
              </div>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.name.message}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className={`pl-10 transition-all duration-200 ${
                        errors.email ? 'border-destructive focus:border-destructive' : ''
                      } ${watchedFields.email ? 'border-primary' : ''}`}
                    />
                  )}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      className={`pl-10 pr-10 transition-all duration-200 ${
                        errors.password ? 'border-destructive focus:border-destructive' : ''
                      } ${watchedFields.password ? 'border-primary' : ''}`}
                    />
                  )}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Controller
                  name="confirmPassword"
                  control={control}
                  rules={{
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className={`pl-10 pr-10 transition-all duration-200 ${
                        errors.confirmPassword ? 'border-destructive focus:border-destructive' : ''
                      } ${watchedFields.confirmPassword ? 'border-primary' : ''}`}
                    />
                  )}
                />
                <button
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.confirmPassword.message}
                </motion.p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Controller
                name="agreeToTerms"
                control={control}
                rules={{
                  required: 'You must agree to the terms and conditions',
                }}
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    id="agreeToTerms"
                    checked={value}
                    onCheckedChange={onChange}
                    className="mt-1"
                  />
                )}
              />
              <div className="flex-1">
                <Label
                  htmlFor="agreeToTerms"
                  className="text-sm cursor-pointer select-none leading-5"
                >
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => toast.info('Terms and conditions coming soon!')}
                  >
                    Terms and Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => toast.info('Privacy policy coming soon!')}
                  >
                    Privacy Policy
                  </button>
                </Label>
                {errors.agreeToTerms && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive mt-1"
                  >
                    {errors.agreeToTerms.message}
                  </motion.p>
                )}
              </div>
            </div>

            <motion.div
              whileTap={{ scale: 0.98 }}
              className="pt-2"
            >
              <Button
                type="submit"
                className="w-full relative overflow-hidden transition-all duration-300"
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    <span>Creating account...</span>
                  </motion.div>
                ) : (
                  'Create account'
                )}
              </Button>
            </motion.div>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-primary hover:underline transition-all duration-200"
              >
                Sign in
              </button>
            </p>
          </div>

          {onGuestLogin && (
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Or continue as a{' '}
                <button
                  onClick={onGuestLogin}
                  className="text-primary hover:underline transition-all duration-200"
                >
                  guest
                </button>
              </p>
            </div>
          )}

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Demo tip: Use any email except "demo@exists.com" to test success flow
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
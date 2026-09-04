import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import logoImage from '../assets/9916df943b90f5078a96ced9635c98fd96bc1655.png';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
  /** Throws with a message worth showing when the credentials are refused. */
  onSubmitCredentials: (input: { email: string; password: string }) => Promise<void>;
  onBack?: () => void;
  onGuestLogin?: () => void;
}

export function LoginForm({ onSwitchToSignup, onSubmitCredentials, onBack, onGuestLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const watchedFields = watch();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError('');

    try {
      await onSubmitCredentials({ email: data.email, password: data.password });
      // Navigation is the caller's job; on success this form just unmounts.
    } catch (error) {
      // The message is already phrased for a person - see friendlyAuthError.
      setLoginError(
        error instanceof Error ? error.message : 'Could not sign in. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto relative"
    >
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onBack}
          className="absolute -top-16 left-0 -m-2 flex min-h-11 items-center gap-2 rounded-xl p-2 text-[#2e3a8c] hover:text-[#2e3a8c]/80 transition-colors duration-200 group"
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
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loginError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className={`pl-10 pr-11 transition-all duration-200 ${
                        errors.password ? 'border-destructive focus:border-destructive' : ''
                      } ${watchedFields.password ? 'border-primary' : ''}`}
                    />
                  )}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
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

            <div className="flex items-center justify-between">
              <div className="flex min-h-11 items-center gap-2.5">
                <Controller
                  name="rememberMe"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Checkbox
                      className="size-5"
                      id="rememberMe"
                      checked={value}
                      onCheckedChange={onChange}
                    />
                  )}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm cursor-pointer select-none"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                className="-mx-2 -my-3 rounded-lg px-2 py-3 text-sm text-primary transition-all duration-200 hover:underline"
                onClick={() => toast.info('Forgot password feature coming soon!')}
              >
                Forgot password?
              </button>
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
                    <span>Signing in...</span>
                  </motion.div>
                ) : (
                  'Sign in'
                )}
              </Button>
            </motion.div>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-sm font-medium text-primary hover:underline transition-all duration-200"
              >
                Sign up
              </button>
            </p>
          </div>

          {onGuestLogin && (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Or continue as a guest{' '}
                <button
                  onClick={onGuestLogin}
                  className="text-sm font-medium text-primary hover:underline transition-all duration-200"
                >
                  Guest login
                </button>
              </p>
            </div>
          )}

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              New here? Create an account, then confirm your email before signing in.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
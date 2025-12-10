import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { confirmSignUp } from 'aws-amplify/auth'; // Import direct for the quick fix

interface LoginFormProps {
  mode: 'signin' | 'signup';
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
  const { login, register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const result = await login({ 
            username: data.email, 
            password: data.password 
        });
        
        if (result.isSignedIn) {
            toast.success("ACCESS GRANTED");
            // App.tsx will handle redirect via context state change
        } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
             // Handle case where user exists but isn't verified
             handleVerification(data.email);
        }
      } else {
        // Sign Up Mode
        const { nextStep } = await registerUser({
            username: data.email,
            password: data.password,
            options: {
                userAttributes: {
                    email: data.email // Required for standard Cognito config
                }
            }
        });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            toast.success("Account created. Verification code sent.");
            handleVerification(data.email);
        } else if (nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
             toast.success("Account created successfully!");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Temporary helper to handle verification without a full UI page yet
  const handleVerification = async (email: string) => {
    const code = window.prompt(`Enter the verification code sent to ${email}:`);
    if (!code) return;
    
    try {
        await confirmSignUp({ username: email, confirmationCode: code });
        toast.success("Verified! Please sign in.");
        // Optional: Switch mode to 'signin' via parent prop if we lifted state up
        // For now, user just clicks "Have ID?"
    } catch (err: any) {
        toast.error(`Verification failed: ${err.message}`);
    }
  };

  return (
    <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-mono font-semibold text-ghost mb-2">Email</label>
        <Input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
          className="w-full"
          placeholder="you@example.com"
          disabled={isLoading}
        />
        {errors.email && <span className="text-destructive text-xs mt-1">{errors.email.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-semibold font-mono text-ghost mb-2">Password</label>
        <Input
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          className="w-full"
          placeholder="••••••••"
          disabled={isLoading}
        />
        {errors.password && <span className="text-destructive text-xs mt-1">{errors.password.message}</span>}
      </div>

      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-semibold text-ghost mb-2">Confirm Password</label>
          <Input
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
            className="w-full"
            placeholder="••••••••"
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <span className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-ghost-dim" />
          <span className="text-sm text-ghost/70">Remember me</span>
        </label>
        {mode === 'signin' && (
          <a href="#" className="text-sm text-sentinel hover:text-sentinel/80 font-semibold transition-colors">
            Forgot password?
          </a>
        )}
      </div>

      <Button type="submit" className="w-full mt-4 font-sans" disabled={isLoading}>
        {isLoading 
            ? <span className="animate-pulse">PROCESSING...</span> 
            : (mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT')
        }
      </Button>
    </form>
  );
};
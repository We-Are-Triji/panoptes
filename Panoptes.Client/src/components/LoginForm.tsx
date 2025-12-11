import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'; // Added generic icons
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'; // Added resend import

interface LoginFormProps {
  mode: 'signin' | 'signup';
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
  code?: string; // Added code to form values
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
  const { login, register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Local state for UI toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State to handle verification view
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    // If we are already in verification mode, don't run the standard login logic
    if (isVerifying) {
      handleFinalVerification(data);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const result = await login({
          username: data.email,
          password: data.password
        });

        if (result.isSignedIn) {
          toast.success("ACCESS GRANTED");
        } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          // Switch to verification UI instead of prompt
          setIsVerifying(true);
          toast("Identity verification required.");
        }
      } else {
        const { nextStep } = await registerUser({
          username: data.email,
          password: data.password,
          options: {
            userAttributes: {
              email: data.email
            }
          }
        });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          toast.success("Credentials accepted. Awaiting verification.");
          setIsVerifying(true);
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

  // The new handle verification logic using the UI input
  const handleFinalVerification = async (data: FormValues) => {
    if (!data.code) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await confirmSignUp({ username: data.email, confirmationCode: data.code });
      toast.success("Identity Verified. Accessing system...");

      // If mode was signin, we might need to re-login or the flow might auto-complete depending on config.
      // Usually, after verify, we attempt login again automatically:
      const result = await login({ username: data.email, password: data.password });
      if (result.isSignedIn) toast.success("ACCESS GRANTED");

    } catch (err: any) {
      toast.error(`Verification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = getValues('email');
    if (!email) return;

    try {
      await resendSignUpCode({ username: email });
      toast.success("New code sequence transmitted.");
    } catch (err: any) {
      toast.error("Transmission failed.");
    }
  }

  // Reusable style for all inputs
  const inputClasses = "w-full bg-transparent border-b border-white/20 py-2 text-sm text-white font-mono placeholder-white/20 focus:border-sentinel focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>

      {/* ================= VERIFICATION MODE ================= */}
      {isVerifying ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-sentinel/10 flex items-center justify-center border border-sentinel/20 text-sentinel mb-4">
              <KeyRound size={20} />
            </div>
            <h3 className="text-white font-mono uppercase tracking-widest text-sm">Verification Required</h3>
            <p className="text-ghost/60 text-[10px] font-mono">
              Enter the sequence sent to <span className="text-white">{watch('email')}</span>
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
              SECURE_CODE
            </label>
            <input
              type="text"
              {...register('code', { required: "Verification code is required" })}
              className={`${inputClasses} tracking-[0.5em] text-center font-bold text-lg`}
              placeholder="123456"
              maxLength={6}
              autoFocus
              disabled={isLoading}
            />
            {errors.code && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.code.message}</span>}
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Button
              type="submit"
              className="w-full bg-sentinel hover:bg-sentinel/90 text-black font-mono tracking-widest text-xs py-6"
              disabled={isLoading}
            >
              {isLoading ? <span className="animate-pulse">VERIFYING...</span> : 'CONFIRM_SEQUENCE'}
            </Button>

            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="text-[10px] font-mono text-ghost/60 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={12} /> RETURN
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                className="text-[10px] font-mono text-sentinel hover:text-white transition-colors"
              >
                RESEND_SEQUENCE
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STANDARD LOGIN/SIGNUP MODE ================= */
        <>
          {/* --- Email Field --- */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
              ID_SEQUENCE (EMAIL)
            </label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email address',
                },
              })}
              className={inputClasses}
              placeholder="user@panoptes.net"
              disabled={isLoading}
            />
            {errors.email && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.email.message}</span>}
          </div>

          {/* --- Password Field --- */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
              ACCESS_KEY
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                className={`${inputClasses} pr-10`}
                placeholder="••••••••"
                disabled={isLoading}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-ghost/40 hover:text-sentinel transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.password.message}</span>}
          </div>

          {/* --- Confirm Password (Signup Only) --- */}
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
                CONFIRM_KEY
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === watch('password') || 'Passwords do not match',
                  })}
                  className={`${inputClasses} pr-10`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-ghost/40 hover:text-sentinel transition-colors focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.confirmPassword.message}</span>
              )}
            </div>
          )}

          {/* --- Footer Actions --- */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer sr-only" disabled={isLoading} />
                <div className="h-3 w-3 border border-ghost/40 rounded-sm bg-transparent peer-checked:bg-sentinel peer-checked:border-sentinel transition-all" />
              </div>
              <span className="text-[10px] font-mono text-ghost/60 group-hover:text-white transition-colors">REMEMBER_SESSION</span>
            </label>

            {mode === 'signin' && (
              <a href="#" className="text-[10px] font-mono text-sentinel hover:text-white transition-colors">
                LOST_KEY?
              </a>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 bg-sentinel hover:bg-sentinel/90 text-black font-mono tracking-widest text-xs py-6"
            disabled={isLoading}
          >
            {isLoading
              ? <span className="animate-pulse">PROCESSING...</span>
              : (mode === 'signin' ? 'INITIATE_LINK' : 'REGISTER_UNIT')
            }
          </Button>
        </>
      )}
    </form>
  );
};
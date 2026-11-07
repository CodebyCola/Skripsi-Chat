"use client"
import { useState } from 'react';
import { AUTH_DEFAULTS } from '../constants/auth.constants';
import { AcademicRole, AuthStep, LoginResponseData } from '../types/auth.types';
import { loginWithCredentialsAndFace } from '../api/authApi';

export function useLoginForm(options?: {
  onLoginSuccess?: (res: LoginResponseData) => void;
}) {
  const [step, setStep] = useState<AuthStep>(1);
  const [role, setRole] = useState<AcademicRole>('student');
  const [username, setUsername] = useState(AUTH_DEFAULTS.defaultUsername);
  const [password, setPassword] = useState(AUTH_DEFAULTS.defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<LoginResponseData | null>(null);

  function goToStep(targetStep: AuthStep) {
    setErrorMsg('');
    setStep(targetStep);
  }

  async function submitLogin(descriptor: number[]) {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await loginWithCredentialsAndFace({
        username,
        password,
        faceDescriptor: descriptor,
      });
      setSuccessInfo(res);
      localStorage.setItem('skripsichat_user', JSON.stringify(res.user));
      localStorage.setItem('aegis_user', JSON.stringify(res.user));
      setStep(3);
      options?.onLoginSuccess?.(res);
      return res;
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    step,
    setStep,
    goToStep,
    role,
    setRole,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberDevice,
    setRememberDevice,
    loading,
    errorMsg,
    setErrorMsg,
    successInfo,
    submitLogin,
  };
}

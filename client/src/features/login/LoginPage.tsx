'use client';

import React from 'react';
import { AuthFooter } from './components/AuthFooter';
import { AuthHeader } from './components/AuthHeader';
import { AuthShowcase } from './components/AuthShowcase';
import { StepperNav } from './components/StepperNav';
import { Step1CredentialForm } from './forms/Step1CredentialForm';
import { Step2BiometricVerification } from './forms/Step2BiometricVerification';
import { Step3VerifiedCard } from './forms/Step3VerifiedCard';
import { useDongleStatus } from './hooks/useDongleStatus';
import { useLoginForm } from './hooks/useLoginForm';
import { useWebcamScanner } from './hooks/useWebcamScanner';

export function LoginPage() {
  const {
    step,
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
  } = useLoginForm();

  const { authStatus, checking, isDongleActiveAndValid, refreshStatus } =
    useDongleStatus(username);

  const {
    videoRef,
    canvasRef,
    cameraActive,
    verifyingFace,
    faceErrorText,
    capturedPreviewUrl,
    insecureOriginUrl,
    faceVerify,
    verifiedDescriptor,
    isFaceMatched,
    startCamera,
    stopCamera,
    scanFromWebcam,
    uploadPhotoFile,
  } = useWebcamScanner(username);

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Harap lengkapi identitas akun dan kata sandi brankas.');
      return;
    }

    if (authStatus?.serverOnline && !authStatus?.userExists) {
      setErrorMsg(
        `Akun "@${username.trim()}" tidak ditemukan di Server. Gunakan username terdaftar (contoh: editor_aegis) atau registrasi terlebih dahulu.`
      );
      return;
    }

    goToStep(2);
  }

  function handleGoBackToStep1() {
    stopCamera();
    goToStep(1);
  }

  async function handleValidateVault() {
    setErrorMsg('');

    if (!isDongleActiveAndValid) {
      setErrorMsg(
        'AKSES DITOLAK: Hardware USB Dongle belum aktif atau tidak sesuai dengan username ini! Silakan aktifkan di Server Console (:4000).'
      );
      return;
    }

    if (!isFaceMatched || !verifiedDescriptor) {
      setErrorMsg(
        'AKSES DITOLAK: Biometrik wajah belum diverifikasi atau tidak sesuai dengan data di Server!'
      );
      return;
    }

    try {
      await submitLogin(verifiedDescriptor);
      stopCamera();
    } catch {
      // Error message sudah diset di dalam hook useLoginForm
    }
  }

  return (
    <div className="skripsichat-auth bg-canvas font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      <AuthHeader
        serverOnline={authStatus?.serverOnline}
        onGoToStep1={handleGoBackToStep1}
      />

      <main className="w-full pt-16 bg-canvas flex-1 flex flex-col">
        {/* ================= STEP 1 & 2 CONTAINER ================= */}
        {step !== 3 && (
          <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl">
            {/* Breadcrumb Security Pill Bar */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
              <div className="flex items-center gap-space-xs text-text-secondary font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  security
                </span>
                <span>Otentikasi Multi-Faktor Institusi</span>
                <span className="text-text-muted">/</span>
                <span className="text-primary font-semibold">
                  {step === 1
                    ? 'Gerbang Kredensial'
                    : 'Verifikasi Token Fisik & Wajah'}
                </span>
              </div>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-stretch">
              <AuthShowcase
                step={step}
                username={username}
                isDongleActiveAndValid={isDongleActiveAndValid}
                isFaceMatched={isFaceMatched}
                similarityPct={faceVerify?.similarityPercent ?? 0}
              />

              <section className="lg:col-span-7 flex flex-col justify-between bg-surface rounded-3xl p-space-lg md:p-space-xl border border-border-subtle shadow-[0_1px_3px_0_rgba(28,40,35,0.04)] relative">
                <div>
                  <StepperNav
                    currentStep={step}
                    canGoToStep2={Boolean(username.trim() && password)}
                    onStepClick={(s) => {
                      if (s === 1) handleGoBackToStep1();
                    }}
                  />

                  {step === 1 && (
                    <Step1CredentialForm
                      role={role}
                      onRoleChange={setRole}
                      username={username}
                      onUsernameChange={setUsername}
                      password={password}
                      onPasswordChange={setPassword}
                      showPassword={showPassword}
                      onToggleShowPassword={() => setShowPassword((p) => !p)}
                      rememberDevice={rememberDevice}
                      onToggleRememberDevice={setRememberDevice}
                      authStatus={authStatus}
                      errorMsg={errorMsg}
                      onSubmit={handleStep1Submit}
                    />
                  )}

                  {step === 2 && (
                    <Step2BiometricVerification
                      username={username}
                      password={password}
                      authStatus={authStatus}
                      checkingDongle={checking}
                      isDongleActiveAndValid={isDongleActiveAndValid}
                      onRefreshDongle={refreshStatus}
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      cameraActive={cameraActive}
                      verifyingFace={verifyingFace}
                      faceErrorText={faceErrorText}
                      capturedPreviewUrl={capturedPreviewUrl}
                      insecureOriginUrl={insecureOriginUrl}
                      faceVerify={faceVerify}
                      isFaceMatched={isFaceMatched}
                      onStartCamera={startCamera}
                      onScanFace={scanFromWebcam}
                      onUploadPhoto={uploadPhotoFile}
                      loading={loading}
                      errorMsg={errorMsg}
                      onGoBack={handleGoBackToStep1}
                      onValidateVault={handleValidateVault}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SUCCESS CONTAINER ================= */}
        {step === 3 && (
          <section className="max-w-7xl mx-auto py-8 px-6 grid grid-cols-12 gap-8 items-center min-h-[calc(100vh-140px)] w-full">
            <AuthShowcase
              step={3}
              username={username}
              isDongleActiveAndValid={isDongleActiveAndValid}
              isFaceMatched={isFaceMatched}
              similarityPct={
                successInfo?.securityVerification?.biometricSimilarityPercent ??
                faceVerify?.similarityPercent ??
                96.4
              }
            />

            <div className="col-span-12 lg:col-span-7">
              <Step3VerifiedCard
                loginResponse={successInfo}
                authStatus={authStatus}
                faceVerify={faceVerify}
                usernameFallback={username}
              />
            </div>
          </section>
        )}
      </main>

      <AuthFooter />
    </div>
  );
}

export default LoginPage;

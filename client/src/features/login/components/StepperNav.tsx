'use client';

import React from 'react';
import { AuthStep } from '../types/auth.types';

interface StepperNavProps {
  currentStep: AuthStep;
  canGoToStep2?: boolean;
  onStepClick?: (step: AuthStep) => void;
}

export function StepperNav({
  currentStep,
  canGoToStep2,
  onStepClick,
}: StepperNavProps) {
  return (
    <div className="w-full pb-6 mb-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting Progress Track */}
        <div className="absolute left-6 right-6 top-5 h-1 bg-surface-container rounded-full z-0">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-500"
            style={{
              width:
                currentStep === 1 ? '15%' : currentStep === 2 ? '50%' : '100%',
            }}
          />
        </div>

        {/* Step 1 */}
        <button
          type="button"
          onClick={() => onStepClick?.(1)}
          className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
        >
          <div
            className={`w-10 h-10 rounded-full font-headline-sm text-headline-sm flex items-center justify-center transition-all ${
              currentStep === 1
                ? 'bg-primary-container text-on-primary ring-4 ring-primary-fixed shadow-md'
                : 'bg-tertiary-container text-on-tertiary shadow-sm'
            }`}
          >
            {currentStep > 1 ? (
              <span className="material-symbols-outlined text-[20px]">
                check
              </span>
            ) : (
              '1'
            )}
          </div>
          <span
            className={`font-label-md text-label-md mt-2 ${
              currentStep === 1
                ? 'text-on-surface font-semibold'
                : 'text-text-secondary font-medium'
            }`}
          >
            Kredensial Akun
          </span>
          <span className="font-label-sm text-label-sm text-text-muted">
            Username &amp; Sandi
          </span>
        </button>

        {/* Step 2 */}
        <button
          type="button"
          disabled={!canGoToStep2 && currentStep === 1}
          onClick={() => {
            if (canGoToStep2 || currentStep >= 2) onStepClick?.(2);
          }}
          className={`relative z-10 flex flex-col items-center group focus:outline-none ${
            canGoToStep2 || currentStep >= 2
              ? 'cursor-pointer'
              : 'cursor-not-allowed opacity-75'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full font-headline-sm text-headline-sm flex items-center justify-center transition-all ${
              currentStep === 2
                ? 'bg-primary-container text-on-primary ring-4 ring-surface-container-low font-bold shadow-sm'
                : currentStep > 2
                ? 'bg-tertiary-container text-on-tertiary shadow-sm'
                : 'bg-surface-container text-text-secondary group-hover:bg-surface-container-high'
            }`}
          >
            {currentStep > 2 ? (
              <span className="material-symbols-outlined text-[20px]">
                check
              </span>
            ) : (
              '2'
            )}
          </div>
          <span
            className={`font-label-md text-label-md mt-2 ${
              currentStep === 2
                ? 'text-on-surface font-bold'
                : 'text-text-muted font-medium'
            }`}
          >
            Dongle &amp; Biometrik
          </span>
          <span className="font-label-sm text-label-sm text-text-muted">
            USB Key &amp; Wajah
          </span>
        </button>

        {/* Step 3 */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full font-headline-sm text-headline-sm flex items-center justify-center ${
              currentStep === 3
                ? 'bg-tertiary-container text-on-tertiary shadow-md ring-4 ring-surface-container-low'
                : 'bg-surface-container-low text-text-secondary'
            }`}
          >
            {currentStep === 3 ? (
              <span className="material-symbols-outlined text-[20px]">
                check
              </span>
            ) : (
              '3'
            )}
          </div>
          <span
            className={`font-label-md text-label-md mt-2 ${
              currentStep === 3
                ? 'text-primary font-bold'
                : 'text-text-muted font-medium'
            }`}
          >
            Terverifikasi
          </span>
          <span className="font-label-sm text-label-sm text-text-muted">
            Akses Dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

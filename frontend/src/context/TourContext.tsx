'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getProductTour, type ProductTourStep } from '@/config/productTours';
import type { OrgAccess } from '@/context/AuthContext';
import type { UserGuideId } from '@/config/userGuides';

interface TourContextValue {
  isActive: boolean;
  steps: ProductTourStep[];
  stepIndex: number;
  currentStep: ProductTourStep | null;
  startTour: (guideId: UserGuideId, access?: OrgAccess | null) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  targetRect: DOMRect | null;
  waitingForTarget: boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

function pathsMatch(current: string, target?: string): boolean {
  if (!target) return true;
  const [targetPath, targetQuery = ''] = target.split('?');
  const [currentPath, currentQuery = ''] = current.split('?');

  if (targetPath !== currentPath) return false;
  if (!targetQuery) return true;

  const targetParams = new URLSearchParams(targetQuery);
  const currentParams = new URLSearchParams(currentQuery);
  for (const [key, value] of targetParams.entries()) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<ProductTourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [waitingForTarget, setWaitingForTarget] = useState(false);
  const tourNavigatingRef = useRef(false);

  const currentStep = steps[stepIndex] ?? null;

  const stopTour = useCallback(() => {
    setIsActive(false);
    setSteps([]);
    setStepIndex(0);
    setTargetRect(null);
    setWaitingForTarget(false);
    document.querySelectorAll('[data-tour-active]').forEach((el) => {
      el.removeAttribute('data-tour-active');
    });
  }, []);

  const startTour = useCallback(
    (guideId: UserGuideId, access?: OrgAccess | null) => {
      const tourSteps = getProductTour(guideId, access);
      if (tourSteps.length === 0) return;
      setSteps(tourSteps);
      setStepIndex(0);
      setIsActive(true);
      const first = tourSteps[0];
      if (first.route && !pathsMatch(currentPath, first.route)) {
        tourNavigatingRef.current = true;
        router.push(first.route);
      }
    },
    [currentPath, router],
  );

  const goToStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) return;
      setStepIndex(index);
      setTargetRect(null);
      if (step.route && !pathsMatch(currentPath, step.route)) {
        tourNavigatingRef.current = true;
        router.push(step.route);
      }
    },
    [steps, currentPath, router],
  );

  const nextStep = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      stopTour();
      return;
    }
    goToStep(stepIndex + 1);
  }, [stepIndex, steps.length, goToStep, stopTour]);

  const prevStep = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.route && !pathsMatch(currentPath, currentStep.route)) {
      if (tourNavigatingRef.current) {
        tourNavigatingRef.current = false;
        return;
      }
      stopTour();
      return;
    }

    if (!currentStep.target) {
      setTargetRect(null);
      setWaitingForTarget(false);
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
      return;
    }

    setWaitingForTarget(true);
    let attempts = 0;
    const maxAttempts = 40;

    const tryFind = () => {
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
      if (el) {
        el.setAttribute('data-tour-active', 'true');
        document.querySelectorAll('[data-tour-active]').forEach((node) => {
          if (node !== el) node.removeAttribute('data-tour-active');
        });
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setTargetRect(el.getBoundingClientRect());
        setWaitingForTarget(false);
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(tryFind, 150);
      } else {
        setTargetRect(null);
        setWaitingForTarget(false);
      }
    };

    const timer = window.setTimeout(tryFind, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isActive, currentStep, currentPath, router, stopTour]);

  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      if (!currentStep?.target) return;
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStep]);

  const value = useMemo(
    () => ({
      isActive,
      steps,
      stepIndex,
      currentStep,
      startTour,
      stopTour,
      nextStep,
      prevStep,
      targetRect,
      waitingForTarget,
    }),
    [isActive, steps, stepIndex, currentStep, startTour, stopTour, nextStep, prevStep, targetRect, waitingForTarget],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}

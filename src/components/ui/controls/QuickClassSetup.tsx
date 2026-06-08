// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon, CaretRightIcon, UsersIcon } from '@phosphor-icons/react';
import {
  iconButtonClass,
  inputFieldClass,
  MAX_STUDENTS,
  primaryButtonClass,
  showToast,
} from '@/utils';

type Props = {
  /**
   * Callback when user creates bulk placeholder students
   * @param count Number of students to create (1-36)
   */
  onCreateClass: (count: number) => void;
  /**
   * Whether the create button should be disabled
   */
  disabled?: boolean;
};

/**
 * Quick class setup component for creating multiple placeholder students at once.
 * Only visible when the student list is empty.
 */
export default function QuickClassSetup({ onCreateClass, disabled }: Props) {
  const { t } = useTranslation('students');
  const [count, setCount] = useState<string>('');

  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const wasHoldingRef = useRef(false);

  const parseCountValue = useCallback((value: string) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const getIncrementedValue = useCallback(
    (value: string) => {
      const numericValue = parseCountValue(value);
      if (numericValue === undefined) {
        return '1';
      }

      if (numericValue >= MAX_STUDENTS) {
        return value;
      }

      return String(numericValue + 1);
    },
    [parseCountValue],
  );

  const getDecrementedValue = useCallback(
    (value: string) => {
      const numericValue = parseCountValue(value);
      if (numericValue === undefined) {
        return '';
      }

      if (numericValue <= 1) {
        return '';
      }

      return String(numericValue - 1);
    },
    [parseCountValue],
  );

  const stopHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (action: () => void) => {
      stopHold();
      holdTimeoutRef.current = window.setTimeout(() => {
        wasHoldingRef.current = true;
        action();
        holdIntervalRef.current = window.setInterval(action, 90);
      }, 350);
    },
    [stopHold],
  );

  useEffect(
    () => () => {
      stopHold();
      wasHoldingRef.current = false;
    },
    [stopHold],
  );

  const handleIncrement = useCallback(() => {
    setCount((previous) => getIncrementedValue(previous));
  }, [getIncrementedValue]);

  const handleDecrement = useCallback(() => {
    setCount((previous) => getDecrementedValue(previous));
  }, [getDecrementedValue]);

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      action: () => void,
    ): void => {
      if (event.button !== 0 && event.pointerType !== 'touch') {
        return;
      }

      wasHoldingRef.current = false;
      startHold(action);
    },
    [startHold],
  );

  const handlePointerEnd = useCallback(() => {
    stopHold();
  }, [stopHold]);

  const handleIncrementClick = useCallback(() => {
    if (wasHoldingRef.current) {
      wasHoldingRef.current = false;
      return;
    }

    handleIncrement();
  }, [handleIncrement]);

  const handleDecrementClick = useCallback(() => {
    if (wasHoldingRef.current) {
      wasHoldingRef.current = false;
      return;
    }

    handleDecrement();
  }, [handleDecrement]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue === '') {
      setCount('');
      return;
    }

    if (!/^\d*$/.test(nextValue)) {
      return;
    }

    const parsed = parseInt(nextValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCount('');
      return;
    }

    if (parsed > MAX_STUDENTS) {
      setCount(nextValue);
      return;
    }

    setCount(nextValue);
  };

  const handleCreate = () => {
    const numCount = parseInt(count, 10);
    if (
      !Number.isFinite(numCount) ||
      numCount <= 0 ||
      numCount > MAX_STUDENTS
    ) {
      showToast(
        'error',
        t(
          'quickClass.invalidCount',
          'Bitte gib eine Zahl zwischen 1 und {{max}} ein.',
          { max: MAX_STUDENTS },
        ),
      );
      return;
    }

    onCreateClass(numCount);
    setCount(''); // Reset input after creation
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleCreate();
      return;
    }

    if (event.key === 'ArrowUpIcon') {
      event.preventDefault();
      handleIncrement();
      return;
    }

    if (event.key === 'ArrowDownIcon') {
      event.preventDefault();
      handleDecrement();
    }
  };

  const isCreateDisabled = Boolean(disabled);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      <div className="flex w-full items-center justify-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={handleDecrementClick}
          onPointerDown={(event) => handlePointerDown(event, handleDecrement)}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          aria-label={t('quickClass.decreaseCount', 'Anzahl verringern')}
          className={`${iconButtonClass} h-10 w-10`}
        >
          <CaretLeftIcon size={16} />
        </button>
        <input
          id="quick-class-count"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={t(
            'quickClass.placeholderCount',
            'Anzahl Platzhalter-Schüler',
          )}
          value={count}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`1-${MAX_STUDENTS}`}
          className={`${inputFieldClass} w-full text-center sm:w-20`}
        />
        <button
          type="button"
          onClick={handleIncrementClick}
          onPointerDown={(event) => handlePointerDown(event, handleIncrement)}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          aria-label={t('quickClass.increaseCount', 'Anzahl erhöhen')}
          className={`${iconButtonClass} h-10 w-10`}
        >
          <CaretRightIcon size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={isCreateDisabled}
        title={t(
          'quickClass.createTitle',
          'Klasse mit leeren Platzhaltern anlegen',
        )}
        className={`${primaryButtonClass} w-full justify-center gap-2 text-center sm:w-auto`}
      >
        <UsersIcon size={16} />
        {t('quickClass.createButton', 'Klasse anlegen')}
      </button>
    </div>
  );
}

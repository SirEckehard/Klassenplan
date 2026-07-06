// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CropIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import { logError } from '@/utils';
import { showToast } from '@/utils/ui/toast';
import {
  clampPhotoTransform,
  defaultPhotoTransform,
  drawPhoto,
  renderStudentPhotoBlob,
  MAX_PHOTO_ZOOM,
  StudentPhotoError,
  STUDENT_PHOTO_ERRORS,
  type PhotoTransform,
} from '@/utils/image/processStudentPhoto';

const VIEWPORT = 260;

type Props = {
  open: boolean;
  /** Decoded source image; the parent owns its lifecycle (`bitmap.close()`). */
  bitmap: ImageBitmap | null;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
};

/**
 * Crop / reframe editor shown after a photo is picked, before it is stored.
 *
 * Lets the user pan (drag), zoom (slider / wheel / pinch) and rotate (90°
 * steps) the source image inside a circular crop. The live preview and the
 * final 160px JPEG share the same draw math ({@link drawPhoto}), so the result
 * matches what is shown.
 */
function StudentPhotoCropModal({ open, bitmap, onApply, onCancel }: Props) {
  const { t } = useTranslation('students');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<PhotoTransform>(
    defaultPhotoTransform,
  );
  const [busy, setBusy] = useState(false);

  // Pointer bookkeeping for drag (1 pointer) and pinch-zoom (2 pointers).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  // Latest transform for the native wheel listener, so it does not have to
  // re-subscribe on every pan/zoom frame.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const update = useCallback(
    (next: PhotoTransform) => {
      if (!bitmap) return;
      setTransform(clampPhotoTransform(bitmap, next));
    },
    [bitmap],
  );

  // Paint the preview (image + circular mask) on every transform change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIEWPORT * dpr;
    canvas.height = VIEWPORT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    drawPhoto(ctx, bitmap, VIEWPORT, transform);

    // Dim everything outside the circular crop and draw the guide outline.
    const radius = VIEWPORT / 2 - 1;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, VIEWPORT, VIEWPORT);
    ctx.arc(VIEWPORT / 2, VIEWPORT / 2, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.arc(VIEWPORT / 2, VIEWPORT / 2, radius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();
    ctx.restore();
  }, [bitmap, transform]);

  // Wheel zoom needs a non-passive listener to call preventDefault. Reads the
  // transform through a ref so the listener is registered only once per image.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const current = transformRef.current;
      update({ ...current, scale: current.scale * factor });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [bitmap, update]);

  const displayWidth = () =>
    canvasRef.current?.getBoundingClientRect().width || VIEWPORT;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: transform.scale,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const current = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, current);

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.distance > 0) {
        const ratio = distance / pinchStart.current.distance;
        update({ ...transform, scale: pinchStart.current.scale * ratio });
      }
      return;
    }

    const size = displayWidth();
    update({
      ...transform,
      offsetX: transform.offsetX + (current.x - prev.x) / size,
      offsetY: transform.offsetY + (current.y - prev.y) / size,
    });
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
  };

  const rotateBy = (delta: number) =>
    update({ ...transform, rotation: transform.rotation + delta });

  const handleApply = async () => {
    if (!bitmap) return;
    setBusy(true);
    try {
      const blob = await renderStudentPhotoBlob(bitmap, transform);
      onApply(blob);
    } catch (error) {
      const message =
        error instanceof StudentPhotoError
          ? error.message
          : STUDENT_PHOTO_ERRORS.decodeFailed;
      showToast('error', message);
      logError('Student photo crop failed', { error }, 'StudentPhotoCropModal');
    } finally {
      // onApply may close (unmount) the modal while the render was in flight.
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  };

  const iconButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:border-blue-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={t('photo.cropTitle', 'Foto zuschneiden')}
      subtitle={t(
        'photo.cropSubtitle',
        'Ziehen zum Verschieben, Zoomen und Drehen – dann übernehmen.',
      )}
      icon={<CropIcon size={24} aria-hidden="true" />}
      size="sm"
      showCloseButton={!busy}
    >
      <div className="flex flex-col items-center gap-5">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          aria-label={t('photo.cropTitle', 'Foto zuschneiden')}
          className="aspect-square w-full max-w-65 cursor-grab touch-none rounded-2xl border border-gray-200 active:cursor-grabbing dark:border-gray-700"
        />

        <div className="flex w-full max-w-65 items-center gap-3">
          <MagnifyingGlassIcon
            size={18}
            className="shrink-0 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
          <input
            type="range"
            min={1}
            max={MAX_PHOTO_ZOOM}
            step={0.01}
            value={transform.scale}
            onChange={(e) =>
              update({ ...transform, scale: Number(e.target.value) })
            }
            aria-label={t('photo.zoom', 'Zoom')}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 dark:bg-gray-700"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => rotateBy(-90)}
            className={iconButtonClass}
            title={t('photo.rotateLeft', 'Nach links drehen')}
            aria-label={t('photo.rotateLeft', 'Nach links drehen')}
          >
            <ArrowCounterClockwiseIcon size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => rotateBy(90)}
            className={iconButtonClass}
            title={t('photo.rotateRight', 'Nach rechts drehen')}
            aria-label={t('photo.rotateRight', 'Nach rechts drehen')}
          >
            <ArrowClockwiseIcon size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex w-full items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {t('photo.cancel', 'Abbrechen')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy && (
              <SpinnerGapIcon
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            {t('photo.apply', 'Übernehmen')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default StudentPhotoCropModal;

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDialogA11y } from '../useDialogA11y';

function Sheet({ open }: { open: boolean }) {
  const ref = useDialogA11y<HTMLDivElement>({ open });
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Sheet"
      tabIndex={-1}
    >
      <button type="button">first</button>
      <button type="button">last</button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        close
      </button>
      <Sheet open={open} />
    </>
  );
}

describe('useDialogA11y', () => {
  afterEach(cleanup);

  it('moves focus into the dialog and locks background scrolling', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'open' }));

    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the trigger and releases the scroll lock on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'open' });
    await user.click(openButton);
    await user.click(screen.getByRole('button', { name: 'close' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    // The close button had focus when the dialog unmounted, so focus returns
    // to whatever was focused when it opened.
    expect(document.activeElement).toBe(openButton);
  });
});

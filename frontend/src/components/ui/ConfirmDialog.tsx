'use client';

import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Retour',
  tone = 'default',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => void onConfirm()}
            data-modal-initial-focus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-foreground leading-relaxed">{description}</p>
    </Modal>
  );
}

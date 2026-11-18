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
          {/* Action destructive : le focus part sur Annuler, pour qu'Entrée ne supprime pas par réflexe. */}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            data-modal-initial-focus={tone === 'danger' ? true : undefined}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => void onConfirm()}
            data-modal-initial-focus={tone === 'danger' ? undefined : true}
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

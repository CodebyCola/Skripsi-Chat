'use client';

import React from 'react';
import { BlockRecord, BlockValidationDetail } from '../types/blockchain.types';

interface BlockCardProps {
  block: BlockRecord;
  detail?: BlockValidationDetail;
}

export function BlockCard({ block, detail }: BlockCardProps) {
  const isValid = detail ? detail.isValid : true;

  return (
    <div
      className={`p-4 rounded-xl bg-surface border shadow-xs flex flex-col gap-2.5 mb-3 transition ${
        isValid
          ? 'border-sage-border border-l-4 border-l-emerald-600'
          : 'border-red-300 border-l-4 border-l-red-600 bg-red-50/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-primary">
            Blok #{block.index}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-canvas border border-sage-border text-text-dark">
            {block.actionType}
          </span>
          {block.actor && (
            <span className="text-[11px] font-mono text-text-secondary">
              &bull; Pelaku: @{block.actor}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isValid ? (
            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              <span>Valid (PoW Terpenuhi)</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono font-semibold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">warning</span>
              <span>Manipulasi Terdeteksi</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-xs font-semibold text-text-dark">
        {block.assetTitle}
      </p>

      {detail?.errorReason && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-mono">
          {detail.errorReason}
        </div>
      )}

      {/* BLOCKCHAIN METADATA */}
      <div className="p-3 rounded-lg bg-canvas border border-sage-border font-mono text-[10px] text-text-secondary flex flex-col gap-1 break-all">
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-text-muted">Previous Hash:</span>
          <span className="text-text-dark">{block.previousHash}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-text-muted">Asset Data Hash:</span>
          <span className="text-text-dark">{block.assetDataHash}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-text-muted">Block Hash (SHA-256):</span>
          <span className="text-primary font-bold">{block.hash}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-sage-border text-text-muted">
          <span>Nonce Mining: {block.nonce}</span>
          <span>Waktu: {new Date(block.timestamp).toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
}

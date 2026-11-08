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
      className={`bg-surface border border-sage-border border-l-4 ${
        isValid ? 'border-l-security-valid' : 'border-l-security-danger'
      } rounded-xl p-4 shadow-xs`}
    >
      <p className="text-xs font-semibold text-text-dark">
        Blok #{block.index} — [{block.actionType}] {block.assetTitle}
      </p>
      {detail?.errorReason && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-security-danger">
          <span className="material-symbols-outlined text-sm">gpp_bad</span>
          <span>{detail.errorReason}</span>
        </div>
      )}
      <pre className="mt-2 bg-canvas border border-sage-border rounded-lg p-2.5 font-mono text-[11px] text-text-dark overflow-x-auto">
        {`previousHash : ${block.previousHash}\nassetHash    : ${block.assetDataHash}\nblockHash    : ${block.hash} (nonce: ${block.nonce})`}
      </pre>
    </div>
  );
}

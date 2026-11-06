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
      style={{
        background: '#111827',
        padding: 16,
        borderRadius: 10,
        border: '1px solid #334155',
        borderLeft: `5px solid ${isValid ? '#10b981' : '#ef4444'}`,
        marginBottom: 12,
      }}
    >
      <strong>
        Blok #{block.index} — [{block.actionType}] {block.assetTitle}
      </strong>
      {detail?.errorReason && (
        <div style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 4 }}>
          🚨 {detail.errorReason}
        </div>
      )}
      <pre
        style={{
          background: '#070a12',
          padding: 10,
          borderRadius: 8,
          overflowX: 'auto',
          color: '#38bdf8',
          fontSize: 12,
          marginTop: 8,
        }}
      >
        {`previousHash : ${block.previousHash}\nassetHash    : ${block.assetDataHash}\nblockHash    : ${block.hash} (nonce: ${block.nonce})`}
      </pre>
    </div>
  );
}

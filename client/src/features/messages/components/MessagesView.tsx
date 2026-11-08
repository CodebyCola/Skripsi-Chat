'use client';

import React from 'react';
import { PageShell } from '@/features/dashboard';
import { useMessages } from '../hooks/useMessages';
import { MessageEncryptForm } from './MessageEncryptForm';
import { MessageItemCard } from './MessageItemCard';

export function MessagesView() {
  const {
    title,
    setTitle,
    sender,
    setSender,
    plaintext,
    setPlaintext,
    passphrase,
    setPassphrase,
    mode,
    setMode,
    lastStages,
    messages,
    decryptedMap,
    errorMsg,
    loading,
    handleEncrypt,
    handleDecrypt,
    handleDelete,
  } = useMessages();

  return (
    <PageShell
      title="Super Enkripsi Pesan Teks"
      subtitle="Vigenère + Vernam + AES-256"
    >
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-security-danger text-xs">
          {errorMsg}
        </div>
      )}

      <MessageEncryptForm
        title={title}
        onTitleChange={setTitle}
        sender={sender}
        onSenderChange={setSender}
        plaintext={plaintext}
        onPlaintextChange={setPlaintext}
        passphrase={passphrase}
        onPassphraseChange={setPassphrase}
        mode={mode}
        onModeChange={setMode}
        loading={loading}
        lastStages={lastStages}
        onSubmit={handleEncrypt}
      />

      <h2 className="text-xs font-semibold text-text-dark">
        Daftar Pesan Terenkripsi di Server ({messages.length})
      </h2>

      {messages.map((m) => (
        <MessageItemCard
          key={m.id}
          message={m}
          decryptedText={decryptedMap[m.id]}
          onDecrypt={handleDecrypt}
          onDelete={handleDelete}
        />
      ))}
    </PageShell>
  );
}

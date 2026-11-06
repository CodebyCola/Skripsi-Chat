'use client';

import React from 'react';
import { DashboardNav } from '@/features/dashboard';
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
  } = useMessages();

  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <h1 style={{ marginBottom: 14 }}>
          ✉️ Super Enkripsi Pesan Teks (Vigenère + Vernam + AES-256)
        </h1>

        {errorMsg && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              marginBottom: 16,
            }}
          >
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

        <h2 style={{ marginBottom: 12 }}>
          Daftar Pesan Terenkripsi di Server ({messages.length})
        </h2>

        {messages.map((m) => (
          <MessageItemCard
            key={m.id}
            message={m}
            decryptedText={decryptedMap[m.id]}
            onDecrypt={handleDecrypt}
          />
        ))}
      </main>
    </>
  );
}

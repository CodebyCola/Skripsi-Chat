'use client';

import { useEffect, useState } from 'react';
import {
  decryptMessage,
  deleteMessage,
  encryptAndSaveMessage,
  fetchMessages,
} from '../api/messagesApi';
import {
  EncryptedMessageRecord,
  EncryptionStages,
} from '../types/messages.types';

export function useMessages() {
  const [title, setTitle] = useState('Konsultasi Revisi Bab Skripsi');
  const [sender, setSender] = useState('dosen_pembimbing');
  const [plaintext, setPlaintext] = useState('');
  const [passphrase, setPassphrase] = useState('KunciDemo2026');
  const [mode, setMode] = useState<'CBC' | 'ECB'>('CBC');

  const [lastStages, setLastStages] = useState<EncryptionStages | null>(null);
  const [messages, setMessages] = useState<EncryptedMessageRecord[]>([]);
  const [decryptedMap, setDecryptedMap] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem('skripsichat_user') ||
        localStorage.getItem('aegis_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.username) setSender(u.username);
      }
    } catch {
      // Abaikan jika gagal baca
    }
  }, []);

  async function loadMessages() {
    try {
      const data = await fetchMessages();
      setMessages(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat pesan');
    }
  }

  async function handleEncrypt(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await encryptAndSaveMessage({
        title,
        sender,
        plaintext,
        passphrase,
        mode,
      });
      setLastStages(res.encryptionStages);
      setPlaintext('');
      await loadMessages();
    } catch (err: any) {
      setErrorMsg(err.message || 'Enkripsi gagal');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt(id: number) {
    setErrorMsg('');
    try {
      const res = await decryptMessage(id, passphrase);
      setDecryptedMap((prev) => ({ ...prev, [id]: res.plaintext }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Dekripsi gagal: passphrase salah');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(`Hapus pesan #${id} dari database dan catat ke Blockchain Ledger?`)) {
      return;
    }
    setErrorMsg('');
    try {
      await deleteMessage(id, sender);
      setDecryptedMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadMessages();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus pesan');
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  return {
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
    loadMessages,
  };
}

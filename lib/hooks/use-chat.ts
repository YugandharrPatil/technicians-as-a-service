import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ChatMessage } from '@/lib/types/firestore';

export function useChat(bookingId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !db) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('bookingId', '==', bookingId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesData: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          } as ChatMessage);
        });
        setMessages(messagesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to chat messages:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  const sendMessage = async (
    senderId: string,
    senderType: 'client' | 'technician',
    message: string,
    offer?: { price: number; dateTime: Date }
  ) => {
    if (!bookingId || !db) {
      throw new Error('Database not initialized');
    }

    const messageData: Omit<ChatMessage, 'createdAt'> & { createdAt: Timestamp } = {
      bookingId,
      senderId,
      senderType,
      message,
      createdAt: Timestamp.now(),
    };

    if (offer) {
      messageData.offer = {
        price: offer.price,
        dateTime: Timestamp.fromDate(offer.dateTime),
      };
    }

    await addDoc(collection(db, 'chatMessages'), messageData);
  };

  return { messages, loading, sendMessage };
}

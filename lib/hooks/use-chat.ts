import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/lib/types/database';

export function useChat(bookingId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // Load initial messages
    async function loadMessages() {
      const { data, error } = await supabase
        .from('taas_chats')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    }

    loadMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chat:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taas_chats',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const sendMessage = async (
    senderId: string,
    senderType: 'client' | 'technician',
    message: string,
    offer?: { price: number; dateTime: Date }
  ) => {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    const supabase = getSupabaseBrowserClient();

    const messageData: Record<string, unknown> = {
      booking_id: bookingId,
      sender_id: senderId,
      sender_type: senderType,
      message,
    };

    if (offer) {
      messageData.offer_price = offer.price;
      messageData.offer_date_time = offer.dateTime.toISOString();
    }

    const { error } = await supabase.from('taas_chats').insert(messageData);
    if (error) throw error;
  };

  return { messages, loading, sendMessage };
}

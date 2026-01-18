'use client';

import { use } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useChat } from '@/lib/hooks/use-chat';
import { useBooking } from '@/lib/hooks/use-booking';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, DollarSign, Calendar as CalendarIcon, X } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ChatPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  return <ChatContent bookingId={bookingId} />;
}

function ChatContent({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading: bookingLoading } = useBooking(bookingId);
  const booking = data?.booking;
  const technician = data?.technician;
  const { messages, loading: messagesLoading, sendMessage } = useChat(bookingId);
  const [messageText, setMessageText] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDate, setOfferDate] = useState<Date | undefined>();
  const [offerTime, setOfferTime] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!user) {
    router.push('/login');
    return null;
  }

  if (bookingLoading || messagesLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!booking) {
    return <div className="container mx-auto p-4">Booking not found</div>;
  }

  // Determine if user is client or technician
  const isClient = booking.clientId === user.uid;
  const isTechnician = technician && technician.userId === user.uid;

  if (!isClient && !isTechnician) {
    return <div className="container mx-auto p-4">Unauthorized access</div>;
  }

  // Only allow chat if booking is accepted or confirmed
  if (booking.status !== 'accepted' && booking.status !== 'confirmed') {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Chat is only available for accepted or confirmed bookings.
            </p>
            <Link href={isClient ? `/booking/status/${bookingId}` : `/technician/bookings/${bookingId}`}>
              <Button className="mt-4">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || sending) return;

    setSending(true);
    try {
      await sendMessage(
        user.uid,
        isClient ? 'client' : 'technician',
        messageText.trim()
      );
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!offerPrice || !offerDate || !offerTime || !user || !db || sending) return;

    setSending(true);
    try {
      const dateStr = format(offerDate, 'yyyy-MM-dd');
      const offerDateTime = new Date(`${dateStr}T${offerTime}`);

      // Send message with offer
      await sendMessage(
        user.uid,
        'client',
        `I'm offering $${parseFloat(offerPrice).toFixed(2)} for ${offerDateTime.toLocaleString()}`,
        {
          price: parseFloat(offerPrice),
          dateTime: offerDateTime,
        }
      );

      // Update booking with negotiated values
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        negotiatedPrice: parseFloat(offerPrice),
        negotiatedDateTime: offerDateTime,
        updatedAt: new Date(),
      });

      setShowOfferForm(false);
      setOfferPrice('');
      setOfferDate(undefined);
      setOfferTime('');
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    } catch (error) {
      console.error('Error making offer:', error);
      alert('Failed to make offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!db || sending) return;

    setSending(true);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'confirmed',
        updatedAt: new Date(),
      });

      // Send confirmation message
      await sendMessage(
        user.uid,
        'technician',
        'I accept your offer! The booking is now confirmed.'
      );

      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('Failed to accept offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReject = async () => {
    if (!db || sending) return;

    if (!confirm('Are you sure you want to reject this booking? This will close the chat.')) {
      return;
    }

    setSending(true);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'rejected',
        updatedAt: new Date(),
      });

      router.push(isClient ? `/account/bookings` : `/technician/dashboard`);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const lastOffer = messages
    .filter((m) => m.offer && m.senderType === 'client')
    .pop();

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link href={isClient ? `/booking/status/${bookingId}` : `/technician/bookings/${bookingId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>

      <Card className="flex h-[calc(100vh-200px)] flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span>Chat - {booking.serviceType}</span>
            {isClient && booking.status === 'accepted' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOfferForm(!showOfferForm)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Make Offer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
            {isTechnician && lastOffer && booking.status === 'accepted' && (
              <Button
                size="sm"
                onClick={handleAcceptOffer}
                disabled={sending}
              >
                Accept Offer
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        {showOfferForm && isClient && (
          <div className="border-b bg-muted/50 p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !offerDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {offerDate ? format(offerDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={offerDate}
                        onSelect={setOfferDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <TimePicker
                    value={offerTime}
                    onChange={setOfferTime}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleMakeOffer} disabled={sending || !offerPrice || !offerDate || !offerTime}>
                  Send Offer
                </Button>
                <Button variant="outline" onClick={() => setShowOfferForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {lastOffer && booking.status === 'accepted' && (
          <div className="border-b bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Pending Offer</p>
                <p className="text-sm">Price: ${lastOffer.offer!.price.toFixed(2)}</p>
                <p className="text-sm">
                  Date & Time: {new Date(lastOffer.offer!.dateTime as Date).toLocaleString()}
                </p>
              </div>
              {isTechnician && (
                <Button onClick={handleAcceptOffer} disabled={sending}>
                  Accept Offer
                </Button>
              )}
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === user.uid;
              return (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3',
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.senderType === 'client' ? 'C' : 'T'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg p-3',
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.offer && (
                      <div className={cn('mb-2 rounded p-2', isOwnMessage ? 'bg-primary-foreground/20' : 'bg-background')}>
                        <p className="text-xs font-semibold">Offer</p>
                        <p className="text-sm">Price: ${message.offer.price.toFixed(2)}</p>
                        <p className="text-sm">
                          Date & Time: {new Date(message.offer.dateTime as Date).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <p className="text-sm">{message.message}</p>
                    <p className={cn('mt-1 text-xs', isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {message.createdAt instanceof Date 
                        ? message.createdAt.toLocaleTimeString()
                        : typeof message.createdAt === 'string'
                        ? new Date(message.createdAt).toLocaleTimeString()
                        : message.createdAt?.toDate?.()?.toLocaleTimeString() || 'N/A'}
                    </p>
                  </div>
                  {isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.senderType === 'client' ? 'C' : 'T'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              rows={2}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!messageText.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

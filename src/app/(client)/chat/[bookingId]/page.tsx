"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/context";
import { useChat } from "@/lib/hooks/use-chat";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, ChatMessage, User as DbUser, Technician } from "@/lib/types/database";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, DollarSign, Send } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function ChatPage({ params }: { params: Promise<{ bookingId: string }> }) {
	const { bookingId } = use(params);
	const { user } = useAuth();
	const { messages, loading: chatLoading, sendMessage } = useChat(bookingId);
	const [booking, setBooking] = useState<Booking | null>(null);
	const [technician, setTechnician] = useState<Technician | null>(null);
	const [otherPartyName, setOtherPartyName] = useState("");
	const [newMessage, setNewMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [userRole, setUserRole] = useState<"client" | "technician">("client");
	const [loading, setLoading] = useState(true);
	const [offerPrice, setOfferPrice] = useState("");
	const [offerDate, setOfferDate] = useState("");
	const [showOfferDialog, setShowOfferDialog] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (user) loadBooking();
	}, [user?.id, bookingId]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	async function loadBooking() {
		if (!user) return;
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: bookingData } = await supabase.from("taas_bookings").select("*").eq("id", bookingId).single();
			if (!bookingData) {
				setLoading(false);
				return;
			}
			const bk = bookingData as Booking;
			setBooking(bk);

			// Determine user role
			if (bk.client_id === user.id) {
				setUserRole("client");
				const { data: tech } = await supabase.from("taas_technicians").select("*").eq("id", bk.technician_id).single();
				if (tech) {
					setTechnician(tech as Technician);
					setOtherPartyName(tech.name);
				}
			} else {
				setUserRole("technician");
				const { data: clientData } = await supabase.from("taas_users").select("*").eq("id", bk.client_id).single();
				if (clientData) {
					setOtherPartyName((clientData as DbUser).display_name || (clientData as DbUser).email);
				}
				const { data: tech } = await supabase.from("taas_technicians").select("*").eq("user_id", user.id).single();
				if (tech) setTechnician(tech as Technician);
			}
		} catch (error) {
			console.error("Error loading booking:", error);
		} finally {
			setLoading(false);
		}
	}

	async function handleSendMessage(e: React.FormEvent) {
		e.preventDefault();
		if (!newMessage.trim() || !user || sending) return;
		setSending(true);
		try {
			await sendMessage(user.id, userRole, newMessage.trim());
			setNewMessage("");
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error("Failed to send message");
		} finally {
			setSending(false);
		}
	}

	async function handleSendOffer(e: React.FormEvent) {
		e.preventDefault();
		if (!user || sending || !offerPrice) return;
		setSending(true);
		try {
			const price = parseFloat(offerPrice);
			if (isNaN(price) || price <= 0) {
				toast.error("Invalid price");
				setSending(false);
				return;
			}
			const offerDateTime = offerDate ? new Date(offerDate) : new Date();
			const offerMessage = `💰 Offer: $${price.toFixed(2)} on ${format(offerDateTime, "PPP p")}`;
			await sendMessage(user.id, userRole, offerMessage, { price, dateTime: offerDateTime });
			setOfferPrice("");
			setOfferDate("");
			setShowOfferDialog(false);
		} catch (error) {
			console.error("Error sending offer:", error);
			toast.error("Failed to send offer");
		} finally {
			setSending(false);
		}
	}

	async function handleAcceptOffer(msg: ChatMessage) {
		if (!user || !booking) return;
		try {
			const supabase = getSupabaseBrowserClient();
			await supabase
				.from("taas_bookings")
				.update({
					negotiated_price: msg.offer_price,
					negotiated_date_time: msg.offer_date_time,
					status: "confirmed",
					updated_at: new Date().toISOString(),
				})
				.eq("id", bookingId);
			await sendMessage(user.id, userRole, `✅ Offer accepted! Price: $${msg.offer_price?.toFixed(2)}`);
			queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
			setBooking((prev) => (prev ? { ...prev, negotiated_price: msg.offer_price!, negotiated_date_time: msg.offer_date_time!, status: "confirmed" } : null));
			toast.success("Offer accepted!");
		} catch (error) {
			console.error("Error accepting offer:", error);
			toast.error("Failed to accept offer");
		}
	}

	if (!user) return <div className="container mx-auto p-4">Please sign in to access chat.</div>;
	if (loading || chatLoading) return <div className="container mx-auto p-4">Loading chat...</div>;
	if (!booking) return <div className="container mx-auto p-4">Booking not found</div>;

	const isParticipant = booking.client_id === user.id || userRole === "technician";
	if (!isParticipant) return <div className="container mx-auto p-4">You are not a participant in this booking.</div>;

	return (
		<div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col p-4">
			<Card className="mb-4">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg">Chat with {otherPartyName}</CardTitle>
							<CardDescription>
								{booking.service_type} — {booking.address}
							</CardDescription>
						</div>
						<Badge>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge>
					</div>
				</CardHeader>
			</Card>

			<Card className="flex flex-1 flex-col overflow-hidden">
				<ScrollArea className="flex-1 p-4">
					<div className="space-y-4">
						{messages.map((msg) => {
							const isMe = msg.sender_id === user.id;
							const hasOffer = msg.offer_price != null && msg.offer_price > 0;
							const canAcceptOffer = hasOffer && msg.sender_id !== user.id && booking.status !== "confirmed";

							return (
								<div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
									<div className={`max-w-[75%] rounded-lg p-3 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
										<p className="text-xs mb-1 opacity-70">{msg.sender_type === "client" ? "Client" : "Technician"}</p>
										<p className="text-sm whitespace-pre-wrap">{msg.message}</p>
										{hasOffer && (
											<div className="mt-2 rounded bg-yellow-100 p-2 text-yellow-800 text-sm">
												<p className="font-semibold">💰 Offer: ${msg.offer_price?.toFixed(2)}</p>
												{msg.offer_date_time && <p>📅 {new Date(msg.offer_date_time).toLocaleString()}</p>}
												{canAcceptOffer && (
													<Button size="sm" className="mt-2 w-full" onClick={() => handleAcceptOffer(msg)}>
														Accept Offer
													</Button>
												)}
											</div>
										)}
										<p className="text-xs mt-1 opacity-50">{new Date(msg.created_at).toLocaleTimeString()}</p>
									</div>
								</div>
							);
						})}
						<div ref={messagesEndRef} />
					</div>
				</ScrollArea>

				<div className="border-t p-4">
					<form onSubmit={handleSendMessage} className="flex gap-2">
						<Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={sending} className="flex-1" />
						<Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
							<DialogTrigger asChild>
								<Button type="button" variant="outline" size="icon">
									<DollarSign className="h-4 w-4" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Send an Offer</DialogTitle>
									<DialogDescription>Propose a price and date for the service.</DialogDescription>
								</DialogHeader>
								<form onSubmit={handleSendOffer} className="space-y-4">
									<div>
										<label className="text-sm font-medium">Price ($)</label>
										<Input type="number" step="0.01" min="0" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="0.00" required />
									</div>
									<div>
										<label className="text-sm font-medium">Date & Time</label>
										<Input type="datetime-local" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} required />
									</div>
									<DialogFooter>
										<Button type="submit" disabled={sending}>
											{sending ? "Sending..." : "Send Offer"}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
						<Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
							<Send className="h-4 w-4" />
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}

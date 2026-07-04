import { getChatMessagesAction, sendChatMessageAction } from "@/actions/client-db";
import type { ChatMessage } from "@/lib/types/database";
import { useEffect, useState } from "react";

export function useChat(bookingId: string | undefined) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!bookingId) {
			setLoading(false);
			return;
		}

		const currentBookingId = bookingId;
		let active = true;

		async function loadMessages() {
			try {
				const data = await getChatMessagesAction(currentBookingId);
				if (active) {
					setMessages(data);
					setLoading(false);
				}
			} catch (error) {
				console.error("Error loading chat messages:", error);
			}
		}

		loadMessages();

		// Poll every 2 seconds for new messages
		const interval = setInterval(loadMessages, 2000);

		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [bookingId]);

	const sendMessage = async (senderId: string, senderType: "client" | "technician", message: string, offer?: { price: number; dateTime: Date }) => {
		if (!bookingId) {
			throw new Error("Booking ID is required");
		}

		const currentBookingId = bookingId;

		await sendChatMessageAction({
			booking_id: currentBookingId,
			sender_id: senderId,
			sender_type: senderType,
			message,
			offer_price: offer?.price,
			offer_date_time: offer?.dateTime.toISOString(),
		});

		// Instantly reload messages to update UI immediately
		try {
			const data = await getChatMessagesAction(currentBookingId);
			setMessages(data);
		} catch (error) {
			console.error("Error reloading chat messages after sending:", error);
		}
	};

	return { messages, loading, sendMessage };
}

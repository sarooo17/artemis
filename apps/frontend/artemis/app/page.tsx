"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

function HomePage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;
    
    const message = inputValue.trim();
    setSending(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      // Create a temporary session ID for immediate redirect
      const tempId = `temp-${Date.now()}`;
      
      // Redirect immediately
      router.push(`/chat/${tempId}`);
      
      // Send the message in the background
      const response = await fetch('http://localhost:3001/api/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace the URL with the real session ID
        router.replace(`/chat/${data.session.id}`);
      } else {
        console.error('Failed to send message');
        // If failed, go back to home
        router.replace('/');
        
        // Handle specific errors
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          alert(errorData.error || 'Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 503) {
          alert('OpenAI service is temporarily unavailable. Please try again later.');
        } else {
          alert('Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      router.replace('/');
      alert('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-screen h-screen bg-white gap-2 flex">
      {/* MAIN Container - horizontal layout with 8px gap */}
        <Navbar />

        {/* WORKSPACE Container - takes remaining space */}
        <div className="flex h-full w-full overflow-auto flex-col items-center justify-center">
            <div className="w-full max-w-3xl grid grid-cols-1 gap-y-16">
              {/* Main Title */}
              <h1 className="text-5xl font-normal text-neutral-500 text-center tracking-tight w-full">
                What are you working on?
              </h1>

              {/* Input Field */}
              <div className="relative w-full flex items-center justify-center">
                <div className="p-0.5 bg-linear-to-bl from-blue-200 via-neutral-50 to-blue-200 rounded-full shadow-md w-full">
                  <div className="flex items-center gap-3 bg-white rounded-full px-2 py-2 w-full">
                    <button className="w-9 h-9 rounded-full text-gray-600 hover:text-gray-700 text-3xl font-light transition-colors">
                      +
                    </button>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask for sales review"
                      disabled={sending}
                      className="flex-1 outline-none text-base text-neutral-900 placeholder-neutral-400 disabled:opacity-50"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={sending || !inputValue.trim()}
                      className={`w-9 h-9 rounded-full flex items-center cursor-pointer justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        sending ? 'bg-blue-400' : inputValue ? 'bg-blue-500' : 'bg-blue-100'
                      }`}
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <img 
                          src={inputValue ? "/icon-submit.svg" : "/icon-voice.svg"} 
                          alt={inputValue ? "Send" : "Voice"} 
                          className="w-4 h-4 object-contain transition-all" 
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full grid gap-y-3">
                {/* Today Section */}
                <div className="grid gap-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Today you might want to...
                  </p>
                  <div className="grid gap-y-1 w-full">
                    <div className="flex items-center gap-3 px-2 py-2 bg-white rounded-full border-2 border-neutral-100 hover:border-blue-400 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4 w-full flex-1">
                        <div className="gap-1 flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/icon-overdue.svg" alt="Overdue Orders" className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700">2 Orders are overdue for delivery</span>
                        </div>
                        <span className="text-xs text-neutral-500 font-normal">Review now</span>
                      </div>
                      <div className="w-6 h-6 flex items-center justify-center group-hover:bg-blue-100 rounded-full transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M7 17L17 7M17 7H7M17 7v10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 py-2 bg-white rounded-full border-2 border-neutral-100 hover:border-blue-400 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4 w-full flex-1">
                        <div className="gap-1 flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/icon-invoices.svg" alt="Invoices Due" className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700">3 invoices are due today <span className="text-blue-600 underline underline-offset-2">€12.400</span></span>
                        </div>
                        <span className="text-xs text-neutral-500 font-normal">Send reminders?</span>
                      </div>
                      <div className="w-6 h-6 flex items-center justify-center group-hover:bg-blue-100 rounded-full transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M7 17L17 7M17 7H7M17 7v10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 py-2 bg-white rounded-full border-2 border-neutral-100 hover:border-blue-400 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4 w-full flex-1">
                        <div className="gap-1 flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/icon-stocks.svg" alt="Stock Running Out" className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700">Stock of <span className="text-blue-600 font-mono underline underline-offset-2">@item_0472</span> will run out in 3 days</span>
                        </div>
                      </div>
                      <div className="w-6 h-6 flex items-center justify-center group-hover:bg-blue-100 rounded-full transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M7 17L17 7M17 7H7M17 7v10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Section */}
                <div className="grid gap-y-2 grid-cols-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Recent
                  </p>
                  <div className="grid grid-cols-1 gap-y-0 w-full">
                    <div className="flex items-center gap-3 px-3 pr-1 py-1 bg-white rounded-full cursor-pointer group hover:bg-neutral-50">
                      <div className="flex items-center gap-4 w-full flex-1">
                        <div className="gap-1 flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/icon-invoice.svg" alt="Overdue Orders" className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">Invoice Draft – Rossi SRL</span>
                        </div>
                        <span className="text-xs text-neutral-500 font-normal">Edited 17 min ago</span>
                      </div>
                      <div className="flex items-center justify-center py-1 px-3 border-2 border-neutral-100 group-hover:border-blue-100 group-hover:bg-blue-100 rounded-full transition-colors">
                        <span className="text-xs text-gray-400 font-mono group-hover:text-blue-400 transition-colors">Ctrl + Shift + Z</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-3 pr-1 py-1 bg-white rounded-full cursor-pointer group hover:bg-neutral-50">
                      <div className="flex items-center gap-4 w-full flex-1">
                        <div className="gap-1 flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/icon-report.svg" alt="Margin Report" className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">Margin Report – Q2</span>
                        </div>
                        <span className="text-xs text-neutral-500 font-normal">Viewed 3 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
          
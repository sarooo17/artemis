"use client";

import { useState } from "react";

export default function PlaygroundPage() {
  const [inputValue, setInputValue] = useState("");
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  return (
    <div className="w-screen h-screen bg-white gap-2 flex">
      {/* MAIN Container - horizontal layout with 8px gap */}
        {/* Navbar - expandable */}
        <div className={`h-full p-2 bg-white flex flex-col justify-between border-r border-neutral-100 transition-all duration-300 ${isNavExpanded ? 'w-64' : 'w-auto'}`}>
          {/* Top Section */}
          <div className="flex flex-col gap-6 justify-start items-start w-full">
            {/* Logo Header */}
            <div className={`flex items-center ${isNavExpanded ? 'justify-between w-full gap-1' : 'justify-center'}`}>
              <button 
                onClick={isNavExpanded ? undefined : () => setIsNavExpanded(true)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors group cursor-pointer ${isNavExpanded ? '' : 'hover:bg-neutral-100'}`}
              >
                <img 
                  src="/fluentis.svg" 
                  alt="Fluentis Logo" 
                  className={`w-7 h-7 object-contain transition-all ${isNavExpanded ? '' : 'group-hover:hidden'}`}
                />
                {!isNavExpanded && (
                  <img 
                    src="/icon-sidebar.svg" 
                    alt="Open Navbar" 
                    className="w-5 h-5 object-contain transition-all hidden group-hover:block" 
                  />
                )}
              </button>
              
              {isNavExpanded &&(
                <div className="h-full flex-1 flex justify-end gap-1">
                  <div className="flex-1 flex items-center justify-between p-1 bg-neutral-50 h-full rounded-full cursor-pointer">
                    <div className="flex items-center w-6 h-6 justify-center">
                      <img src="/tosto.svg" alt="Company Logo" className="w-4 h-4 object-contain rounded-full" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Tosto Group</span>
                    <div className="flex items-center w-6 h-6 justify-center">
                      <img src="/icon-selection.svg" alt="choose company" className="w-6 h-6 object-contain rounded-full" />
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNavExpanded(false)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <img 
                      src="/icon-close-sidebar.svg" 
                      alt="Close Navbar" 
                      className="w-5 h-5 object-contain" 
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 justify-start items-start w-full">
              {/* Nav Items */}
              <button className={`h-8 px-2 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-8 justify-center'}`}>
                <img src="/icon-newchat.svg" alt="New Chat" className="w-4 h-4 object-contain shrink-0" />
                {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">New Chat</span>}
              </button>
              <button className={`h-8 px-2 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-8 justify-center'}`}>
                <img src="/icon-dashboard.svg" alt="Dashboard" className="w-4 h-4 object-contain shrink-0" />
                {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">Dashboard</span>}
              </button>
              <button className={`h-8 px-2 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-8 justify-center'}`}>
                <img src="/icon-search.svg" alt="Search" className="w-4 h-4 object-contain shrink-0" />
                {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">Search</span>}
              </button>
            </div>
          </div>

          {/*Workspaces Container */}
          {isNavExpanded &&(
            <div className="w-full h-full flex flex-col gap-2 mt-8 mb-2 px-2">
              <p className="text-xs font-extralight tracking-wider text-neutral-400">
                Workspaces
              </p>
              <div className="grid gap-3 w-full h-full bg-neutral-50 rounded-xl p-3 overflow-auto">
                <div>
                  <span>test</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section */}
          <div className="flex flex-col gap-1">
            <button className={`h-8 px-0.5 rounded-full hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-8 justify-center'}`}>
              <img src="/user.svg" alt="user" className="w-7 h-7 object-contain rounded-full shrink-0" />
              {isNavExpanded && (
                <div className="flex flex-col items-start ">
                  <span className="text-sm text-neutral-900 whitespace-nowrap">Riccardo Saro</span>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">CEO</span>
                </div>
              )}
            </button>
          </div>
        </div>

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
                      placeholder="Ask for sales review"
                      className="flex-1 outline-none text-base text-neutral-900 placeholder-neutral-400"
                    />
                    <button className={`w-9 h-9 rounded-full flex items-center cursor-pointer justify-center transition-all ${inputValue ? 'bg-blue-500' : 'bg-blue-100 '}`}>
                      <img 
                        src={inputValue ? "/icon-submit.svg" : "/icon-voice.svg"} 
                        alt={inputValue ? "Send" : "Voice"} 
                        className="w-4 h-4 object-contain transition-all" 
                      />
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

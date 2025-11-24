"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [chatMenuOpen, setChatMenuOpen] = useState<string | null>(null);
  const [chatMenuPosition, setChatMenuPosition] = useState({ x: 0, y: 0 });

  // Hydration fix: recupera lo stato solo dopo il mount
  useEffect(() => {
    const saved = sessionStorage.getItem('navExpanded');
    if (saved === 'true') {
      setIsNavExpanded(true);
    }
    setIsHydrated(true);
  }, []);

  // Salva lo stato della navbar quando cambia
  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem('navExpanded', String(isNavExpanded));
    }
  }, [isNavExpanded, isHydrated]);

  // Carica le chat quando la navbar si espande o quando l'utente è disponibile
  useEffect(() => {
    if (isNavExpanded && user) {
      loadWorkspaces();
    }
  }, [isNavExpanded, user]);

  const loadWorkspaces = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/chat/sessions', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleNewChat = () => {
    router.push('/');
  };

  const handleOpenSearch = async () => {
    setIsSearchOpen(true);
    try {
      const response = await fetch('http://localhost:3001/api/chat/sessions', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentChats(data.sessions.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recent chats:', error);
    }
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleOpenProfile = () => {
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
  };

  const handleOpenChatMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setChatMenuPosition({ x: rect.right + 8, y: rect.top });
    setChatMenuOpen(chatId);
  };

  const handleCloseChatMenu = () => {
    setChatMenuOpen(null);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`http://localhost:3001/api/chat/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        router.push('/dashboard');
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        handleOpenSearch();
      }
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        handleCloseSearch();
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setIsNavExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isSearchOpen]);

  return (
    <>
      <div className={`h-full p-2 bg-white flex flex-col justify-between border-r border-neutral-100 transition-[width] duration-1000 ease-out ${isNavExpanded ? 'w-64' : 'w-auto'}`}>
        {/* Top Section */}
        <div className="flex flex-col gap-6 justify-start items-start w-full">
          {/* Logo Header */}
          <div className={`flex items-center ${isNavExpanded ? 'justify-between w-full gap-1' : 'justify-center'}`}>
            <button 
              onClick={isNavExpanded ? undefined : () => setIsNavExpanded(true)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors group cursor-pointer relative ${isNavExpanded ? '' : 'hover:bg-neutral-100'}`}
            >
              <img 
                src="/fluentis.svg" 
                alt="Fluentis Logo" 
                className={`w-7 h-7 object-contain transition-all ${isNavExpanded ? '' : 'group-hover:hidden'}`}
              />
              {!isNavExpanded && (
                <>
                  <img 
                    src="/icon-sidebar.svg" 
                    alt="Open Navbar" 
                    className="w-5 h-5 object-contain transition-all hidden group-hover:block" 
                  />
                  <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                    <span className="font-medium">Open Sidebar</span>
                  </div>
                </>
              )}
            </button>
            
            {isNavExpanded && (
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
            <button onClick={handleNewChat} className={`h-9 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-9 justify-center'}`}>
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/icon-newchat.svg" alt="New Chat" className="w-4 h-4 object-contain shrink-0" />
              </div>
              {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">New Chat</span>}
              {!isNavExpanded && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                  <span className="font-medium">New Chat</span>
                  <span className="text-neutral-400">Ctrl+Shift+O</span>
                </div>
              )}
            </button>
            <button onClick={() => router.push('/dashboard')} className={`h-9 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-9 justify-center'}`}>
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/icon-dashboard.svg" alt="Dashboard" className="w-4 h-4 object-contain shrink-0" />
              </div>
              {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">Dashboard</span>}
              {!isNavExpanded && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                  <span className="font-medium">Dashboard</span>
                  <span className="text-neutral-400">Ctrl+Shift+D</span>
                </div>
              )}
            </button>
            <button onClick={handleOpenSearch} className={`h-9 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-9 justify-center'}`}>
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/icon-search.svg" alt="Search" className="w-4 h-4 object-contain shrink-0" />
              </div>
              {isNavExpanded && <span className="text-sm text-gray-700 whitespace-nowrap">Search</span>}
              {!isNavExpanded && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                  <span className="font-medium">Search</span>
                  <span className="text-neutral-400">Ctrl+K</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/*Workspaces Container */}
        {isNavExpanded && (
          <div className="w-full h-full flex flex-col gap-2 mt-8 mb-2">
            <p className="text-xs font-extralight tracking-wider text-neutral-400 px-2">
              Workspaces
            </p>
            <div className="flex flex-col gap-0 w-full h-full bg-neutral-50 rounded-xl p-1 overflow-auto">
              {workspaces.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
                  No workspaces yet
                </div>
              ) : (
                workspaces.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push(`/chat/${chat.id}`)}
                    className="group w-full px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-sm text-neutral-700 truncate flex-1 text-left">
                      {chat.title || 'New Chat'}
                    </span>
                    <button
                      onClick={(e) => handleOpenChatMenu(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center hover:bg-neutral-100 rounded transition-opacity"
                    >
                      <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="flex flex-col gap-1">
          <button onClick={handleOpenProfile} className={`h-9 rounded-lg hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-9 justify-center'}`}>
            <div className="w-9 h-9 flex items-center justify-center">
              <img src="/user.svg" alt="user" className="w-7 h-7 object-contain rounded-full shrink-0 group-hover:w-6 group-hover:h-6 transition-all" />
            </div>
            {isNavExpanded && (
              <div className="flex flex-col gap-0 items-start ">
                <span className="text-sm text-neutral-900 whitespace-nowrap">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                <span className="text-[10px] text-neutral-500 whitespace-nowrap">{user?.role || 'Account'}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto" onClick={handleCloseSearch}>
          <div className="w-[600px] h-[500px] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col relative" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={handleCloseSearch}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Search input */}
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search workspaces..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 text-lg outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto p-4">
              {searchQuery.trim() === '' ? (
                <>
                  <p className="text-sm text-neutral-500 mb-3 px-2">Recent chats</p>
                  {recentChats.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-8">No recent chats</p>
                  ) : (
                    <div className="space-y-1">
                      {recentChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => {
                            router.push(`/chat/${chat.id}`);
                            handleCloseSearch();
                          }}
                          className="w-full px-4 py-3 hover:bg-neutral-100 rounded-lg flex items-center gap-3 transition-colors text-left"
                        >
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="text-sm text-neutral-700">{chat.title || 'New Chat'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : isSearching ? (
                <p className="text-sm text-neutral-400 text-center py-8">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">No results found</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        router.push(`/chat/${chat.id}`);
                        handleCloseSearch();
                      }}
                      className="w-full px-4 py-3 hover:bg-neutral-100 rounded-lg flex items-center gap-3 transition-colors text-left"
                    >
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm text-neutral-700">{chat.title || 'New Chat'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 flex items-end justify-start z-50 pointer-events-auto p-2 pb-2 pl-2" onClick={handleCloseProfile}>
          <div className={`w-64 bg-white rounded-2xl shadow-lg border border-neutral-100 flex flex-col overflow-hidden mb-0.5 ${isNavExpanded ? 'ml-64' : 'ml-12'}`} onClick={(e) => e.stopPropagation()}>
            {/* User Profile Section */}
            <div className="p-1.5">
              <button className="w-full px-3 py-2 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
                <img src="/user.svg" alt="user" className="w-9 h-9 object-contain rounded-full" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-neutral-900">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                  <span className="text-xs text-neutral-500">{user?.role || 'User'}</span>
                </div>
              </button>
            </div>

            {/* Separator */}
            <div className="px-3">
              <div className="h-0.5 bg-neutral-100 rounded-full"></div>
            </div>

            {/* Menu Items */}
            <div className="p-1.5">
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors group">
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm text-neutral-700">Upgrade plan</span>
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-neutral-700">Personalization</span>
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-neutral-700">Settings</span>
              </button>
            </div>

            {/* Separator */}
            <div className="px-3">
              <div className="h-0.5 bg-neutral-100 rounded-full"></div>
            </div>

            {/* Bottom Items */}
            <div className="p-1.5">
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-neutral-700">Help</span>
                </div>
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button onClick={logout} className="w-full h-9 px-3 hover:bg-red-50 rounded-[10px] flex items-center gap-2 transition-colors group">
                <svg className="w-4 h-4 text-neutral-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm text-neutral-700 group-hover:text-red-600">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Context Menu Modal */}
      {chatMenuOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto" onClick={handleCloseChatMenu}>
          <div
            className="absolute w-56 bg-white rounded-xl shadow-lg border border-neutral-200 flex flex-col overflow-hidden"
            style={{ left: `${chatMenuPosition.x}px`, top: `${chatMenuPosition.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Items */}
            <div className="p-1.5">
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Start a group space
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
            </div>

            {/* Separator */}
            <div className="px-3">
              <div className="h-0.5 bg-neutral-100 rounded-full"></div>
            </div>

            {/* Danger Zone */}
            <div className="p-1.5">
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </button>
              <button className="w-full h-9 px-3 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors text-sm text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

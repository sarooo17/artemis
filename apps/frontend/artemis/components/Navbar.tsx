"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from '@/lib/api';
import GeneralSettings from "./settings/GeneralSettings";
import AccountSettings from "./settings/AccountSettings";
import PersonalizationSettings from "./settings/PersonalizationSettings";
import NotificationsSettings from "./settings/NotificationsSettings";
import CompanySettings from "./settings/CompanySettings";
import SecuritySettings from "./settings/SecuritySettings";
import CompanySwitcher from "./CompanySwitcher";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'general' | 'account' | 'personalization' | 'notifications' | 'company' | 'security'>('general');
  // COMPANY SWITCHER DISABLED - Backend removed, UI preserved for future use
  // const [isCompanySwitcherOpen, setIsCompanySwitcherOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Company');
  const [departmentName, setDepartmentName] = useState('Department');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToArchive, setChatToArchive] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [currentPathname, setCurrentPathname] = useState('');
  const [enableTransition, setEnableTransition] = useState(false);

  // Hydration fix: recupera lo stato solo dopo il mount
  useEffect(() => {
    const saved = sessionStorage.getItem('navExpanded');
    if (saved === 'true') {
      setIsNavExpanded(true);
    }
    setIsHydrated(true);
    
    // Abilita le transizioni dopo un breve delay per evitare animazioni al mount
    setTimeout(() => {
      setEnableTransition(true);
    }, 100);
    
    // Load saved context from localStorage
    loadSavedContext();
  }, []);

  // Load context from localStorage or API
  const loadSavedContext = async () => {
    try {
      // Try to load from localStorage first for immediate display
      const savedContext = localStorage.getItem('userContext');
      if (savedContext) {
        const context = JSON.parse(savedContext);
        setCompanyName(context.companyName || 'Company');
        setDepartmentName(context.departmentName || 'All departments');
      }

      // Context is now fixed to user's profile - no need to fetch
      // const response = await api.get('/user/available-contexts');
      // if (response.ok) {
      //   const data = await response.json();
      //   if (!savedContext) {
      //     const companyName = data.currentContext.companyName || 'Company';
      //     const departmentName = data.currentContext.departmentName || 'All departments';
      //     
      //     setCompanyName(companyName);
      //     setDepartmentName(departmentName);
      //     
      //     // Save to localStorage
      //     localStorage.setItem('userContext', JSON.stringify({
      //       companyName,
      //       departmentName,
      //       companyId: data.currentContext.companyId,
      //       departmentId: data.currentContext.departmentId,
      //     }));
      //   }
      // }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

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

  // Track current pathname for highlighting active chat
  useEffect(() => {
    setCurrentPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Listen for workspace reload events (e.g., when title is updated)
  useEffect(() => {
    const handleReloadWorkspaces = () => {
      console.log('🔄 Reloading workspaces...');
      loadWorkspaces();
    };
    window.addEventListener('reloadWorkspaces', handleReloadWorkspaces as EventListener);
    return () => window.removeEventListener('reloadWorkspaces', handleReloadWorkspaces as EventListener);
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      const response = await api.get('/chat/sessions');
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
      const response = await api.get('/chat/sessions');
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

  const handleOpenSettings = (section: 'general' | 'account' | 'personalization' | 'notifications' | 'company' | 'security') => {
    setSettingsSection(section);
    setIsSettingsOpen(true);
    setIsProfileOpen(false);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  // COMPANY SWITCHER DISABLED - Backend removed
  // const handleOpenCompanySwitcher = () => {
  //   setIsCompanySwitcherOpen(true);
  // };

  // const handleCloseCompanySwitcher = () => {
  //   setIsCompanySwitcherOpen(false);
  // };

  const handleContextSwitch = async () => {
    // Reload user data and update UI
    try {
      // Context is now fixed to user's profile
      return; // No need to reload contexts
      // const response = await api.get('/user/available-contexts');
      // 
      // if (response.ok) {
      //   const data = await response.json();
      //   const companyName = data.currentContext.companyName || 'Company';
      //   const departmentName = data.currentContext.departmentName || 'All departments';
      //   
      //   setCompanyName(companyName);
      //   setDepartmentName(departmentName);
      //   
      //   // Save to localStorage for persistence
      //   localStorage.setItem('userContext', JSON.stringify({
      //     companyName,
      //     departmentName,
      //     companyId: data.currentContext.companyId,
      //     departmentId: data.currentContext.departmentId,
      //   }));
      // }
    } catch (error) {
      console.error('Failed to refresh context:', error);
    }
  };

  const handleSaveSettings = async (settings: any) => {
    const response = await api.put('/settings/user', settings);

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    return await response.json();
  };

  const handleSaveAccount = async (accountData: any) => {
    const response = await api.put('/settings/account', accountData);

    if (!response.ok) {
      throw new Error('Failed to save account');
    }

    return await response.json();
  };

  const handleSaveCompany = async (companyData: any) => {
    const response = await api.put('/settings/company', companyData);

    if (!response.ok) {
      throw new Error('Failed to save company settings');
    }

    return await response.json();
  };

  const handleOpenChatMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    
    // Menu dimensions (approximate)
    const menuHeight = 300; // Approximate height of the menu
    const menuWidth = 224; // w-56 = 14rem = 224px
    
    // Calculate position
    let x = rect.right + 8;
    let y = rect.top;
    
    // Check if menu would go off bottom of screen
    if (y + menuHeight > window.innerHeight) {
      // Flip to show above the button
      y = rect.bottom - menuHeight;
      // If still off screen, align to bottom with padding
      if (y < 0) {
        y = window.innerHeight - menuHeight - 16;
      }
    }
    
    // Check if menu would go off right of screen
    if (x + menuWidth > window.innerWidth) {
      // Show to the left of the button instead
      x = rect.left - menuWidth - 8;
    }
    
    setChatMenuPosition({ x, y });
    setChatMenuOpen(chatId);
  };

  const handleCloseChatMenu = () => {
    setChatMenuOpen(null);
  };

  const startRenaming = (chatId: string, currentTitle: string) => {
    setRenamingChatId(chatId);
    setRenameValue('');
    handleCloseChatMenu();
  };

  const cancelRenaming = () => {
    setRenamingChatId(null);
    setRenameValue('');
  };

  const handleRenameChat = async (chatId: string) => {
    if (!renameValue.trim()) {
      cancelRenaming();
      return;
    }

    try {
      const response = await api.put(`/chat/sessions/${chatId}/rename`, { title: renameValue.trim() });

      if (response.ok) {
        loadWorkspaces();
        cancelRenaming();
      } else {
        alert('Failed to rename chat');
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
      alert('Failed to rename chat');
    }
  };

  const openArchiveModal = (chatId: string) => {
    setChatToArchive(chatId);
    setIsArchiveModalOpen(true);
    handleCloseChatMenu();
  };

  const closeArchiveModal = () => {
    setIsArchiveModalOpen(false);
    setChatToArchive(null);
  };

  const handleArchiveChat = async () => {
    if (!chatToArchive) return;

    try {
      const response = await api.put(`/chat/sessions/${chatToArchive}/archive`, {});

      if (response.ok) {
        loadWorkspaces();
        if (currentPathname === `/chat/${chatToArchive}`) {
          router.push('/');
        }
      } else {
        alert('Failed to archive chat');
      }
    } catch (error) {
      console.error('Failed to archive chat:', error);
      alert('Failed to archive chat');
    } finally {
      closeArchiveModal();
    }
  };

  const openDeleteModal = (chatId: string) => {
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
    handleCloseChatMenu();
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      const response = await api.delete(`/chat/sessions/${chatToDelete}`);

      if (response.ok) {
        loadWorkspaces();
        if (currentPathname === `/chat/${chatToDelete}`) {
          router.push('/');
        }
      } else {
        alert('Failed to delete chat');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat');
    } finally {
      closeDeleteModal();
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
      
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

  // Group results by type
  const groupedResults = searchResults.reduce((acc: any, result: any) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {});

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return (
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'company':
        return (
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'department':
        return (
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  // Get category label
  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'chat': return 'Workspaces';
      case 'user': return 'Users';
      case 'company': return 'Companies';
      case 'department': return 'Departments';
      default: return 'Other';
    }
  };

  // Handle result click
  const handleResultClick = (result: any) => {
    if (result.type === 'chat' && result.url) {
      router.push(result.url);
      handleCloseSearch();
    } else if (result.type === 'user') {
      // TODO: Open user profile or start a chat
      console.log('User clicked:', result);
    } else if (result.type === 'department') {
      // TODO: Navigate to department view or filter by department
      console.log('Department clicked:', result);
    } else if (result.type === 'company') {
      // TODO: Navigate to company view or switch company
      console.log('Company clicked:', result);
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
      <div className={`h-full p-2 bg-white flex flex-col justify-between border-r border-neutral-100 ${enableTransition ? 'transition-[width] duration-500 ease-out' : ''} ${isNavExpanded ? 'w-64' : 'w-[60px]'}`}>
        {/* Top Section */}
        <div className="flex flex-col gap-6 justify-start items-start w-full">
          {/* Logo Header */}
          <div className={`flex items-center ${isNavExpanded ? 'justify-between w-full gap-1' : 'justify-center'}`}>
            <button 
              onClick={isNavExpanded ? undefined : () => setIsNavExpanded(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors group relative ${isNavExpanded ? '' : 'hover:bg-neutral-100 cursor-pointer'}`}
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
                {/* COMPANY SWITCHER BUTTON DISABLED - Backend removed */}
                {/* <button
                  onClick={handleOpenCompanySwitcher}
                  className="flex-1 flex items-center justify-between p-1 bg-neutral-50 h-full rounded-full cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex items-center w-7 h-7 justify-center shrink-0">
                      <img src="/tosto.svg" alt="Company Logo" className="w-4 h-4 object-contain rounded-full" />
                    </div>
                    <div className="flex flex-col items-start justify-center leading-tight overflow-hidden">
                      <span className="text-xs font-medium text-neutral-900 truncate max-w-full">{companyName}</span>
                      <span className="text-[10px] font-medium text-neutral-500 truncate max-w-full">{departmentName}</span>
                    </div>
                  </div>
                  <div className="flex items-center w-6 h-6 justify-center">
                    <img src="/icon-selection.svg" alt="choose company" className="w-6 h-6 object-contain rounded-full" />
                  </div>
                </button> */}
                <button 
                  onClick={() => setIsNavExpanded(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
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
            <button onClick={handleNewChat} className={`h-10 rounded-xl hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-10 justify-center'}`}>
              <div className="w-10 h-10 flex items-center justify-center">
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
            <button onClick={() => router.push('/dashboard')} className={`h-10 rounded-xl hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-10 justify-center'}`}>
              <div className="w-10 h-10 flex items-center justify-center">
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
            <button onClick={handleOpenSearch} className={`h-10 rounded-xl hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors relative ${isNavExpanded ? 'w-full justify-start' : 'w-10 justify-center'}`}>
              <div className="w-10 h-10 flex items-center justify-center">
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
          <div className="w-full flex flex-col gap-2 mt-8 mb-2 flex-1 min-h-0">
            <p className="text-xs font-extralight tracking-wider text-neutral-400 px-2">
              Workspaces
            </p>
            <div className="flex-1 min-h-0 flex flex-col gap-0 w-full bg-neutral-50 rounded-2xl p-1 overflow-y-auto scrollbar-hide">
              {workspaces.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
                  No workspaces yet
                </div>
              ) : (
                workspaces.map((chat) => {
                  const isActive = currentPathname === `/chat/${chat.id}`;
                  const isRenaming = renamingChatId === chat.id;
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => !isRenaming && router.push(`/chat/${chat.id}`)}
                      className={`group w-full px-3 py-2 rounded-xl transition-colors flex items-center justify-between gap-2 ${
                        isRenaming ? '' : 'cursor-pointer'
                      } ${
                        isActive ? 'bg-neutral-100' : 'hover:bg-neutral-100'
                      }`}
                    >
                      {isRenaming ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameChat(chat.id);
                              } else if (e.key === 'Escape') {
                                cancelRenaming();
                              }
                            }}
                            onBlur={() => {
                              if (!renameValue.trim()) {
                                cancelRenaming();
                              }
                            }}
                            placeholder={chat.title || 'New Chat'}
                            autoFocus
                            className="flex-1 text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg px-2 py-1 focus:outline-none focus:border-neutral-500"
                          />
                          <button
                            onClick={() => handleRenameChat(chat.id)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-200 rounded transition-colors"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-neutral-700 truncate flex-1 text-left">
                            {chat.title || 'New Chat'}
                          </span>
                          <button
                            onClick={(e) => handleOpenChatMenu(e, chat.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center hover:bg-neutral-200 rounded transition-opacity"
                          >
                            <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="flex flex-col gap-1">
          <button onClick={handleOpenProfile} className={`h-10 rounded-xl hover:bg-neutral-100 group cursor-pointer flex items-center transition-colors ${isNavExpanded ? 'w-full gap-3 justify-start' : 'w-10 justify-center'}`}>
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/user.svg" alt="user" className="w-7 h-7 object-contain rounded-full shrink-0 group-hover:w-6 group-hover:h-6 transition-all" />
            </div>
            {isNavExpanded && (
              <div className="flex flex-col gap-0 items-start ">
                <span className="text-sm text-neutral-900 whitespace-nowrap">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                <span className="text-[10px] text-neutral-500 whitespace-nowrap">{typeof user?.role === 'string' ? user.role : 'Account'}</span>
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
                  placeholder="Search anything..."
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
                          className="w-full px-4 py-3 hover:bg-neutral-100 rounded-xl flex items-center gap-3 transition-colors text-left"
                        >
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <div className="flex-1 flex flex-col items-start">
                            <span className="text-sm text-neutral-700">{chat.title || 'New Chat'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-600"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">No results found</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedResults).map(([type, results]: [string, any]) => (
                    <div key={type}>
                      <p className="text-xs font-medium text-neutral-500 mb-2 px-2">{getCategoryLabel(type)}</p>
                      <div className="space-y-1">
                        {results.map((result: any) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full px-4 py-3 hover:bg-neutral-100 rounded-xl flex items-center gap-3 transition-colors text-left"
                          >
                            {getResultIcon(result.type)}
                            <div className="flex-1 flex flex-col items-start">
                              <span className="text-sm text-neutral-700 font-medium">{result.title}</span>
                              {result.subtitle && (
                                <span className="text-xs text-neutral-500">{result.subtitle}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
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
          <div className={`w-60 bg-white rounded-2xl border-2 border-neutral-100 flex flex-col shadow-[0px_0px_53px_-50px_rgba(0,0,0,s0.35)] overflow-hidden mb-12`} onClick={(e) => e.stopPropagation()}>
            {/* User Profile Section */}
            <div className="p-1.5">
              <button onClick={() => handleOpenSettings('account')} className="w-full px-3 py-2 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
                <img src="/user.svg" alt="user" className="w-9 h-9 object-contain rounded-full" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-neutral-900">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                  <span className="text-xs text-neutral-500">{typeof user?.role === 'string' ? user.role : 'User'}</span>
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
              <button onClick={() => handleOpenSettings('personalization')} className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-neutral-700">Personalization</span>
              </button>
              <button onClick={() => handleOpenSettings('general')} className="w-full h-9 px-3 hover:bg-neutral-100 rounded-[10px] flex items-center gap-2 transition-colors">
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
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-xl flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-xl flex items-center gap-2 transition-colors text-sm text-neutral-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Start a group space
              </button>
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-xl flex items-center gap-2 transition-colors text-sm text-neutral-700" onClick={() => {
                const chat = workspaces.find(c => c.id === chatMenuOpen);
                if (chat) startRenaming(chatMenuOpen!, chat.title || 'New Chat');
              }}>
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
              <button className="w-full h-9 px-3 hover:bg-neutral-100 rounded-xl flex items-center gap-2 transition-colors text-sm text-neutral-700" onClick={() => chatMenuOpen && openArchiveModal(chatMenuOpen)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </button>
              <button className="w-full h-9 px-3 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors text-sm text-red-600" onClick={() => chatMenuOpen && openDeleteModal(chatMenuOpen)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Switcher Modal - DISABLED (Backend removed) */}
      {/* <CompanySwitcher
        isOpen={isCompanySwitcherOpen}
        onClose={handleCloseCompanySwitcher}
        onSwitch={handleContextSwitch}
        isNavExpanded={isNavExpanded}
      /> */}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm bg-black/20" onClick={handleCloseSettings}>
          <div className="w-[900px] h-[600px] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Sidebar */}
            <div className="w-64 bg-neutral-50 border-r border-neutral-200 p-4 flex flex-col">
              <h2 className="text-xl font-semibold text-neutral-900 mb-6">Settings</h2>
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setSettingsSection('general')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'general' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">General</span>
                </button>
                <button
                  onClick={() => setSettingsSection('account')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'account' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">Account</span>
                </button>
                <button
                  onClick={() => setSettingsSection('personalization')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'personalization' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span className="text-sm font-medium">Personalization</span>
                </button>
                <button
                  onClick={() => setSettingsSection('notifications')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'notifications' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm font-medium">Notifications</span>
                </button>
                <button
                  onClick={() => setSettingsSection('company')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'company' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm font-medium">Company</span>
                </button>
                <button
                  onClick={() => setSettingsSection('security')}
                  className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 transition-colors text-left ${
                    settingsSection === 'security' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm font-medium">Security</span>
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="h-16 border-b border-neutral-200 flex items-center justify-between px-6">
                <h3 className="text-lg font-semibold text-neutral-900 capitalize">{settingsSection}</h3>
                <button
                  onClick={handleCloseSettings}
                  className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {settingsSection === 'general' && (
                  <GeneralSettings onSave={handleSaveSettings} />
                )}

                {settingsSection === 'account' && (
                  <AccountSettings user={user} onSave={handleSaveAccount} />
                )}

                {settingsSection === 'personalization' && (
                  <PersonalizationSettings onSave={handleSaveSettings} />
                )}

                {settingsSection === 'notifications' && (
                  <NotificationsSettings onSave={handleSaveSettings} />
                )}

                {settingsSection === 'company' && (
                  <CompanySettings onSave={handleSaveCompany} />
                )}

                {settingsSection === 'security' && (
                  <SecuritySettings user={user} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm bg-black/20" onClick={closeArchiveModal}>
          <div className="w-[450px] bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">Archive Workspace</h3>
                <p className="text-sm text-neutral-600">This workspace will be archived and hidden from your list.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeArchiveModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveChat}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm bg-black/20" onClick={closeDeleteModal}>
          <div className="w-[450px] bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">Delete Workspace</h3>
                <p className="text-sm text-neutral-600">This action cannot be undone. All messages will be permanently deleted.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

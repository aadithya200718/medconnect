import { create } from 'zustand';

interface UIState {
    sidebarOpen: boolean;
    theme: 'dark' | 'light';
    notifications: Notification[];

    // Actions
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: 'dark' | 'light') => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    theme: 'dark',
    notifications: [],

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    setTheme: (theme) => set({ theme }),

    addNotification: (notification) => {
        const id = `notification-${Date.now()}`;
        set((state) => ({
            notifications: [...state.notifications, { ...notification, id }],
        }));

        // Auto-remove after duration
        if (notification.duration !== 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            }, notification.duration || 5000);
        }
    },

    removeNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        }));
    },

    clearNotifications: () => set({ notifications: [] }),
}));
